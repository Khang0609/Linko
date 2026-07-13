"""API router for Smart Business Analyzer — Issue #10.

POST /api/v1/analyze
Bearer authenticated.
Fetches active reference data from DB to dynamically populate prompt enums
and mapping validation catalogs.
"""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analyzer.mapping import load_industry_catalog
from app.analyzer.providers.gemini import GeminiProvider
from app.analyzer.providers.mock import MockProvider
from app.analyzer.schemas import AnalyzeRequest, AnalyzeResponse
from app.analyzer.service import run_analysis
from app.config import settings
from app.database import get_db
from app.models import Industry, IntentType
from app.security import get_current_account

logger = logging.getLogger(__name__)

router = APIRouter()


async def _fetch_reference_data(session: AsyncSession) -> tuple[str, str, list[dict]]:
    """Fetch active industries and intent types to populate prompt and validation catalog.

    Returns:
        (industry_catalog_text, intent_catalog_text, industry_rows)
    """
    # 1. Fetch industries
    ind_stmt = select(Industry).where(Industry.is_active.is_(True))
    industries = (await session.execute(ind_stmt)).scalars().all()

    # Build catalog text for prompt and list for mapping.py validation
    industry_rows = []
    l1_lines = []
    l2_by_parent: dict[str, list[str]] = {}

    for ind in industries:
        industry_rows.append({
            "code": ind.code,
            "level": ind.level,
            "parent_code": ind.parent_code,
            "is_active": ind.is_active,
        })
        if ind.level == 1:
            l1_lines.append(f"- {ind.code}: {ind.name_vi}")
        elif ind.level == 2 and ind.parent_code:
            l2_by_parent.setdefault(ind.parent_code, []).append(f"  * {ind.code}: {ind.name_vi}")

    ind_lines = []
    for l1 in sorted(l1_lines):
        ind_lines.append(l1)
        code = l1.split(":")[0].replace("- ", "").strip()
        if code in l2_by_parent:
            ind_lines.extend(sorted(l2_by_parent[code]))

    industry_catalog_text = "\n".join(ind_lines)

    # 2. Fetch intent types
    int_stmt = select(IntentType).where(IntentType.is_active.is_(True))
    intents = (await session.execute(int_stmt)).scalars().all()

    intent_lines = []
    for intent in intents:
        intent_lines.append(f"- {intent.code}: {intent.name_vi} ({intent.match_kind})")

    intent_catalog_text = "\n".join(sorted(intent_lines))

    return industry_catalog_text, intent_catalog_text, industry_rows


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_business(
    request: AnalyzeRequest,
    account: Annotated[Any, Depends(get_current_account)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AnalyzeResponse:
    """Analyze unstructured business info to extract structured data draft.

    Requires Bearer Auth.
    Enforces a strict response time budget using the service orchestrator.
    """
    # Fetch active catalogs from db
    industry_catalog, intent_catalog, industry_rows = await _fetch_reference_data(session)

    # Load mapping catalog into the validator module cache
    load_industry_catalog(industry_rows)

    # Select provider based on config
    if settings.analyzer_provider == "gemini":
        provider = GeminiProvider(
            project=settings.gemini_project,
            region=settings.gemini_region,
            model=settings.gemini_model,
            timeout=settings.analyzer_timeout_seconds,
            industry_catalog=industry_catalog,
            intent_catalog=intent_catalog,
        )
    else:
        provider = MockProvider()

    # Orchestrate the pipeline
    response = await run_analysis(request, provider, timeout=settings.analyzer_timeout_seconds)
    return response
