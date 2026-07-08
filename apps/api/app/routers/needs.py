from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions import AppProblemError, ResourceNotFoundError
from app.models import Account, Need
from app.routers.resource_helpers import get_active_business, validate_offer_need_references
from app.schemas import NeedCreate, NeedResponse, NeedUpdate
from app.security import get_current_account, require_existing_business_access

router = APIRouter()


@router.get("/businesses/{business_id}/needs", response_model=list[NeedResponse])
async def list_needs(
    business_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> list[NeedResponse]:
    await require_existing_business_access(session, account, business_id)
    await get_active_business(session, business_id)
    needs = (
        await session.execute(
            select(Need).where(Need.business_id == business_id, Need.is_active.is_(True)).order_by(Need.created_at)
        )
    ).scalars()
    return [NeedResponse.model_validate(need) for need in needs]


@router.post("/businesses/{business_id}/needs", response_model=NeedResponse, status_code=201)
async def create_need(
    business_id: UUID,
    payload: NeedCreate,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> NeedResponse:
    try:
        await require_existing_business_access(session, account, business_id)
        await get_active_business(session, business_id)
        await validate_offer_need_references(session, payload, "need")
        need = Need(
            business_id=business_id,
            intent_type=payload.intent_type,
            category_l1=payload.category_l1,
            category_l2=payload.category_l2,
            geo_scope=payload.geo_scope,
            title=payload.title,
            description=payload.description,
            structured_attrs=payload.structured_attrs,
            embedding=None,
        )
        session.add(need)
        await session.commit()
        await session.refresh(need)
        return NeedResponse.model_validate(need)
    except AppProblemError:
        await session.rollback()
        raise
    except IntegrityError:
        await session.rollback()
        raise


@router.patch("/needs/{need_id}", response_model=NeedResponse)
async def update_need(
    need_id: UUID,
    payload: NeedUpdate,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> NeedResponse:
    try:
        need = await session.get(Need, need_id)
        if need is None or not need.is_active:
            raise ResourceNotFoundError("Need was not found.")
        await require_existing_business_access(session, account, need.business_id)
        await validate_offer_need_references(session, payload, "need")
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(need, field, value)
        session.add(need)
        await session.commit()
        await session.refresh(need)
        return NeedResponse.model_validate(need)
    except AppProblemError:
        await session.rollback()
        raise
    except IntegrityError:
        await session.rollback()
        raise


@router.delete("/needs/{need_id}", response_model=NeedResponse)
async def delete_need(
    need_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> NeedResponse:
    try:
        need = await session.get(Need, need_id)
        if need is None or not need.is_active:
            raise ResourceNotFoundError("Need was not found.")
        await require_existing_business_access(session, account, need.business_id)
        need.is_active = False
        session.add(need)
        await session.commit()
        await session.refresh(need)
        return NeedResponse.model_validate(need)
    except AppProblemError:
        await session.rollback()
        raise
