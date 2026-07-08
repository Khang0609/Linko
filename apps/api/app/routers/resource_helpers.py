from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import BusinessValidationError, ResourceNotFoundError
from app.models import Business, Industry, IntentType


def problem_error(code: str, field: str, value: Any, message: str) -> dict[str, Any]:
    return {"code": code, "field": field, "value": value, "message": message}


async def get_active_business(session: AsyncSession, business_id: UUID) -> Business:
    business = await session.get(Business, business_id)
    if business is None or not business.is_active:
        raise ResourceNotFoundError("Business was not found.")
    return business


async def validate_offer_need_references(session: AsyncSession, payload: Any, field_prefix: str) -> None:
    errors: list[dict[str, Any]] = []

    intent_type = getattr(payload, "intent_type", None)
    if intent_type is not None:
        existing_intent = await session.scalar(
            select(IntentType.code).where(IntentType.code == intent_type, IntentType.is_active.is_(True))
        )
        if existing_intent is None:
            errors.append(
                problem_error(
                    "UNKNOWN_REFERENCE",
                    f"{field_prefix}.intent_type",
                    intent_type,
                    "intent_type must reference an active intent type.",
                )
            )

    category_l1 = getattr(payload, "category_l1", None)
    category_l2 = getattr(payload, "category_l2", None)
    category_codes = {code for code in (category_l1, category_l2) if code}
    industry_levels: dict[str, int] = {}
    if category_codes:
        rows = (
            await session.execute(
                select(Industry.code, Industry.level).where(
                    Industry.code.in_(category_codes),
                    Industry.is_active.is_(True),
                )
            )
        ).all()
        industry_levels = {code: level for code, level in rows}

    if category_l1 and industry_levels.get(category_l1) != 1:
        errors.append(
            problem_error(
                "UNKNOWN_REFERENCE",
                f"{field_prefix}.category_l1",
                category_l1,
                "category_l1 must reference an active level-1 industry.",
            )
        )
    if category_l2 and industry_levels.get(category_l2) != 2:
        errors.append(
            problem_error(
                "UNKNOWN_REFERENCE",
                f"{field_prefix}.category_l2",
                category_l2,
                "category_l2 must reference an active level-2 industry.",
            )
        )

    if errors:
        raise BusinessValidationError("Resource contains unknown references.", errors)
