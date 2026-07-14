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
from uuid import UUID

from app.analyzer.ingest.base import IngestResult
from app.analyzer.ingest.pdf import ingest_pdf_bytes_async
from app.analyzer.ingest.text import ingest_text
from app.analyzer.ingest.url import SSRFError, ingest_url
from app.analyzer.mapping import IndustryCatalog, post_validate
from app.analyzer.payloads import PayloadRefUnavailableError, PayloadResolver
from app.analyzer.prompt import PROMPT_VERSION
from app.analyzer.providers.base import LLMParseError, LLMProvider, ProviderUnavailableError
from app.analyzer.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    BusinessDraft,
    ExtractionPayload,
    fallback_response,
)

logger = logging.getLogger(__name__)


def _parse_llm_output(raw: dict[str, Any]) -> tuple[BusinessDraft, dict[str, float]]:
    """Parse the raw LLM JSON output into a BusinessDraft + confidence dict."""
    payload = ExtractionPayload.model_validate(raw)
    draft = BusinessDraft.model_validate(
        payload.model_dump(exclude={"field_confidence"})
    )
    return draft, dict(payload.field_confidence)


async def _run_ingest(
    request: AnalyzeRequest,
    payload_resolver: PayloadResolver,
    account_id: UUID,
) -> IngestResult:
    """Route to the correct ingest handler based on source_type."""
    if request.source_type == "text":
        if request.inline_text is not None:
            return ingest_text(inline_text=request.inline_text)
        resolved_text = await payload_resolver.resolve_text(
            request.payload_ref or "",
            account_id,
        )
        return ingest_text(inline_text=resolved_text)
    elif request.source_type == "url":
        return await ingest_url(request.payload_ref or "")
    elif request.source_type == "pdf":
        pdf_bytes = await payload_resolver.resolve_pdf(
            request.payload_ref or "",
            account_id,
        )
        return await ingest_pdf_bytes_async(pdf_bytes)
    else:
        return IngestResult(text="", source_type=request.source_type, warnings=["UNKNOWN_SOURCE_TYPE"])


async def run_analysis(
    request: AnalyzeRequest,
    provider: LLMProvider,
    *,
    industry_catalog: IndustryCatalog,
    payload_resolver: PayloadResolver,
    account_id: UUID,
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
            _pipeline(
                request,
                provider,
                request_id,
                industry_catalog,
                payload_resolver,
                account_id,
            ),
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
    except PayloadRefUnavailableError:
        return fallback_response("PAYLOAD_REF_UNAVAILABLE")
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
    industry_catalog: IndustryCatalog,
    payload_resolver: PayloadResolver,
    account_id: UUID,
) -> AnalyzeResponse:
    """Inner pipeline: ingest → extract → map → respond."""
    # 1. Ingest
    ingest_result = await _run_ingest(request, payload_resolver, account_id)
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
    except LLMParseError:
        all_warnings.append("LLM_PARSE_ERROR")
        return fallback_response(*all_warnings)
    except ProviderUnavailableError:
        all_warnings.append("PROVIDER_UNAVAILABLE")
        return fallback_response(*all_warnings)
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
    draft, field_meta, validation_warnings = post_validate(
        draft,
        industry_catalog=industry_catalog,
        raw_confidence=field_confidence,
    )
    all_warnings.extend(validation_warnings)

    return AnalyzeResponse(
        status="completed",
        data=draft,
        field_meta=field_meta,
        warnings=all_warnings,
    )
