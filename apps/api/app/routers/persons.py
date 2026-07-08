from __future__ import annotations

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions import (
    AppProblemError,
    AuthorizationError,
    BusinessValidationError,
    ConflictError,
    ResourceNotFoundError,
)
from app.models import Account, BusinessPerson, Person
from app.routers.resource_helpers import get_active_business, problem_error
from app.schemas import PersonCreate, PersonResponse, PersonUpdate
from app.security import get_current_account, require_existing_business_access

router = APIRouter()
PROTECTED_CONTACT_ROLES = {"owner", "authorized_rep"}


def _raise_if_protected_contact_role(role: str | None) -> None:
    if role not in PROTECTED_CONTACT_ROLES:
        return
    raise BusinessValidationError(
        "Owner/authorized_rep is assigned at business creation, not via the contacts endpoint.",
        [
            problem_error(
                "PROTECTED_ROLE_ASSIGNMENT",
                "role",
                role,
                "role owner/authorized_rep cannot be set here.",
            )
        ],
    )


def _person_response(person: Person, role: str | None = None) -> PersonResponse:
    return PersonResponse(
        id=person.id,
        full_name=person.full_name,
        phone=person.phone,
        email=person.email,
        zalo_id=person.zalo_id,
        role_title=person.role_title,
        role=role,
        is_active=person.is_active,
        created_at=person.created_at,
        updated_at=person.updated_at,
    )


async def _person_link_for_account(
    session: AsyncSession,
    account: Account,
    person_id: UUID,
) -> tuple[Person, BusinessPerson]:
    rows = (
        await session.execute(
            select(Person, BusinessPerson)
            .join(BusinessPerson, BusinessPerson.person_id == Person.id)
            .where(Person.id == person_id, Person.is_active.is_(True), BusinessPerson.ended_at.is_(None))
        )
    ).all()
    if not rows:
        raise ResourceNotFoundError("Person was not found.")

    for person, link in rows:
        try:
            await require_existing_business_access(session, account, link.business_id)
        except AuthorizationError:
            continue
        return person, link

    raise AuthorizationError("This account cannot access the requested person.")


@router.get("/businesses/{business_id}/persons", response_model=list[PersonResponse])
async def list_persons(
    business_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> list[PersonResponse]:
    await require_existing_business_access(session, account, business_id)
    await get_active_business(session, business_id)
    rows = (
        await session.execute(
            select(Person, BusinessPerson.role)
            .join(BusinessPerson, BusinessPerson.person_id == Person.id)
            .where(
                BusinessPerson.business_id == business_id,
                BusinessPerson.ended_at.is_(None),
                Person.is_active.is_(True),
            )
            .order_by(BusinessPerson.is_primary.desc(), Person.created_at)
        )
    ).all()
    return [_person_response(person, role) for person, role in rows]


@router.post("/businesses/{business_id}/persons", response_model=PersonResponse, status_code=201)
async def create_person(
    business_id: UUID,
    payload: PersonCreate,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> PersonResponse:
    try:
        await require_existing_business_access(session, account, business_id)
        await get_active_business(session, business_id)
        _raise_if_protected_contact_role(payload.role)
        person = Person(
            full_name=payload.full_name,
            phone=payload.phone,
            email=payload.email,
            zalo_id=payload.zalo_id,
            role_title=payload.role_title,
        )
        session.add(person)
        await session.flush()
        link = BusinessPerson(
            business_id=business_id,
            person_id=person.id,
            role=payload.role,
            is_primary=False,
        )
        session.add(link)
        await session.commit()
        await session.refresh(person)
        return _person_response(person, link.role)
    except AppProblemError:
        await session.rollback()
        raise
    except IntegrityError as exc:
        await session.rollback()
        if "persons_email_key" in str(exc):
            raise ConflictError(
                "A contact with this email already exists.",
                [problem_error("DUPLICATE_PERSON_EMAIL", "email", payload.email, "person email must be unique.")],
            ) from exc
        raise


@router.patch("/persons/{person_id}", response_model=PersonResponse)
async def update_person(
    person_id: UUID,
    payload: PersonUpdate,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> PersonResponse:
    try:
        person, link = await _person_link_for_account(session, account, person_id)
        update_data = payload.model_dump(exclude_unset=True)
        role = update_data.pop("role", None)
        _raise_if_protected_contact_role(role)
        for field, value in update_data.items():
            setattr(person, field, value)
        if role is not None:
            link.role = role
            session.add(link)
        session.add(person)
        await session.commit()
        await session.refresh(person)
        return _person_response(person, link.role)
    except AppProblemError:
        await session.rollback()
        raise
    except IntegrityError as exc:
        await session.rollback()
        if "persons_email_key" in str(exc):
            raise ConflictError(
                "A contact with this email already exists.",
                [problem_error("DUPLICATE_PERSON_EMAIL", "email", payload.email, "person email must be unique.")],
            ) from exc
        raise


@router.delete("/persons/{person_id}", response_model=PersonResponse)
async def delete_person(
    person_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> PersonResponse:
    try:
        person, link = await _person_link_for_account(session, account, person_id)
        person.is_active = False
        link.ended_at = date.today()
        session.add_all([person, link])
        await session.commit()
        await session.refresh(person)
        return _person_response(person, link.role)
    except AppProblemError:
        await session.rollback()
        raise
