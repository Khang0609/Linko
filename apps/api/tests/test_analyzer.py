"""Tests for the Smart Business Analyzer — Issue #10.

Tests all aspects of:
- Schemas & request validation
- Ingestion pipeline (text, url, pdf)
- SSRF security guardrails
- LLM Provider error handling (timeout, invalid JSON)
- Mapping & post-validation (L1/L2 hierarchy, province)
- Endpoint auth and latency budget
"""

from __future__ import annotations

import asyncio
import ipaddress
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import httpcore
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.analyzer.dependencies import get_analyzer_provider
from app.analyzer.ingest.pdf import ingest_pdf_bytes
from app.analyzer.ingest.text import ingest_text
from app.analyzer.ingest.url import (
    MAX_BODY_BYTES,
    FetchResult,
    PinnedNetworkBackend,
    SSRFError,
    _fetch_once,
    _is_blocked_ip,
    ingest_url,
)
from app.analyzer.mapping import build_industry_catalog, post_validate
from app.analyzer.payloads import DisabledPayloadResolver
from app.analyzer.providers.gemini import GeminiProvider
from app.analyzer.providers.mock import InvalidJsonMockProvider, MockProvider, TimeoutMockProvider
from app.analyzer.router import ReferenceCatalog, _get_reference_data, clear_reference_cache
from app.analyzer.schemas import AnalyzeRequest, BusinessDraft
from app.analyzer.service import run_analysis
from app.config import settings
from app.main import app
from app.models import Account
from app.security import get_current_account

_ACCOUNT_ID = UUID(int=0)


def _industry_catalog():
    return build_industry_catalog(
        [
            {"code": "san_xuat", "level": 1, "parent_code": None, "is_active": True},
            {
                "code": "san_xuat.che_bien",
                "level": 2,
                "parent_code": "san_xuat",
                "is_active": True,
            },
            {"code": "ban_le", "level": 1, "parent_code": None, "is_active": True},
        ]
    )

# ===========================================================================
# 1. Schemas & Request Validator Tests
# ===========================================================================

def test_request_validator_text() -> None:
    # Must have exactly one of inline_text or payload_ref
    with pytest.raises(ValueError, match="source_type='text' requires exactly one"):
        AnalyzeRequest(source_type="text")

    with pytest.raises(ValueError, match="source_type='text' requires exactly one"):
        AnalyzeRequest(source_type="text", inline_text="foo", payload_ref="bar")

    req1 = AnalyzeRequest(source_type="text", inline_text="hello")
    assert req1.inline_text == "hello"

    req2 = AnalyzeRequest(source_type="text", payload_ref="my-ref")
    assert req2.payload_ref == "my-ref"


def test_request_validator_url_pdf() -> None:
    with pytest.raises(ValueError, match="requires payload_ref"):
        AnalyzeRequest(source_type="url")

    with pytest.raises(ValueError, match="requires payload_ref"):
        AnalyzeRequest(source_type="pdf")

    req_url = AnalyzeRequest(source_type="url", payload_ref="http://example.com")
    assert req_url.payload_ref == "http://example.com"


# ===========================================================================
# 2. Ingest Pipeline: Text
# ===========================================================================

def test_text_ingest_basic() -> None:
    res = ingest_text(inline_text="Hello world")
    assert res.text == "Hello world"
    assert not res.warnings

    res_empty = ingest_text()
    assert res_empty.is_empty
    assert "EMPTY_TEXT_INPUT" in res_empty.warnings


def test_text_ingest_truncation() -> None:
    long_text = "a" * 25000
    res = ingest_text(inline_text=long_text)
    assert len(res.text) == 20000
    assert "TEXT_TRUNCATED" in res.warnings[0]


# ===========================================================================
# 3. Ingest Pipeline: URL & SSRF Guard
# ===========================================================================

@pytest.mark.anyio
async def test_url_ssrf_blocked_ips() -> None:
    blocked_urls = [
        "http://0.0.0.0",
        "http://127.0.0.1",
        "http://localhost",
        "http://192.168.1.1",
        "http://10.0.0.1",
        "http://169.254.169.254",
        "http://[::1]",
        "http://[::]",
    ]
    for url in blocked_urls:
        with pytest.raises(SSRFError):
            await ingest_url(url)


@pytest.mark.anyio
async def test_url_ssrf_blocked_scheme() -> None:
    with pytest.raises(SSRFError, match="Blocked scheme"):
        await ingest_url("file:///etc/passwd")


