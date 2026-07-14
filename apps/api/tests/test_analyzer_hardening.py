"""Hardening tests for Smart Business Analyzer runtime boundaries."""

from __future__ import annotations

import asyncio
import inspect
import threading
import time
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.analyzer.dependencies import get_analyzer_provider
from app.analyzer.eval import live
from app.analyzer.eval.loader import load_evaluation_cases
from app.analyzer.ingest.base import IngestResult
from app.analyzer.ingest.pdf import (
    MAX_PAGES,
    MAX_PDF_BYTES,
    ingest_pdf_bytes,
    ingest_pdf_bytes_async,
)
from app.analyzer.ingest.url import FetchResult, SSRFError, _check_url, ingest_url
from app.analyzer.mapping import build_industry_catalog, post_validate
from app.analyzer.payloads import DisabledPayloadResolver
from app.analyzer.providers.base import LLMProvider
from app.analyzer.providers.disabled import DisabledProvider
from app.analyzer.providers.gemini import GeminiProvider
from app.analyzer.schemas import AnalyzeRequest, BusinessDraft, NeedDraft, OfferDraft
from app.analyzer.service import run_analysis
from app.config import Settings, settings
from app.main import app
from app.models import Account
from app.security import get_current_account

ACCOUNT_ID = UUID("11111111-1111-1111-1111-111111111111")


def _catalog():
    return build_industry_catalog(
        [
            {"code": "manufacturing", "level": 1, "parent_code": None, "is_active": True},
            {
                "code": "manufacturing.food",
                "level": 2,
                "parent_code": "manufacturing",
                "is_active": True,
            },
            {"code": "retail", "level": 1, "parent_code": None, "is_active": True},
            {
                "code": "retail.food",
                "level": 2,
                "parent_code": "retail",
                "is_active": True,
            },
            {"code": "inactive", "level": 1, "parent_code": None, "is_active": False},
        ]
    )


class RecordingProvider(LLMProvider):
    def __init__(self, output: dict[str, Any] | None = None) -> None:
        self.output = output or {"name": "Resolved Business"}
        self.inputs: list[str] = []

    async def extract(self, text: str) -> dict[str, Any]:
        self.inputs.append(text)
        return self.output


class FixturePayloadResolver:
    """In-memory tenant-aware resolver used only by tests."""

    def __init__(
        self,
        *,
        text: dict[str, str] | None = None,
        pdf: dict[str, bytes] | None = None,
    ) -> None:
        self.text = text or {}
        self.pdf = pdf or {}
        self.calls: list[tuple[str, str, UUID]] = []

    async def resolve_text(self, ref: str, account_id: UUID) -> str:
        self.calls.append(("text", ref, account_id))
        return self.text[ref]

    async def resolve_pdf(self, ref: str, account_id: UUID) -> bytes:
        self.calls.append(("pdf", ref, account_id))
        return self.pdf[ref]


def _fake_gemini(response_text: str) -> GeminiProvider:
    provider = GeminiProvider(project="test-project", timeout=0.2)
    provider._client = MagicMock()
    provider._client.aio.models.generate_content = AsyncMock(
        return_value=SimpleNamespace(text=response_text, parsed=None)
    )
    return provider


async def _analyze(
    request: AnalyzeRequest,
    provider: LLMProvider,
    *,
    resolver: Any | None = None,
    timeout: float = 1.0,
):
    return await run_analysis(
        request,
        provider,
        industry_catalog=_catalog(),
        payload_resolver=resolver or DisabledPayloadResolver(),
        account_id=ACCOUNT_ID,
        timeout=timeout,
    )


def _override_account() -> Account:
    return Account(id=ACCOUNT_ID, email="analyzer@example.com", is_active=True)


def test_settings_default_disables_provider_and_rejects_mock(monkeypatch) -> None:
    monkeypatch.delenv("ANALYZER_PROVIDER", raising=False)
    configured = Settings(
        _env_file=None,
        jwt_secret="test-only-jwt-secret-with-32-characters",
    )
    assert configured.analyzer_provider == "disabled"

    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            jwt_secret="test-only-jwt-secret-with-32-characters",
            analyzer_provider="mock",
        )


