from __future__ import annotations

import logging
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.exceptions import (
    AppProblemError,
    BusinessValidationError,
    ConflictError,
    DuplicateBusinessError,
    IdempotencyConflictError,
    IdempotencyReplayError,
    ResourceNotFoundError,
)
from app.models import Account, Business, BusinessPerson, Industry, IntentType, Need, Offer, Person
from app.schemas import (
    BusinessCreate,
    BusinessDetailResponse,
    BusinessResponse,
    BusinessUpdate,
    NeedResponse,
    OfferResponse,
    PersonCreate,
    PersonResponse,
)
from app.security import get_current_account, require_existing_business_access
from core.idempotency import IdempotencyManager, get_idempotency_key, hash_payload

logger = logging.getLogger(__name__)
router = APIRouter()
PROTECTED_CONTACT_ROLES = {"owner", "authorized_rep"}


def _problem_error(code: str, field: str, value: Any, message: str) -> dict[str, Any]:
    return {"code": code, "field": field, "value": value, "message": message}


def _raise_if_protected_contact_role(role: str | None, field: str) -> None:
    if role not in PROTECTED_CONTACT_ROLES:
        return
    raise BusinessValidationError(
        "Owner/authorized_rep is assigned by the account owner flow, not via extra contacts.",
        [
            _problem_error(
                "PROTECTED_ROLE_ASSIGNMENT",
                field,
                role,
                "role owner/authorized_rep cannot be set for extra contacts.",
            )
        ],
    )


def _industry_codes(payload: BusinessCreate) -> set[str]:
    codes = {payload.industry_l1}
    if payload.industry_l2:
        codes.add(payload.industry_l2)
    for item in [*payload.offers, *payload.needs]:
        if item.category_l1:
            codes.add(item.category_l1)
        if item.category_l2:
            codes.add(item.category_l2)
    return codes


async def _validate_references(session: AsyncSession, payload: BusinessCreate) -> None:
    industry_codes = _industry_codes(payload)
    industry_rows = (
        await session.execute(
            select(Industry.code, Industry.level).where(Industry.code.in_(industry_codes), Industry.is_active.is_(True))
        )
    ).all()
    industry_levels = {code: level for code, level in industry_rows}

    errors: list[dict[str, Any]] = []
    if industry_levels.get(payload.industry_l1) != 1:
        errors.append(
            _problem_error(
                "UNKNOWN_REFERENCE",
                "industry_l1",
                payload.industry_l1,
                "industry_l1 must reference an active level-1 industry.",
            )
        )
    if payload.industry_l2 and industry_levels.get(payload.industry_l2) != 2:
        errors.append(
            _problem_error(
                "UNKNOWN_REFERENCE",
                "industry_l2",
                payload.industry_l2,
                "industry_l2 must reference an active level-2 industry.",
            )
        )

    for collection_name, items in (("offers", payload.offers), ("needs", payload.needs)):
        for index, item in enumerate(items):
            if item.category_l1 and industry_levels.get(item.category_l1) != 1:
                errors.append(
                    _problem_error(
                        "UNKNOWN_REFERENCE",
                        f"{collection_name}[{index}].category_l1",
                        item.category_l1,
                        "category_l1 must reference an active level-1 industry.",
                    )
                )
            if item.category_l2 and industry_levels.get(item.category_l2) != 2:
                errors.append(
                    _problem_error(
                        "UNKNOWN_REFERENCE",
                        f"{collection_name}[{index}].category_l2",
                        item.category_l2,
                        "category_l2 must reference an active level-2 industry.",
                    )
                )

    intent_codes = {item.intent_type for item in [*payload.offers, *payload.needs]}
    if intent_codes:
        existing_intents = set(
            (
                await session.execute(
                    select(IntentType.code).where(IntentType.code.in_(intent_codes), IntentType.is_active.is_(True))
                )
            ).scalars()
        )
        for code in intent_codes - existing_intents:
            errors.append(
                _problem_error(
                    "UNKNOWN_REFERENCE",
                    "intent_type",
                    code,
                    "intent_type must reference an active intent type.",
                )
            )

    if settings.person_required and not payload.persons:
        errors.append(
            _problem_error(
                "MISSING_PERSON",
                "persons",
                [],
                "At least one contact person is required when PERSON_REQUIRED is enabled.",
            )
        )

    if errors:
        raise BusinessValidationError("Business profile contains unknown or missing required references.", errors)


