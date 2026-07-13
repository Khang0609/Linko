"""Tests for the Matching Engine (M2) — Issue #10.

Tests all aspects of:
- Profile text serialization
- Mock embedding generation
- Endpoint authorization & tenant isolation (401, 403)
- Similarity recommendation query returns matching scores
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.matching.service import _generate_mock_embedding, generate_profile_text
from app.models import Account, Business, Offer
from app.security import get_current_account


def test_generate_mock_embedding() -> None:
    text = "Hello world from matching engine tests"
    vec1 = _generate_mock_embedding(text)
    vec2 = _generate_mock_embedding(text)
    vec3 = _generate_mock_embedding("Different text")

    # Length must be exactly 768
    assert len(vec1) == 768
    assert all(isinstance(x, float) for x in vec1)
    # Output must be deterministic
    assert vec1 == vec2
    # Output for different inputs must differ
    assert vec1 != vec3


@pytest.mark.anyio
async def test_generate_profile_text() -> None:
    # Setup mock business and offers
    business = Business(
        name="Test Business",
        description="A test description of business activities.",
        industry_l1="san_xuat_che_bien",
        industry_l2="san_xuat_che_bien.che_bien_thuc_pham",
    )
    business.offers = [
        Offer(title="Offer A", description="Description A", is_active=True),
        Offer(title="Offer B", description="Description B", is_active=False),  # inactive -> ignored
    ]
    business.needs = []

    # Mock the database scalar query
    mock_execute = MagicMock()
    mock_execute.scalar_one_or_none.return_value = business
    mock_session = AsyncMock()
    mock_session.execute.return_value = mock_execute

    with patch("app.matching.service.select"):
        profile_text = await generate_profile_text(mock_session, business.id)

    assert "Name: Test Business" in profile_text
    assert "Description: A test description of business activities." in profile_text
    assert "Industry L1: san_xuat_che_bien" in profile_text
    assert "Industry L2: san_xuat_che_bien.che_bien_thuc_pham" in profile_text
    assert "Offer: Offer A. Description A" in profile_text
    assert "Offer: Offer B" not in profile_text  # inactive offer should be filtered out


# ===========================================================================
# Endpoint & Authentication (Integration tests hitting real client)
# ===========================================================================


def test_matching_unauthorized(test_client: TestClient) -> None:
    response = test_client.get(
        "/api/v1/matching",
        params={"company_id": "00000000-0000-0000-0000-000000000000"},
    )
    assert response.status_code == 401


@patch("app.matching.router.require_existing_business_access", new_callable=AsyncMock)
def test_matching_forbidden(mock_require, test_client: TestClient) -> None:
    # 1. Mock require_existing_business_access to raise AuthorizationError (403)
    from app.exceptions import AuthorizationError
    mock_require.side_effect = AuthorizationError("Forbidden access.")

    # 2. Setup mock account auth dependency override
    mock_account = Account(
        id="00000000-0000-0000-0000-000000000000",
        email="test@example.com",
        is_active=True
    )
    app.dependency_overrides[get_current_account] = lambda: mock_account

    try:
        response = test_client.get(
            "/api/v1/matching",
            params={"company_id": "00000000-0000-0000-0000-000000000000"},
            headers={"Authorization": "Bearer test-token"},
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_account, None)


@patch("app.matching.router.require_existing_business_access", new_callable=AsyncMock)
@patch("app.matching.router.get_top_matches", new_callable=AsyncMock)
def test_matching_success(mock_get_matches, mock_require, test_client: TestClient) -> None:
    # 1. Setup mock match results
    mock_get_matches.return_value = [
        {
            "business_id": "11111111-1111-1111-1111-111111111111",
            "name": "Matched Business Ltd",
            "industry_l1": "san_xuat_che_bien",
            "industry_l2": "san_xuat_che_bien.che_bien_thuc_pham",
            "province": "TP. Hồ Chí Minh",
            "score": 0.8972,
        }
    ]

    # 2. Setup mock account auth dependency override
    mock_account = Account(
        id="00000000-0000-0000-0000-000000000000",
        email="test@example.com",
        is_active=True
    )
    app.dependency_overrides[get_current_account] = lambda: mock_account

    try:
        response = test_client.get(
            "/api/v1/matching",
            params={"company_id": "00000000-0000-0000-0000-000000000000", "limit": 5},
            headers={"Authorization": "Bearer test-token"},
        )
        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["business_id"] == "11111111-1111-1111-1111-111111111111"
        assert body[0]["name"] == "Matched Business Ltd"
        assert body[0]["score"] == 0.8972
    finally:
        app.dependency_overrides.pop(get_current_account, None)
