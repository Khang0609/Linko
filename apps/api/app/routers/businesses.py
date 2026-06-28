from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.exceptions import (
    BusinessValidationError,
    DuplicateBusinessError,
    IdempotencyConflictError,
    IdempotencyReplayError,
)
from app.models import Business, BusinessPerson, Industry, IntentType, Need, Offer, Person
from app.schemas import BusinessCreate, BusinessResponse
from core.idempotency import IdempotencyManager, get_idempotency_key, hash_payload

logger = logging.getLogger(__name__)
router = APIRouter()


def _problem_error(code: str, field: str, value: Any, message: str) -> dict[str, Any]:
    return {"code": code, "field": field, "value": value, "message": message}


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


def _business_response(payload: BusinessCreate, business: Business, warnings: list[str]) -> BusinessResponse:
    return BusinessResponse(
        **payload.model_dump(),
        id=business.id,
        created_at=business.created_at,
        data_source=business.data_source,
        verification_status=business.verification_status,
        warnings=warnings,
    )


@router.post("", response_model=BusinessResponse, status_code=201)
async def create_business(
    payload: BusinessCreate,
    session: Annotated[AsyncSession, Depends(get_db)],
    idem_key: Annotated[str | None, Depends(get_idempotency_key)],
) -> BusinessResponse:
    payload_hash = hash_payload(payload.model_dump(mode="json"))
    idempotency = IdempotencyManager(settings.idempotency_ttl_seconds)
    warnings = []
    if payload.province_was_converted:
        warnings.append(f"province_converted: {payload.province_input} -> {payload.province}")

    try:
        async with session.begin():
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
            for index, person_payload in enumerate(payload.persons):
                person = Person(
                    full_name=person_payload.full_name,
                    phone=person_payload.phone,
                    email=person_payload.email,
                    zalo_id=person_payload.zalo_id,
                    role_title=person_payload.role_title,
                )
                session.add(person)
                await session.flush()
                session.add(
                    BusinessPerson(
                        business_id=business.id,
                        person_id=person.id,
                        role=person_payload.role,
                        is_primary=index == 0,
                    )
                )

            await session.flush()
            await session.refresh(business)
            response = _business_response(payload, business, warnings)
            if idem_key:
                await idempotency.store_response(session, idem_key, 201, response.model_dump(mode="json"))

        logger.info("Created business", extra={"business_id": str(response.id), "has_idempotency_key": bool(idem_key)})
        return response
    except IntegrityError as exc:
        if payload.tax_id and "businesses_tax_id_key" in str(exc):
            raise DuplicateBusinessError(
                "A business with this tax_id already exists.",
                [_problem_error("DUPLICATE_TAX_ID", "tax_id", payload.tax_id, "tax_id must be unique.")],
            ) from exc
        raise