@pytest.mark.parametrize(
    "address",
    ["0.0.0.0", "127.0.0.1", "169.254.1.1", "192.168.1.1", "240.0.0.1", "::", "::1", "fe80::1", "fc00::1"],
)
def test_url_blocks_non_public_address_classes(address: str) -> None:
    assert _is_blocked_ip(ipaddress.ip_address(address))


@pytest.mark.anyio
async def test_url_transport_connects_to_validated_ip() -> None:
    class RecordingBackend:
        connected_host: str | None = None

        async def connect_tcp(self, host, _port, **_kwargs):
            self.connected_host = host
            return MagicMock()

    backend = PinnedNetworkBackend("93.184.216.34")
    recording_backend = RecordingBackend()
    backend._backend = recording_backend

    await backend.connect_tcp("example.com", 443)

    assert recording_backend.connected_host == "93.184.216.34"


@pytest.mark.anyio
@patch("app.analyzer.ingest.url._fetch_once", new_callable=AsyncMock)
@patch("socket.getaddrinfo")
async def test_url_redirect_ssrf_check(mock_getaddrinfo, mock_fetch) -> None:
    def mock_resolve(host, *args, **kwargs):
        if host == "example.com":
            return [(2, 1, 6, "", ("93.184.216.34", 80))]
        if host == "127.0.0.1":
            return [(2, 1, 6, "", ("127.0.0.1", 80))]
        return []

    mock_getaddrinfo.side_effect = mock_resolve
    mock_fetch.return_value = FetchResult(
        status=302,
        headers={"location": "http://127.0.0.1/private"},
        body=b"",
    )

    with pytest.raises(SSRFError):
        await ingest_url("http://example.com")


@pytest.mark.anyio
@patch("app.analyzer.ingest.url._fetch_once", new_callable=AsyncMock)
@patch("socket.getaddrinfo")
async def test_url_relative_redirect_is_joined_and_revalidated(
    mock_getaddrinfo,
    mock_fetch,
) -> None:
    mock_getaddrinfo.return_value = [(2, 1, 6, "", ("93.184.216.34", 80))]
    mock_fetch.side_effect = [
        FetchResult(status=302, headers={"location": "/about"}, body=b""),
        FetchResult(
            status=200,
            headers={"content-type": "text/plain"},
            body=b"Business profile",
        ),
    ]

    result = await ingest_url("https://example.com/start")

    assert result.text == "Business profile"
    assert mock_fetch.await_args_list[1].args == (
        "https://example.com/about",
        "93.184.216.34",
    )
    assert mock_getaddrinfo.call_count == 2


@pytest.mark.anyio
async def test_url_stream_stops_above_byte_limit() -> None:
    backend = httpcore.AsyncMockBackend(
        [
            b"HTTP/1.1 200 OK\r\n",
            b"Content-Type: text/plain\r\n",
            b"\r\n",
            b"a" * MAX_BODY_BYTES,
            b"b",
        ]
    )

    result = await _fetch_once(
        "http://example.com",
        "93.184.216.34",
        network_backend=backend,
    )

    assert result.too_large is True
    assert result.body == b""


@pytest.mark.anyio
@patch("app.analyzer.ingest.url._fetch_once", new_callable=AsyncMock)
@patch("socket.getaddrinfo")
async def test_url_rejects_http_errors_and_binary_content(
    mock_getaddrinfo,
    mock_fetch,
) -> None:
    mock_getaddrinfo.return_value = [(2, 1, 6, "", ("93.184.216.34", 80))]
    mock_fetch.return_value = FetchResult(
        status=404,
        headers={"content-type": "text/html"},
        body=b"not found",
    )
    result = await ingest_url("https://example.com/missing")
    assert result.warnings == ["URL_HTTP_ERROR:404"]

    mock_fetch.return_value = FetchResult(
        status=200,
        headers={"content-type": "application/octet-stream"},
        body=b"binary",
    )
    result = await ingest_url("https://example.com/file")
    assert result.warnings == ["UNSUPPORTED_CONTENT_TYPE:application/octet-stream"]


# ===========================================================================
# 4. Ingest Pipeline: PDF (PyMuPDF)
# ===========================================================================

@patch("pymupdf.open")
def test_pdf_ingest_born_digital(mock_open) -> None:
    # Mock born-digital PDF with text
    mock_doc = MagicMock()
    mock_page1 = MagicMock()
    mock_page1.get_text.return_value = "Business Name: ABC"
    mock_doc.__len__.return_value = 1
    mock_doc.__getitem__.return_value = mock_page1
    mock_open.return_value = mock_doc

    res = ingest_pdf_bytes(b"pdf-content")
    assert res.text == "Business Name: ABC"
    assert not res.warnings
    mock_open.assert_called_once_with(stream=b"pdf-content", filetype="pdf")