def test_runtime_provider_selection_has_no_mock_fallback() -> None:
    with patch.object(settings, "analyzer_provider", "disabled"):
        assert isinstance(get_analyzer_provider(), DisabledProvider)

    with (
        patch.object(settings, "analyzer_provider", "gemini"),
        patch.object(settings, "gemini_project", None),
    ):
        assert isinstance(get_analyzer_provider(), DisabledProvider)

    with (
        patch.object(settings, "analyzer_provider", "gemini"),
        patch.object(settings, "gemini_project", "project-id"),
    ):
        assert isinstance(get_analyzer_provider(), GeminiProvider)


def test_disabled_endpoint_returns_exact_safe_fallback(test_client: TestClient) -> None:
    app.dependency_overrides[get_current_account] = _override_account
    try:
        with patch.object(settings, "analyzer_provider", "disabled"):
            response = test_client.post(
                "/api/v1/analyze",
                json={"source_type": "text", "inline_text": "Never mock this"},
                headers={"Authorization": "Bearer test-token"},
            )
    finally:
        app.dependency_overrides.pop(get_current_account, None)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "fallback"
    assert body["schema_version"] == "1.0"
    assert body["data"]["name"] is None
    assert body["data"]["offers"] == []
    assert body["field_meta"] == {}
    assert body["warnings"] == ["PROVIDER_NOT_CONFIGURED"]


def test_gemini_missing_project_returns_config_fallback(test_client: TestClient) -> None:
    app.dependency_overrides[get_current_account] = _override_account
    try:
        with (
            patch.object(settings, "analyzer_provider", "gemini"),
            patch.object(settings, "gemini_project", None),
        ):
            response = test_client.post(
                "/api/v1/analyze",
                json={"source_type": "text", "inline_text": "Business profile"},
                headers={"Authorization": "Bearer test-token"},
            )
    finally:
        app.dependency_overrides.pop(get_current_account, None)

    assert response.status_code == 200
    assert response.json()["warnings"] == ["PROVIDER_NOT_CONFIGURED"]


@pytest.mark.parametrize(
    "unsafe_ref",
    ["/etc/passwd", "C:\\Windows\\secret.pdf", "../secret.pdf", "safe/../../secret.pdf", "file:///tmp/a.pdf"],
)
def test_claim_check_references_reject_local_paths(unsafe_ref: str) -> None:
    with pytest.raises(ValidationError, match="opaque claim-check reference"):
        AnalyzeRequest(source_type="pdf", payload_ref=unsafe_ref)


@pytest.mark.anyio
async def test_disabled_resolver_returns_payload_unavailable() -> None:
    response = await _analyze(
        AnalyzeRequest(source_type="text", payload_ref="tenant/object-key"),
        RecordingProvider(),
    )
    assert response.status == "fallback"
    assert response.warnings == ["PAYLOAD_REF_UNAVAILABLE"]


@pytest.mark.anyio
async def test_text_payload_ref_is_resolved_and_receives_account_id() -> None:
    resolver = FixturePayloadResolver(text={"tenant/text-1": "resolved content"})
    provider = RecordingProvider()
    response = await _analyze(
        AnalyzeRequest(source_type="text", payload_ref="tenant/text-1"),
        provider,
        resolver=resolver,
    )
    assert response.status == "completed"
    assert provider.inputs == ["resolved content"]
    assert resolver.calls == [("text", "tenant/text-1", ACCOUNT_ID)]


@pytest.mark.anyio
async def test_pdf_payload_ref_resolves_bytes_with_account_id() -> None:
    resolver = FixturePayloadResolver(pdf={"tenant/pdf-1": b"trusted-pdf-bytes"})
    provider = RecordingProvider()
    with patch(
        "app.analyzer.service.ingest_pdf_bytes_async",
        new_callable=AsyncMock,
        return_value=IngestResult(text="resolved pdf", source_type="pdf"),
    ) as extract:
        response = await _analyze(
            AnalyzeRequest(source_type="pdf", payload_ref="tenant/pdf-1"),
            provider,
            resolver=resolver,
        )
    assert response.status == "completed"
    extract.assert_awaited_once_with(b"trusted-pdf-bytes")
    assert resolver.calls == [("pdf", "tenant/pdf-1", ACCOUNT_ID)]


@pytest.mark.anyio
async def test_inline_text_does_not_call_payload_resolver() -> None:
    resolver = FixturePayloadResolver()
    provider = RecordingProvider()
    response = await _analyze(
        AnalyzeRequest(source_type="text", inline_text="inline evidence"),
        provider,
        resolver=resolver,
    )
    assert response.status == "completed"
    assert provider.inputs == ["inline evidence"]
    assert resolver.calls == []


