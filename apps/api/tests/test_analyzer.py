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

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.analyzer.ingest.pdf import ingest_pdf
from app.analyzer.ingest.text import ingest_text
from app.analyzer.ingest.url import SSRFError, ingest_url
from app.analyzer.mapping import load_industry_catalog, post_validate
from app.analyzer.providers.mock import InvalidJsonMockProvider, MockProvider, TimeoutMockProvider
from app.analyzer.schemas import AnalyzeRequest, BusinessDraft
from app.analyzer.service import run_analysis
from app.main import app
from app.models import Account
from app.security import get_current_account

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
    # Tests that loopback, private, link-local IPs are blocked
    blocked_urls = [
        "http://127.0.0.1",
        "http://localhost",
        "http://192.168.1.1",
        "http://10.0.0.1",
        "http://169.254.169.254",
    ]
    for url in blocked_urls:
        with pytest.raises(SSRFError):
            await ingest_url(url)


@pytest.mark.anyio
async def test_url_ssrf_blocked_scheme() -> None:
    with pytest.raises(SSRFError, match="Blocked scheme"):
        await ingest_url("file:///etc/passwd")


@pytest.mark.anyio
@patch("httpx.AsyncClient.get")
@patch("socket.getaddrinfo")
async def test_url_redirect_ssrf_check(mock_getaddrinfo, mock_get) -> None:
    # Conditionally mock getaddrinfo based on target host
    def mock_resolve(host, *args, **kwargs):
        if host == "example.com":
            return [(2, 1, 6, "", ("93.184.216.34", 80))]
        elif host == "127.0.0.1":
            return [(2, 1, 6, "", ("127.0.0.1", 80))]
        return []

    mock_getaddrinfo.side_effect = mock_resolve

    # Create async mock for client.get response
    mock_response = MagicMock(
        is_redirect=True,
        headers={"location": "http://127.0.0.1/private"}
    )
    async def mock_get_impl(*args, **kwargs):
        return mock_response

    mock_get.side_effect = mock_get_impl

    with pytest.raises(SSRFError):
        await ingest_url("http://example.com")


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

    with patch("pathlib.Path.is_file", return_value=True), \
         patch("pathlib.Path.stat") as mock_stat:
        mock_stat.return_value.st_size = 1000
        res = ingest_pdf("test.pdf")
        assert res.text == "Business Name: ABC"
        assert not res.warnings


@patch("pymupdf.open")
def test_pdf_ingest_scanned(mock_open) -> None:
    # Mock scanned PDF (no text layer)
    mock_doc = MagicMock()
    mock_page1 = MagicMock()
    mock_page1.get_text.return_value = ""  # no text
    mock_doc.__len__.return_value = 1
    mock_doc.__getitem__.return_value = mock_page1
    mock_open.return_value = mock_doc

    with patch("pathlib.Path.is_file", return_value=True), \
         patch("pathlib.Path.stat") as mock_stat:
        mock_stat.return_value.st_size = 1000
        res = ingest_pdf("test.pdf")
        assert res.text == ""
        assert "SCAN_NOT_SUPPORTED" in res.warnings


# ===========================================================================
# 5. Mapping & Post-Validation
# ===========================================================================

def test_mapping_post_validate_enums() -> None:
    # Set catalog mock in mapping module
    load_industry_catalog([
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

    validated, meta, warnings = post_validate(draft)

    # legal_type must be nulled and needs_review=True
    assert validated.legal_type is None
    assert meta["legal_type"].needs_review is True

    # province must be normalized to 'TP. Hồ Chí Minh' and needs_review=True (due to conversion)
    assert validated.province == "TP. Hồ Chí Minh"
    assert meta["province"].needs_review is True  # was converted

    # Industry hierarchy must be valid
    assert validated.industry_l1 == "san_xuat"
    assert validated.industry_l2 == "san_xuat.che_bien"


def test_mapping_industry_l1_l2_mismatch() -> None:
    # Load catalog where l2 belongs to a different l1
    load_industry_catalog([
        {"code": "san_xuat", "level": 1, "parent_code": None, "is_active": True},
        {"code": "ban_le", "level": 1, "parent_code": None, "is_active": True},
        {"code": "san_xuat.che_bien", "level": 2, "parent_code": "san_xuat", "is_active": True},
    ])

    draft = BusinessDraft(
        industry_l1="ban_le",  # Mismatch!
        industry_l2="san_xuat.che_bien",
    )

    validated, meta, warnings = post_validate(draft)
    assert validated.industry_l1 == "ban_le"
    assert validated.industry_l2 is None  # Nulled due to mismatch
    assert meta["industry_l2"].needs_review is True


# ===========================================================================
# 6. Service & Router Integration Tests
# ===========================================================================

@pytest.mark.anyio
async def test_run_analysis_completed() -> None:
    load_industry_catalog([
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
    response = await run_analysis(req, provider)
    assert response.status == "completed"
    assert response.data.name == "MockBusiness-48bdc533"  # deterministic mock output
    assert not response.warnings


@pytest.mark.anyio
async def test_run_analysis_timeout() -> None:
    req = AnalyzeRequest(source_type="text", inline_text="Extract this info")
    provider = TimeoutMockProvider()
    # Enforce small timeout to fail quickly
    response = await run_analysis(req, provider, timeout=0.1)
    assert response.status == "fallback"
    assert "TIMEOUT" in response.warnings


@pytest.mark.anyio
async def test_run_analysis_invalid_json() -> None:
    req = AnalyzeRequest(source_type="text", inline_text="Extract this info")
    provider = InvalidJsonMockProvider()
    response = await run_analysis(req, provider)
    assert response.status == "fallback"
    assert "LLM_INVALID_JSON" in response.warnings


# ===========================================================================
# 7. Endpoint & Authentication (Integration tests hitting real client)
# ===========================================================================

def test_analyze_unauthorized(test_client: TestClient) -> None:
    response = test_client.post(
        "/api/v1/analyze",
        json={"source_type": "text", "inline_text": "Sample text"},
    )
    assert response.status_code == 401


@patch("app.analyzer.router._fetch_reference_data", new_callable=AsyncMock)
def test_analyze_success(mock_fetch, test_client: TestClient) -> None:
    # 1. Setup mock reference data return
    mock_fetch.return_value = (
        "- san_xuat_che_bien: Sản xuất chế biến",
        "- find_buyer: Tìm người mua (complementarity)",
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
    )

    # 2. Setup mock account auth dependency override
    mock_account = Account(
        id="00000000-0000-0000-0000-000000000000",
        email="test@example.com",
        is_active=True
    )
    app.dependency_overrides[get_current_account] = lambda: mock_account

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
    finally:
        # Clean up dependency override
        app.dependency_overrides.pop(get_current_account, None)