@patch("pymupdf.open")
def test_pdf_ingest_scanned(mock_open) -> None:
    # Mock scanned PDF (no text layer)
    mock_doc = MagicMock()
    mock_page1 = MagicMock()
    mock_page1.get_text.return_value = ""  # no text
    mock_doc.__len__.return_value = 1
    mock_doc.__getitem__.return_value = mock_page1
    mock_open.return_value = mock_doc

    res = ingest_pdf_bytes(b"pdf-content")
    assert res.text == ""
    assert "SCAN_NOT_SUPPORTED" in res.warnings


# ===========================================================================
# 5. Mapping & Post-Validation
# ===========================================================================

def test_mapping_post_validate_enums() -> None:
    catalog = build_industry_catalog([
        {"code": "san_xuat", "level": 1, "parent_code": None, "is_active": True},
        {"code": "san_xuat.che_bien", "level": 2, "parent_code": "san_xuat", "is_active": True},
    ])

    draft = BusinessDraft(
        name="Test Co",
        legal_type="invalid_type",  # unknown enum value
        industry_l1="san_xuat",
        industry_l2="san_xuat.che_bien",
        province="Bình Dương",      # will be normalized to TP. Hồ Chí Minh
    )

    validated, meta, warnings = post_validate(draft, industry_catalog=catalog)

    # legal_type must be nulled and needs_review=True
    assert validated.legal_type is None
    assert meta["business.legal_type"].needs_review is True

    # province must be normalized to 'TP. Hồ Chí Minh' and needs_review=True (due to conversion)
    assert validated.province == "TP. Hồ Chí Minh"
    assert meta["business.province"].needs_review is True  # was converted

    # Industry hierarchy must be valid
    assert validated.industry_l1 == "san_xuat"
    assert validated.industry_l2 == "san_xuat.che_bien"


def test_mapping_industry_l1_l2_mismatch() -> None:
    catalog = build_industry_catalog([
        {"code": "san_xuat", "level": 1, "parent_code": None, "is_active": True},
        {"code": "ban_le", "level": 1, "parent_code": None, "is_active": True},
        {"code": "san_xuat.che_bien", "level": 2, "parent_code": "san_xuat", "is_active": True},
    ])

    draft = BusinessDraft(
        industry_l1="ban_le",  # Mismatch!
        industry_l2="san_xuat.che_bien",
    )

    validated, meta, warnings = post_validate(draft, industry_catalog=catalog)
    assert validated.industry_l1 == "ban_le"
    assert validated.industry_l2 is None  # Nulled due to mismatch
    assert meta["business.industry_l2"].needs_review is True

def test_mapping_industry_array_fails() -> None:
    with pytest.raises(ValidationError):
        BusinessDraft(
            industry_l1=["san_xuat", "another"],
            industry_l2=["san_xuat.che_bien"],
        )


def test_mapping_l2_requires_valid_l1() -> None:
    draft = BusinessDraft(industry_l1=None, industry_l2="san_xuat.che_bien")

    validated, meta, _warnings = post_validate(
        draft,
        industry_catalog=_industry_catalog(),
    )

    assert validated.industry_l1 is None
    assert validated.industry_l2 is None
    assert meta["business.industry_l2"].needs_review is True


def test_mapping_empty_intents_needs_review() -> None:
    # A7: If offers/needs are empty (no intent), needs_review=True is set for intent fields
    draft = BusinessDraft(
        offers=[],
        needs=[],
    )

    validated, meta, warnings = post_validate(
        draft,
        industry_catalog=_industry_catalog(),
    )
    assert not validated.offers
    assert not validated.needs
    assert meta["business.intent"].needs_review is True
    assert meta["business.offers"].needs_review is True
    assert meta["business.needs"].needs_review is True
    assert "MISSING_OFFER_OR_NEED" in warnings


def test_mapping_unknown_item_enum_is_dropped_and_reviewed() -> None:
    from app.analyzer.schemas import OfferDraft

    draft = BusinessDraft(
        offers=[OfferDraft(intent_type="unknown_intent")],
        persons=[],
    )

    validated, meta, _warnings = post_validate(
        draft,
        industry_catalog=_industry_catalog(),
    )

    assert validated.offers == []
    assert meta["business.offers"].needs_review is True
    assert "MISSING_OFFER_OR_NEED" in _warnings


def test_persons_is_fixed_empty_in_v01() -> None:
    with pytest.raises(ValidationError):
        BusinessDraft(persons=[{"full_name": "Should not be extracted"}])


