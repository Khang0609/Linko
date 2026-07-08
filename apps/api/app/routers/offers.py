from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions import AppProblemError, ResourceNotFoundError
from app.models import Account, Offer
from app.routers.resource_helpers import get_active_business, validate_offer_need_references
from app.schemas import OfferCreate, OfferResponse, OfferUpdate
from app.security import get_current_account, require_existing_business_access

router = APIRouter()


@router.get("/businesses/{business_id}/offers", response_model=list[OfferResponse])
async def list_offers(
    business_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> list[OfferResponse]:
    await require_existing_business_access(session, account, business_id)
    await get_active_business(session, business_id)
    offers = (
        await session.execute(
            select(Offer)
            .where(Offer.business_id == business_id, Offer.is_active.is_(True))
            .order_by(Offer.created_at)
        )
    ).scalars()
    return [OfferResponse.model_validate(offer) for offer in offers]


@router.post("/businesses/{business_id}/offers", response_model=OfferResponse, status_code=201)
async def create_offer(
    business_id: UUID,
    payload: OfferCreate,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> OfferResponse:
    try:
        await require_existing_business_access(session, account, business_id)
        await get_active_business(session, business_id)
        await validate_offer_need_references(session, payload, "offer")
        offer = Offer(
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
        session.add(offer)
        await session.commit()
        await session.refresh(offer)
        return OfferResponse.model_validate(offer)
    except AppProblemError:
        await session.rollback()
        raise
    except IntegrityError:
        await session.rollback()
        raise


@router.patch("/offers/{offer_id}", response_model=OfferResponse)
async def update_offer(
    offer_id: UUID,
    payload: OfferUpdate,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> OfferResponse:
    try:
        offer = await session.get(Offer, offer_id)
        if offer is None or not offer.is_active:
            raise ResourceNotFoundError("Offer was not found.")
        await require_existing_business_access(session, account, offer.business_id)
        await validate_offer_need_references(session, payload, "offer")
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(offer, field, value)
        session.add(offer)
        await session.commit()
        await session.refresh(offer)
        return OfferResponse.model_validate(offer)
    except AppProblemError:
        await session.rollback()
        raise
    except IntegrityError:
        await session.rollback()
        raise


@router.delete("/offers/{offer_id}", response_model=OfferResponse)
async def delete_offer(
    offer_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
) -> OfferResponse:
    try:
        offer = await session.get(Offer, offer_id)
        if offer is None or not offer.is_active:
            raise ResourceNotFoundError("Offer was not found.")
        await require_existing_business_access(session, account, offer.business_id)
        offer.is_active = False
        session.add(offer)
        await session.commit()
        await session.refresh(offer)
        return OfferResponse.model_validate(offer)
    except AppProblemError:
        await session.rollback()
        raise
