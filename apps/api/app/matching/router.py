"""API router for Matching Engine (M2) — Issue #10.

GET /api/v1/matching?company_id=X
Bearer authenticated. Checks that requesting user belongs to company X.
Queries pgvector cosine similarity index to return top recommended matches.
"""

from __future__ import annotations

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.matching.service import get_top_matches
from app.models import Account
from app.security import get_current_account, require_existing_business_access

logger = logging.getLogger(__name__)

router = APIRouter()


class MatchItem(BaseModel):
    """Pydantic model representing a single matched business recommendation."""

    business_id: UUID
    name: str
    industry_l1: str | None = None
    industry_l2: str | None = None
    province: str | None = None
    score: float


@router.get("/matching", response_model=list[MatchItem])
async def list_matches(
    company_id: Annotated[UUID, Query(description="The source business ID to find matches for")],
    session: Annotated[AsyncSession, Depends(get_db)],
    account: Annotated[Account, Depends(get_current_account)],
    limit: Annotated[int, Query(ge=1, le=50)] = 5,
) -> list[MatchItem]:
    """Find top N matching businesses for a company.

    Requires Bearer Auth. Checks that requesting account has access to the
    source company.
    """
    # Enforce tenant isolation/authorization access
    await require_existing_business_access(session, account, company_id)

    # Fetch top matches
    results = await get_top_matches(session, company_id, limit=limit)
    return [MatchItem(**item) for item in results]