@pytest.mark.anyio
async def test_pdf_worker_does_not_block_event_loop() -> None:
    def slow_extract(_data: bytes) -> IngestResult:
        time.sleep(0.08)
        return IngestResult(text="done", source_type="pdf")

    with patch("app.analyzer.ingest.pdf.ingest_pdf_bytes", side_effect=slow_extract):
        job = asyncio.create_task(
            ingest_pdf_bytes_async(b"pdf", semaphore=asyncio.Semaphore(1))
        )
        await asyncio.sleep(0.01)
        assert not job.done()
        result = await job
    assert result.text == "done"


@pytest.mark.anyio
async def test_pdf_request_returns_fallback_near_deadline() -> None:
    def slow_extract(_data: bytes) -> IngestResult:
        time.sleep(0.1)
        return IngestResult(text="late", source_type="pdf")

    resolver = FixturePayloadResolver(pdf={"tenant/pdf": b"pdf"})
    started = time.monotonic()
    with patch("app.analyzer.ingest.pdf.ingest_pdf_bytes", side_effect=slow_extract):
        response = await _analyze(
            AnalyzeRequest(source_type="pdf", payload_ref="tenant/pdf"),
            RecordingProvider(),
            resolver=resolver,
            timeout=0.02,
        )
        elapsed = time.monotonic() - started
        await asyncio.sleep(0.11)
    assert response.status == "fallback"
    assert response.warnings == ["TIMEOUT"]
    assert elapsed < 0.08


@pytest.mark.anyio
async def test_pdf_semaphore_bounds_concurrent_workers() -> None:
    active = 0
    maximum = 0
    lock = threading.Lock()

    def tracked_extract(_data: bytes) -> IngestResult:
        nonlocal active, maximum
        with lock:
            active += 1
            maximum = max(maximum, active)
        time.sleep(0.03)
        with lock:
            active -= 1
        return IngestResult(text="ok", source_type="pdf")

    semaphore = asyncio.Semaphore(1)
    with patch("app.analyzer.ingest.pdf.ingest_pdf_bytes", side_effect=tracked_extract):
        await asyncio.gather(
            *(ingest_pdf_bytes_async(b"pdf", semaphore=semaphore) for _ in range(3))
        )
    assert maximum == 1


def test_pdf_limits_size_pages_and_scan_content() -> None:
    with patch("pymupdf.open") as open_pdf:
        too_large = ingest_pdf_bytes(b"x" * (MAX_PDF_BYTES + 1))
    assert too_large.warnings == [f"PDF_TOO_LARGE:{MAX_PDF_BYTES + 1}>{MAX_PDF_BYTES}"]
    open_pdf.assert_not_called()

    document = MagicMock()
    page = MagicMock()
    page.get_text.return_value = "page text"
    document.__len__.return_value = MAX_PAGES + 1
    document.__getitem__.return_value = page
    with patch("pymupdf.open", return_value=document):
        limited = ingest_pdf_bytes(b"pdf")
    assert limited.warnings == [f"PDF_TOO_MANY_PAGES:{MAX_PAGES + 1}>{MAX_PAGES}"]
    assert document.__getitem__.call_count == MAX_PAGES

    page.get_text.return_value = ""
    document.__len__.return_value = 1
    with patch("pymupdf.open", return_value=document):
        scanned = ingest_pdf_bytes(b"pdf")
    assert scanned.warnings == ["SCAN_NOT_SUPPORTED"]


def test_invalid_or_missing_intents_are_dropped() -> None:
    draft = BusinessDraft(
        offers=[OfferDraft(intent_type="unknown")],
        needs=[NeedDraft(intent_type=None)],
    )
    validated, meta, warnings = post_validate(draft, industry_catalog=_catalog())
    assert validated.offers == []
    assert validated.needs == []
    assert warnings == ["MISSING_OFFER_OR_NEED"]
    assert meta["business.intent"].needs_review is True
    assert meta["business.offers"].needs_review is True
    assert meta["business.needs"].needs_review is True


def test_valid_intent_is_kept_and_invalid_category_is_not_replaced() -> None:
    draft = BusinessDraft(
        offers=[
            OfferDraft(
                intent_type="find_buyer",
                category_l1="unknown-category",
                category_l2="retail.food",
            )
        ]
    )
    validated, meta, warnings = post_validate(draft, industry_catalog=_catalog())
    assert len(validated.offers) == 1
    assert validated.offers[0].intent_type == "find_buyer"
    assert validated.offers[0].category_l1 is None
    assert validated.offers[0].category_l2 is None
    assert meta["business.offers"].needs_review is True
    assert "MISSING_OFFER_OR_NEED" not in warnings