async def _raise_if_duplicate_tax_id(session: AsyncSession, payload: BusinessCreate) -> None:
    if not payload.tax_id:
        return
    existing_id = await session.scalar(select(Business.id).where(Business.tax_id == payload.tax_id))
    if existing_id is not None:
        raise DuplicateBusinessError(
            "A business with this tax_id already exists.",
            [_problem_error("DUPLICATE_TAX_ID", "tax_id", payload.tax_id, "tax_id must be unique.")],
        )


async def _raise_if_duplicate_tax_id_for_update(session: AsyncSession, business_id: Any, tax_id: str | None) -> None:
    if not tax_id:
        return
    existing_id = await session.scalar(select(Business.id).where(Business.tax_id == tax_id, Business.id != business_id))
    if existing_id is not None:
        raise DuplicateBusinessError(
            "A business with this tax_id already exists.",
            [_problem_error("DUPLICATE_TAX_ID", "tax_id", tax_id, "tax_id must be unique.")],
        )


async def _validate_business_update_references(session: AsyncSession, payload: BusinessUpdate) -> None:
    codes = {code for code in (payload.industry_l1, payload.industry_l2) if code}
    if not codes:
        return
    rows = (
        await session.execute(
            select(Industry.code, Industry.level).where(Industry.code.in_(codes), Industry.is_active.is_(True))
        )
    ).all()
    levels = {code: level for code, level in rows}
    errors: list[dict[str, Any]] = []
    if payload.industry_l1 and levels.get(payload.industry_l1) != 1:
        errors.append(
            _problem_error(
                "UNKNOWN_REFERENCE",
                "industry_l1",
                payload.industry_l1,
                "industry_l1 must reference an active level-1 industry.",
            )
        )
    if payload.industry_l2 and levels.get(payload.industry_l2) != 2:
        errors.append(
            _problem_error(
                "UNKNOWN_REFERENCE",
                "industry_l2",
                payload.industry_l2,
                "industry_l2 must reference an active level-2 industry.",
            )
        )
    if errors:
        raise BusinessValidationError("Business profile contains unknown references.", errors)


def _person_from_payload(payload: PersonCreate) -> Person:
    return Person(
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        zalo_id=payload.zalo_id,
        role_title=payload.role_title,
    )


def _business_response(payload: BusinessCreate, business: Business, warnings: list[str]) -> BusinessResponse:
    return BusinessResponse(
        **payload.model_dump(),
        id=business.id,
        created_at=business.created_at,
        data_source=business.data_source,
        verification_status=business.verification_status,
        warnings=warnings,
    )


async def _business_detail_response(
    session: AsyncSession,
    business: Business,
    warnings: list[str] | None = None,
) -> BusinessDetailResponse:
    offer_rows = (
        await session.execute(
            select(Offer).where(Offer.business_id == business.id, Offer.is_active.is_(True)).order_by(Offer.created_at)
        )
    ).scalars()
    need_rows = (
        await session.execute(
            select(Need).where(Need.business_id == business.id, Need.is_active.is_(True)).order_by(Need.created_at)
        )
    ).scalars()
    person_rows = (
        await session.execute(
            select(Person)
            .join(BusinessPerson, BusinessPerson.person_id == Person.id)
            .where(BusinessPerson.business_id == business.id, Person.is_active.is_(True))
            .order_by(BusinessPerson.is_primary.desc(), Person.created_at)
        )
    ).scalars()

    return BusinessDetailResponse(
        name=business.name,
        tax_id=business.tax_id,
        legal_type=business.legal_type,
        business_stage=business.business_stage,
        year_established=business.year_established,
        industry_l1=business.industry_l1 or "",
        industry_l2=business.industry_l2,
        employee_range=business.employee_range,
        revenue_range_vnd=business.revenue_range_vnd,
        city=business.city,
        province=business.province or "",
        geo_operating=business.geo_operating,
        description=business.description,
        offers=[OfferResponse.model_validate(offer) for offer in offer_rows],
        needs=[NeedResponse.model_validate(need) for need in need_rows],
        persons=[PersonResponse.model_validate(person) for person in person_rows],
        id=business.id,
        is_active=business.is_active,
        created_at=business.created_at,
        data_source=business.data_source,
        verification_status=business.verification_status,
        warnings=warnings or [],
    )


