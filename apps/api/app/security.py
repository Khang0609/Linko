from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.exceptions import AuthenticationError, AuthorizationError, ResourceNotFoundError
from app.models import Account, BusinessPerson

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
_password_hasher = PasswordHasher()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def create_access_token(account_id: UUID) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(account_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_account_id(token: str) -> UUID:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        if not isinstance(subject, str):
            raise AuthenticationError("Token subject is missing.")
        return UUID(subject)
    except (InvalidTokenError, ValueError) as exc:
        raise AuthenticationError("Bearer token is invalid or expired.") from exc


async def get_current_account(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Account:
    account_id = decode_account_id(token)
    account = await session.get(Account, account_id)
    if account is None or not account.is_active:
        raise AuthenticationError("Account is inactive or no longer exists.")
    return account


async def ensure_business_access(
    session: AsyncSession,
    account: Account,
    business_id: UUID,
    allowed_roles: tuple[str, ...] = ("owner", "authorized_rep"),
) -> None:
    if account.person_id is None:
        raise AuthorizationError("This account is not linked to a business contact.")

    role = await session.scalar(
        select(BusinessPerson.role).where(
            BusinessPerson.business_id == business_id,
            BusinessPerson.person_id == account.person_id,
            BusinessPerson.role.in_(allowed_roles),
            BusinessPerson.ended_at.is_(None),
        )
    )
    if role is None:
        raise AuthorizationError("This account cannot access the requested business resource.")


async def require_existing_business_access(
    session: AsyncSession,
    account: Account,
    business_id: UUID,
    allowed_roles: tuple[str, ...] = ("owner", "authorized_rep"),
) -> None:
    try:
        await ensure_business_access(session, account, business_id, allowed_roles)
    except AuthorizationError:
        business_link_exists = await session.scalar(
            select(BusinessPerson.id).where(BusinessPerson.business_id == business_id).limit(1)
        )
        if business_link_exists is None:
            raise ResourceNotFoundError("Business was not found.") from None
        raise