def test_valid_offer_and_invalid_need_are_handled_independently() -> None:
    draft = BusinessDraft(
        offers=[
            OfferDraft(
                intent_type="find_buyer",
                category_l1="manufacturing",
                category_l2="manufacturing.food",
            )
        ],
        needs=[NeedDraft(intent_type="not-real")],
    )
    validated, meta, warnings = post_validate(draft, industry_catalog=_catalog())
    assert len(validated.offers) == 1
    assert validated.needs == []
    assert meta["business.offers"].needs_review is False
    assert meta["business.needs"].needs_review is True
    assert "MISSING_OFFER_OR_NEED" not in warnings


@pytest.mark.anyio
@pytest.mark.parametrize(
    "invalid_output",
    [
        '{"industry_l1":["manufacturing"]}',
        '{"persons":[{"full_name":"Do not extract"}]}',
        '{"year_established":"not-a-year"}',
    ],
)
async def test_gemini_schema_rejects_unsafe_shapes(invalid_output: str) -> None:
    response = await _analyze(
        AnalyzeRequest(source_type="text", inline_text="evidence"),
        _fake_gemini(invalid_output),
    )
    assert response.status == "fallback"
    assert response.warnings == ["LLM_PARSE_ERROR"]


@pytest.mark.anyio
async def test_gemini_unknown_enum_still_uses_post_validation() -> None:
    response = await _analyze(
        AnalyzeRequest(source_type="text", inline_text="evidence"),
        _fake_gemini('{"name":"Acme","legal_type":"unknown"}'),
    )
    assert response.status == "completed"
    assert response.data.legal_type is None
    assert response.field_meta["business.legal_type"].needs_review is True
    assert response.data.persons == []


@pytest.mark.anyio
async def test_gemini_request_failure_has_clear_fallback() -> None:
    provider = GeminiProvider(project="test-project", timeout=0.2)
    provider._client = MagicMock()
    provider._client.aio.models.generate_content = AsyncMock(
        side_effect=RuntimeError("credentials unavailable")
    )
    response = await _analyze(
        AnalyzeRequest(source_type="text", inline_text="evidence"),
        provider,
    )
    assert response.status == "fallback"
    assert response.warnings == ["PROVIDER_UNAVAILABLE"]


@pytest.mark.parametrize(
    "url",
    ["https://user:pass@example.com", "https://example.com:8443", "http://example.com:22"],
)
def test_url_rejects_credentials_and_unusual_ports(url: str) -> None:
    with pytest.raises(SSRFError):
        _check_url(url)


@pytest.mark.anyio
@patch("app.analyzer.ingest.url._fetch_once", new_callable=AsyncMock)
@patch("socket.getaddrinfo")
async def test_url_redirect_rejects_unusual_port(mock_getaddrinfo, mock_fetch) -> None:
    mock_getaddrinfo.return_value = [(2, 1, 6, "", ("93.184.216.34", 443))]
    mock_fetch.return_value = FetchResult(
        status=302,
        headers={"location": "https://example.com:8443/private"},
        body=b"",
    )
    with pytest.raises(SSRFError, match="Blocked URL port"):
        await ingest_url("https://example.com/start")
    assert mock_fetch.await_count == 1


def test_mock_fixture_is_explicitly_non_acceptance() -> None:
    cases = load_evaluation_cases(live.MOCK_FIXTURE_PATH)
    readme = live.MOCK_FIXTURE_PATH.with_name("README.md").read_text(encoding="utf-8")
    outcome = live.EvaluationOutcome(completed=True, metrics={"overall_accuracy": 1.0})

    assert len(cases) == 2
    assert outcome.acceptance_eligible is False
    assert "not the canonical Golden Set" in readme
    assert ">= 0.85" not in inspect.getsource(live)


def test_evaluator_requires_explicit_provider() -> None:
    with pytest.raises(SystemExit):
        live.build_parser().parse_args([])


def test_evaluation_loader_fails_closed_on_invalid_json(tmp_path: Path) -> None:
    invalid = tmp_path / "invalid.jsonl"
    invalid.write_text("{not-json}\n", encoding="utf-8")
    with pytest.raises(ValueError, match="line 1"):
        load_evaluation_cases(invalid)