def test_scorer_codex_rules() -> None:
    from app.analyzer.eval.score import normalize_val, score_case
    from app.analyzer.schemas import OfferDraft

    # A8: parentheticals stripping
    assert normalize_val("intent (không nêu rõ)") == "intent"
    assert normalize_val("tax_id (không có)") == "tax_id"

    # A8: excludes industry_l2 when industry_l2_applicable is false
    actual = BusinessDraft(
        name="Test",
        industry_l2="something",  # actual has l2
    )
    expected = {
        "name": "Test",
        "industry_l2": "different",
        "industry_l2_applicable": False,  # should be excluded
    }
    results = score_case(actual, expected)
    assert "name" in results
    assert "industry_l2" not in results  # excluded!

    # A8: maps "intent (...)" -> "intent_types"
    actual_with_intents = BusinessDraft(
        offers=[OfferDraft(intent_type="find_buyer")],
    )
    expected_with_intent_key = {
        "intent (không nêu rõ)": ["find_buyer"],
    }
    results_intent = score_case(actual_with_intents, expected_with_intent_key)
    assert results_intent["intent_types"] is True

    # A9: scorer FAILS if prediction is an array/list
    actual_array_l2 = BusinessDraft.model_construct(
        industry_l2=["some_industry", "another"],
        offers=[],
        needs=[],
        persons=[],
    )
    expected_l2 = {
        "industry_l2": "some_industry",
    }
    results_l2 = score_case(actual_array_l2, expected_l2)
    assert results_l2["industry_l2"] is False


# ===========================================================================
# 6. Service & Router Integration Tests
# ===========================================================================

@pytest.mark.anyio
async def test_gemini_provider_uses_async_client_without_network() -> None:
    provider = GeminiProvider(timeout=0.1)
    generate_content = AsyncMock(return_value=SimpleNamespace(text='{"name":"Acme"}'))
    provider._client = MagicMock()
    provider._client.aio.models.generate_content = generate_content

    result = await provider.extract("Business profile")

    assert result["name"] == "Acme"
    assert result["persons"] == []
    generate_content.assert_awaited_once()
    config = generate_content.await_args.kwargs["config"]
    assert config.response_mime_type == "application/json"
    assert config.response_schema is not None


@pytest.mark.anyio
async def test_run_analysis_completed() -> None:
    catalog = build_industry_catalog([
        {"code": "san_xuat_che_bien", "level": 1, "parent_code": None, "is_active": True},
        {
            "code": "san_xuat_che_bien.che_bien_thuc_pham",
            "level": 2,
            "parent_code": "san_xuat_che_bien",
            "is_active": True,
        },
        {"code": "ban_buon_ban_le", "level": 1, "parent_code": None, "is_active": True},
        {
            "code": "ban_buon_ban_le.thuc_pham_che_bien",
            "level": 2,
            "parent_code": "ban_buon_ban_le",
            "is_active": True,
        },
    ])
    req = AnalyzeRequest(source_type="text", inline_text="Extract this info")
    provider = MockProvider()
    response = await run_analysis(
        req,
        provider,
        industry_catalog=catalog,
        payload_resolver=DisabledPayloadResolver(),
        account_id=_ACCOUNT_ID,
    )
    assert response.status == "completed"
    assert response.data.name == "MockBusiness-48bdc533"  # deterministic mock output
    assert not response.warnings


@pytest.mark.anyio
async def test_run_analysis_timeout() -> None:
    req = AnalyzeRequest(source_type="text", inline_text="Extract this info")
    provider = TimeoutMockProvider()
    # Enforce small timeout to fail quickly
    response = await run_analysis(
        req,
        provider,
        industry_catalog=_industry_catalog(),
        payload_resolver=DisabledPayloadResolver(),
        account_id=_ACCOUNT_ID,
        timeout=0.1,
    )
    assert response.status == "fallback"
    assert "TIMEOUT" in response.warnings


@pytest.mark.anyio
async def test_url_dns_lookup_obeys_analysis_deadline() -> None:
    async def slow_resolve(*_args):
        await asyncio.sleep(0.05)
        return ("93.184.216.34",)

    request = AnalyzeRequest(source_type="url", payload_ref="https://example.com")
    with patch(
        "app.analyzer.ingest.url._resolve_and_check",
        new_callable=AsyncMock,
        side_effect=slow_resolve,
    ):
        response = await run_analysis(
            request,
            MockProvider(),
            industry_catalog=_industry_catalog(),
            payload_resolver=DisabledPayloadResolver(),
            account_id=_ACCOUNT_ID,
            timeout=0.01,
        )

    assert response.status == "fallback"
    assert "TIMEOUT" in response.warnings


