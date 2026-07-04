from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.exceptions import AuthenticationError, ConflictError
from app.models import Account, Business, BusinessPerson, Person
from app.schemas import (
    AccountBusinessSummary,
    AccountCreate,
    AccountResponse,
    AuthMeResponse,
    LoginRequest,
    LogoutResponse,
    PersonResponse,
    SignupResponse,
    TokenResponse,
)
from app.security import create_access_token, get_current_account, hash_password, normalize_email, verify_password

router = APIRouter()


def _account_response(account: Account) -> AccountResponse:
    return AccountResponse(
        id=account.id,
        email=account.email,
        person_id=account.person_id,
        is_active=account.is_active,
        created_at=account.created_at,
        last_login_at=account.last_login_at,
    )


def _token_response(account: Account) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(account.id),
        token_type="bearer",
        expires_in=settings.jwt_expire_minutes * 60,
    )


async def _raise_if_email_exists(session: AsyncSession, email: str) -> None:
    existing_id = await session.scalar(select(Account.id).where(func.lower(Account.email) == email))
    if existing_id is not None:
        raise ConflictError(
            "An account with this email already exists.",
            [{"code": "DUPLICATE_EMAIL", "field": "email", "value": email, "message": "email must be unique."}],
        )


@router.post("/signup", response_model=SignupResponse, status_code=201)
async def signup(payload: AccountCreate, session: Annotated[AsyncSession, Depends(get_db)]) -> SignupResponse:
    email = normalize_email(payload.email)
    try:
        async with session.begin():
            await _raise_if_email_exists(session, email)
            account = Account(email=email, password_hash=hash_password(payload.password))
            session.add(account)
            await session.flush()
            await session.refresh(account)
    except IntegrityError as exc:
        raise ConflictError(
            "An account with this email already exists.",
            [{"code": "DUPLICATE_EMAIL", "field": "email", "value": email, "message": "email must be unique."}],
        ) from exc

    token = _token_response(account)
    return SignupResponse(account_id=account.id, **token.model_dump())


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: Annotated[AsyncSession, Depends(get_db)]) -> TokenResponse:
    email = normalize_email(payload.email)
    account = await session.scalar(select(Account).where(func.lower(Account.email) == email))
    if account is None or not account.is_active or not verify_password(payload.password, account.password_hash):
        raise AuthenticationError("Email or password is incorrect.")

    account.last_login_at = datetime.now(UTC)
    session.add(account)
    await session.commit()
    await session.refresh(account)

    return _token_response(account)


@router.post("/logout", response_model=LogoutResponse)
async def logout() -> LogoutResponse:
    return LogoutResponse(message="Logged out. Delete the bearer token on the client.")


@router.get("/me", response_model=AuthMeResponse)
async def me(
    account: Annotated[Account, Depends(get_current_account)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AuthMeResponse:
    person_response = None
    businesses: list[AccountBusinessSummary] = []
    if account.person_id is not None:
        person = await session.get(Person, account.person_id)
        if person is not None and person.is_active:
            person_response = PersonResponse.model_validate(person)

            rows = (
                await session.execute(
                    select(Business, BusinessPerson.role, BusinessPerson.is_primary)
                    .join(BusinessPerson, BusinessPerson.business_id == Business.id)
                    .where(
                        BusinessPerson.person_id == account.person_id,
                        BusinessPerson.ended_at.is_(None),
                        Business.is_active.is_(True),
                    )
                    .order_by(BusinessPerson.is_primary.desc(), Business.created_at.desc())
                )
            ).all()
            seen: set[UUID] = set()
            for business, role, is_primary in rows:
                if business.id in seen:
                    continue
                seen.add(business.id)
                businesses.append(
                    AccountBusinessSummary(id=business.id, name=business.name, role=role, is_primary=is_primary)
                )

    return AuthMeResponse(account=_account_response(account), person=person_response, businesses=businesses)