@router.post("", response_model=BusinessResponse, status_code=201)
async def create_business(
    payload: BusinessCreate,
    session: Annotated[AsyncSession, Depends(get_db)],
    idem_key: Annotated[str | None, Depends(get_idempotency_key)],
    account: Annotated[Account, Depends(get_current_account)],
) -> BusinessResponse:
    payload_hash = hash_payload(payload.model_dump(mode="json"))
    idempotency = IdempotencyManager(settings.idempotency_ttl_seconds)
    warnings = []
    if payload.province_was_converted:
        warnings.append(f"province_converted: {payload.province_input} -> {payload.province}")

    try:
        if idem_key:
            lookup = await idempotency.get_or_create(session, idem_key, payload_hash)
            if lookup.payload_mismatch:
                raise BusinessValidationError(
                    "Idempotency-Key was reused with a different payload.",
                    [
                        _problem_error(
                            "IDEMPOTENCY_PAYLOAD_MISMATCH",
                            "Idempotency-Key",
                            idem_key,
                            "Use a new Idempotency-Key for a different payload.",
                        )
                    ],
                )
            if lookup.in_progress:
                raise IdempotencyConflictError()
            if lookup.cached_response is not None:
                raise IdempotencyReplayError(lookup.cached_response.status_code, lookup.cached_response.body)

        await _validate_references(session, payload)
        await _raise_if_duplicate_tax_id(session, payload)
        if account.person_id is None and not payload.persons:
            raise BusinessValidationError(
                "The first authenticated business needs an owner contact.",
                [
                    _problem_error(
                        "MISSING_OWNER_PERSON",
                        "persons",
                        [],
                        "Provide persons[0].full_name so the account can own this business.",
                    )
                ],
            )

        business = Business(
            name=payload.name,
            tax_id=payload.tax_id,
            legal_type=payload.legal_type,
            business_stage=payload.business_stage,
            year_established=payload.year_established,
            industry_l1=payload.industry_l1,
            industry_l2=payload.industry_l2,
            employee_range=payload.employee_range,
            revenue_range_vnd=payload.revenue_range_vnd,
            city=payload.city,
            province=payload.province,
            geo_operating=payload.geo_operating,
            description=payload.description,
            profile_embedding=None,
            data_source="self_reported",
            verification_status="unverified",
            verified_by=None,
        )
        session.add(business)
        await session.flush()

        owner_person_id = account.person_id
        contact_payloads = payload.persons
        if owner_person_id is None:
            owner_person = _person_from_payload(payload.persons[0])
            session.add(owner_person)
            await session.flush()
            account.person_id = owner_person.id
            session.add(account)
            owner_person_id = owner_person.id
            payload.persons[0].role = "owner"
            contact_payloads = payload.persons[1:]

        session.add(
            BusinessPerson(
                business_id=business.id,
                person_id=owner_person_id,
                role="owner",
                is_primary=True,
            )
        )

        for offer in payload.offers:
            session.add(
                Offer(
                    business_id=business.id,
                    intent_type=offer.intent_type,
                    category_l1=offer.category_l1,
                    category_l2=offer.category_l2,
                    geo_scope=offer.geo_scope,
                    title=offer.title,
                    description=offer.description,
                    structured_attrs=offer.structured_attrs,
                    embedding=None,
                )
            )
        for need in payload.needs:
            session.add(
                Need(
                    business_id=business.id,
                    intent_type=need.intent_type,
                    category_l1=need.category_l1,
                    category_l2=need.category_l2,
                    geo_scope=need.geo_scope,
                    title=need.title,
                    description=need.description,
                    structured_attrs=need.structured_attrs,
                    embedding=None,
                )
            )
        for person_payload in contact_payloads:
            _raise_if_protected_contact_role(person_payload.role, "persons.role")
            person = _person_from_payload(person_payload)
            session.add(person)
            await session.flush()
            session.add(
                BusinessPerson(
                    business_id=business.id,
                    person_id=person.id,
                    role=person_payload.role,
                    is_primary=False,
                )
            )

        await session.flush()
        await session.refresh(business)
        response = _business_response(payload, business, warnings)
        if idem_key:
            await idempotency.store_response(session, idem_key, 201, response.model_dump(mode="json"))

        await session.commit()
        logger.info("Created business", extra={"business_id": str(response.id), "has_idempotency_key": bool(idem_key)})
        return response
    except AppProblemError:
        await session.rollback()
        raise
    except IntegrityError as exc:
        await session.rollback()
        if payload.tax_id and "businesses_tax_id_key" in str(exc):
            raise DuplicateBusinessError(
                "A business with this tax_id already exists.",
                [_problem_error("DUPLICATE_TAX_ID", "tax_id", payload.tax_id, "tax_id must be unique.")],
            ) from exc
        if "persons_email_key" in str(exc):
            raise ConflictError(
                "A contact with this email already exists.",
                [_problem_error("DUPLICATE_PERSON_EMAIL", "persons.email", None, "person email must be unique.")],
            ) from exc
        raise


