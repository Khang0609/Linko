"""Authenticated API route for the Smart Business Analyzer."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from types import MappingProxyType
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analyzer.dependencies import get_analyzer_provider, get_payload_resolver
from app.analyzer.mapping import (
    IndustryCatalog,
    build_industry_catalog,
)
from app.analyzer.payloads import PayloadResolver
from app.analyzer.providers.base import LLMProvider
from app.analyzer.schemas import AnalyzeRequest, AnalyzeResponse, fallback_response
from app.analyzer.service import run_analysis
from app.config import settings
from app.database import get_db
from app.models import Industry, IntentType
from app.security import get_current_account

logger = logging.getLogger(__name__)
router = APIRouter()


@dataclass(frozen=True)
class ReferenceCatalog:
    industry_prompt: str
    intent_prompt: str
    industries: IndustryCatalog


_reference_catalog: ReferenceCatalog | None = None
_reference_catalog_lock = asyncio.Lock()


async def _fetch_reference_data(session: AsyncSession) -> ReferenceCatalog:
    """Fetch active reference rows and build an immutable catalog snapshot."""
    ind_stmt = select(Industry).where(Industry.is_active.is_(True))
    industries = (await session.execute(ind_stmt)).scalars().all()

    industry_rows: list[dict[str, Any]] = []
    l1_names: dict[str, str] = {}
    l2_by_parent: dict[str, list[str]] = {}
    for industry in industries:
        industry_rows.append(
            {
                "code": industry.code,
                "level": industry.level,
                "parent_code": industry.parent_code,
                "is_active": industry.is_active,
            }
        )
        if industry.level == 1:
            l1_names[industry.code] = industry.name_vi
        elif industry.level == 2 and industry.parent_code:
            l2_by_parent.setdefault(industry.parent_code, []).append(
                f"  * {industry.code}: {industry.name_vi}"
            )

    industry_lines: list[str] = []
    for code in sorted(l1_names):
        industry_lines.append(f"- {code}: {l1_names[code]}")
        industry_lines.extend(sorted(l2_by_parent.get(code, [])))

    intent_stmt = select(IntentType).where(IntentType.is_active.is_(True))
    intents = (await session.execute(intent_stmt)).scalars().all()
    intent_lines = sorted(
        f"- {intent.code}: {intent.name_vi} ({intent.match_kind})"
        for intent in intents
    )

    return ReferenceCatalog(
        industry_prompt="\n".join(industry_lines),
        intent_prompt="\n".join(intent_lines),
        industries=MappingProxyType(build_industry_catalog(industry_rows)),
    )


async def _get_reference_data(session: AsyncSession) -> ReferenceCatalog:
    """Load reference data once, then reuse the immutable snapshot."""
    global _reference_catalog

    if _reference_catalog is not None:
        return _reference_catalog

    async with _reference_catalog_lock:
        if _reference_catalog is None:
            _reference_catalog = await _fetch_reference_data(session)
        return _reference_catalog


def clear_reference_cache() -> None:
    """Clear the catalog snapshot for tests or an explicit refresh."""
    global _reference_catalog
    _reference_catalog = None


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_business(
    request: AnalyzeRequest,
    account: Annotated[Any, Depends(get_current_account)],
    session: Annotated[AsyncSession, Depends(get_db)],
    provider: Annotated[LLMProvider, Depends(get_analyzer_provider)],
    payload_resolver: Annotated[PayloadResolver, Depends(get_payload_resolver)],
) -> AnalyzeResponse:
    """Analyze unstructured business information within one end-to-end deadline."""
    loop = asyncio.get_running_loop()
    deadline = loop.time() + settings.analyzer_timeout_seconds

    if not provider.available:
        return fallback_response("PROVIDER_NOT_CONFIGURED")

    try:
        async with asyncio.timeout_at(deadline):
            reference = await _get_reference_data(session)
            remaining = max(0.001, deadline - loop.time())
            provider.configure_context(
                industry_catalog=reference.industry_prompt,
                intent_catalog=reference.intent_prompt,
                timeout=min(settings.analyzer_provider_timeout_seconds, remaining),
            )

            return await run_analysis(
                request,
                provider,
                industry_catalog=reference.industries,
                payload_resolver=payload_resolver,
                account_id=account.id,
                timeout=remaining,
            )
    except TimeoutError:
        logger.warning("analyzer.endpoint_timeout source_type=%s", request.source_type)
        return fallback_response("TIMEOUT")
    except Exception:
        logger.exception("analyzer.reference_data_error source_type=%s", request.source_type)
        return fallback_response("REFERENCE_DATA_ERROR")
