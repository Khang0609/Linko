"""Smart Analyzer service — Issue #10.

Pipeline: ingest → extract (LLM) → map (post-validate) → respond.
Total budget: 5 seconds. On any unhandled error → fallback response.

Logging policy:
- Log: request_id, source_type, latency_ms, model_version, prompt_version, schema_version, warning_codes.
- NEVER log: raw input text, tax_id, names, email, phone.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from typing import Any

from app.analyzer.ingest.base import IngestResult
from app.analyzer.ingest.pdf import ingest_pdf
from app.analyzer.ingest.text import ingest_text
from app.analyzer.ingest.url import SSRFError, ingest_url
from app.analyzer.mapping import post_validate
from app.analyzer.prompt import PROMPT_VERSION
from app.analyzer.providers.base import LLMProvider
from app.analyzer.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    BusinessDraft,
    NeedDraft,
    OfferDraft,
    fallback_response,
)

logger = logging.getLogger(__name__)


def _parse_llm_output(raw: dict[str, Any]) -> tuple[BusinessDraft, dict[str, float]]:
    """Parse the raw LLM JSON output into a BusinessDraft + confidence dict."""
    # Extract field_confidence before constructing the draft
    field_confidence: dict[str, float] = raw.pop("field_confidence", {})

    # Parse offers and needs into draft objects
    offers_raw = raw.pop("offers", [])
    needs_raw = raw.pop("needs", [])
    raw.pop("persons", None)  # always []

    offers = [OfferDraft(**o) for o in offers_raw] if isinstance(offers_raw, list) else []
    needs = [NeedDraft(**n) for n in needs_raw] if isinstance(needs_raw, list) else []

    draft = BusinessDraft(
        **{k: v for k, v in raw.items() if k in BusinessDraft.model_fields},
        offers=offers,
        needs=needs,
        persons=[],
    )
    return draft, field_confidence


async def _run_ingest(request: AnalyzeRequest) -> IngestResult:
    """Route to the correct ingest handler based on source_type."""
    if request.source_type == "text":
        return ingest_text(
            inline_text=request.inline_text,
            payload_ref=request.payload_ref,
        )
    elif request.source_type == "url":
        return await ingest_url(request.payload_ref or "")
    elif request.source_type == "pdf":
        return ingest_pdf(request.payload_ref or "")
    else:
        return IngestResult(text="", source_type=request.source_type, warnings=["UNKNOWN_SOURCE_TYPE"])


async def run_analysis(
    request: AnalyzeRequest,
    provider: LLMProvider,
    *,
    timeout: float = 5.0,
) -> AnalyzeResponse:
    """Execute the full analyzer pipeline with timeout enforcement.

    Args:
        request: The validated AnalyzeRequest.
        provider: The LLM provider to use for extraction.
        timeout: Total budget in seconds.

    Returns:
        AnalyzeResponse with status 'completed' or 'fallback'.
    """
    request_id = uuid.uuid4().hex[:12]
    start = time.monotonic()

    try:
        result = await asyncio.wait_for(
            _pipeline(request, provider, request_id),
            timeout=timeout,
        )
    except TimeoutError:
        latency_ms = (time.monotonic() - start) * 1000
        logger.warning(
            "analyzer.timeout request_id=%s source_type=%s latency_ms=%.0f",
            request_id,
            request.source_type,
            latency_ms,
        )
        return fallback_response("TIMEOUT")
    except SSRFError as exc:
        logger.warning("analyzer.ssrf request_id=%s detail=%s", request_id, exc)
        return fallback_response("SSRF_BLOCKED")
    except Exception:
        latency_ms = (time.monotonic() - start) * 1000
        logger.exception(
            "analyzer.error request_id=%s source_type=%s latency_ms=%.0f",
            request_id,
            request.source_type,
            latency_ms,
        )
        return fallback_response("INTERNAL_ERROR")

    latency_ms = (time.monotonic() - start) * 1000
    logger.info(
        "analyzer.completed request_id=%s source_type=%s latency_ms=%.0f prompt_version=%s warnings=%s",
        request_id,
        request.source_type,
        latency_ms,
        PROMPT_VERSION,
        result.warnings,
    )
    return result


async def _pipeline(
    request: AnalyzeRequest,
    provider: LLMProvider,
    request_id: str,
) -> AnalyzeResponse:
    """Inner pipeline: ingest → extract → map → respond."""
    # 1. Ingest
    ingest_result = await _run_ingest(request)
    all_warnings = list(ingest_result.warnings)

    if ingest_result.is_empty:
        return AnalyzeResponse(
            status="fallback",
            data=BusinessDraft(),
            field_meta={},
            warnings=all_warnings or ["EMPTY_INGEST"],
        )

    # 2. Extract via LLM
    try:
        raw_output = await provider.extract(ingest_result.text)
    except json.JSONDecodeError:
        all_warnings.append("LLM_INVALID_JSON")
        return fallback_response(*all_warnings)
    except TimeoutError:
        all_warnings.append("LLM_TIMEOUT")
        return fallback_response(*all_warnings)
    except Exception:
        all_warnings.append("LLM_ERROR")
        return fallback_response(*all_warnings)

    # 3. Parse LLM output
    try:
        draft, field_confidence = _parse_llm_output(raw_output)
    except Exception:
        all_warnings.append("LLM_PARSE_ERROR")
        return fallback_response(*all_warnings)

    # 4. Post-validate (mapping.py)
    draft, field_meta, validation_warnings = post_validate(draft, field_confidence)
    all_warnings.extend(validation_warnings)

    return AnalyzeResponse(
        status="completed",
        data=draft,
        field_meta=field_meta,
        warnings=all_warnings,
    )