@pytest.mark.anyio
async def test_run_analysis_invalid_json() -> None:
    req = AnalyzeRequest(source_type="text", inline_text="Extract this info")
    provider = InvalidJsonMockProvider()
    response = await run_analysis(
        req,
        provider,
        industry_catalog=_industry_catalog(),
        payload_resolver=DisabledPayloadResolver(),
        account_id=_ACCOUNT_ID,
    )
    assert response.status == "fallback"
    assert "LLM_INVALID_JSON" in response.warnings


# ===========================================================================
# 7. Endpoint & Authentication (Integration tests hitting real client)
# ===========================================================================

@pytest.mark.anyio
async def test_reference_catalog_is_cached() -> None:
    expected = ReferenceCatalog(
        industry_prompt="industries",
        intent_prompt="intents",
        industries=_industry_catalog(),
    )
    clear_reference_cache()
    with patch(
        "app.analyzer.router._fetch_reference_data",
        new_callable=AsyncMock,
        return_value=expected,
    ) as fetch:
        first = await _get_reference_data(MagicMock())
        second = await _get_reference_data(MagicMock())

    assert first is expected
    assert second is expected
    assert fetch.await_count == 1
    clear_reference_cache()


def test_analyze_unauthorized(test_client: TestClient) -> None:
    response = test_client.post(
        "/api/v1/analyze",
        json={"source_type": "text", "inline_text": "Sample text"},
    )
    assert response.status_code == 401


@patch("app.analyzer.router._fetch_reference_data", new_callable=AsyncMock)
def test_analyze_success(mock_fetch, test_client: TestClient) -> None:
    clear_reference_cache()
    mock_fetch.return_value = ReferenceCatalog(
        industry_prompt="- san_xuat_che_bien: manufacturing",
        intent_prompt="- find_buyer: buyer search",
        industries=build_industry_catalog(
            [
            {"code": "san_xuat_che_bien", "level": 1, "parent_code": None, "is_active": True},
            {
                "code": "san_xuat_che_bien.che_bien_thuc_pham",
                "level": 2,
                "parent_code": "san_xuat_che_bien",
                "is_active": True,
            },
            {"code": "ban_buon_ban_le", "level": 1, "parent_code": None, "is_active": True},
            {
                "code": "ban_buon_ban_le.thuc_pham_che_bien",
                "level": 2,
                "parent_code": "ban_buon_ban_le",
                "is_active": True,
            },
            ]
        ),
    )

    # 2. Setup mock account auth dependency override
    mock_account = Account(
        id="00000000-0000-0000-0000-000000000000",
        email="test@example.com",
        is_active=True
    )
    app.dependency_overrides[get_current_account] = lambda: mock_account
    app.dependency_overrides[get_analyzer_provider] = MockProvider

    try:
        response = test_client.post(
            "/api/v1/analyze",
            json={"source_type": "text", "inline_text": "Extract this info"},
            headers={"Authorization": "Bearer test-token"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "completed"
        assert "name" in body["data"]
        assert body["data"]["province"] == "TP. Hồ Chí Minh"
        assert all(key.startswith("business.") for key in body["field_meta"])
    finally:
        clear_reference_cache()
        app.dependency_overrides.pop(get_current_account, None)
        app.dependency_overrides.pop(get_analyzer_provider, None)


@patch("app.analyzer.router._fetch_reference_data", new_callable=AsyncMock)
def test_reference_timeout_returns_fallback(mock_fetch, test_client: TestClient) -> None:
    async def slow_fetch(_session):
        await asyncio.sleep(0.05)
        return ReferenceCatalog("", "", _industry_catalog())

    mock_fetch.side_effect = slow_fetch
    mock_account = Account(
        id="00000000-0000-0000-0000-000000000000",
        email="test@example.com",
        is_active=True,
    )
    app.dependency_overrides[get_current_account] = lambda: mock_account
    app.dependency_overrides[get_analyzer_provider] = MockProvider
    clear_reference_cache()

    try:
        with patch.object(settings, "analyzer_timeout_seconds", 0.01):
            response = test_client.post(
                "/api/v1/analyze",
                json={"source_type": "text", "inline_text": "Extract this info"},
                headers={"Authorization": "Bearer test-token"},
            )
        assert response.status_code == 200
        assert response.json()["status"] == "fallback"
        assert "TIMEOUT" in response.json()["warnings"]
    finally:
        clear_reference_cache()
        app.dependency_overrides.pop(get_current_account, None)
        app.dependency_overrides.pop(get_analyzer_provider, None)