@router.get("/{business_id}", response_model=BusinessDetailResponse)
async def get_business(
    business_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> BusinessDetailResponse:
    await require_existing_business_access(session, account, business_id)
    business = await session.get(Business, business_id)
    if business is None or not business.is_active:
        raise ResourceNotFoundError("Business was not found.")
    return await _business_detail_response(session, business)


@router.patch("/{business_id}", response_model=BusinessDetailResponse)
async def update_business(
    business_id: UUID,
    payload: BusinessUpdate,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> BusinessDetailResponse:
    warnings = []
    if payload.province_was_converted:
        warnings.append(f"province_converted: {payload.province_input} -> {payload.province}")

    try:
        await require_existing_business_access(session, account, business_id)
        business = await session.get(Business, business_id)
        if business is None or not business.is_active:
            raise ResourceNotFoundError("Business was not found.")
        await _validate_business_update_references(session, payload)
        update_data = payload.model_dump(exclude_unset=True)
        await _raise_if_duplicate_tax_id_for_update(session, business.id, update_data.get("tax_id"))
        for field, value in update_data.items():
            setattr(business, field, value)
        session.add(business)
        await session.commit()
        await session.refresh(business)
        return await _business_detail_response(session, business, warnings)
    except AppProblemError:
        await session.rollback()
        raise
    except IntegrityError as exc:
        await session.rollback()
        if "businesses_tax_id_key" in str(exc):
            raise DuplicateBusinessError(
                "A business with this tax_id already exists.",
                [_problem_error("DUPLICATE_TAX_ID", "tax_id", payload.tax_id, "tax_id must be unique.")],
            ) from exc
        raise


@router.delete("/{business_id}", response_model=BusinessDetailResponse)
async def delete_business(
    business_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> BusinessDetailResponse:
    try:
        await require_existing_business_access(session, account, business_id)
        business = await session.get(Business, business_id)
        if business is None or not business.is_active:
            raise ResourceNotFoundError("Business was not found.")
        business.is_active = False
        session.add(business)
        await session.commit()
        await session.refresh(business)
        return await _business_detail_response(session, business)
    except AppProblemError:
        await session.rollback()
        raise
