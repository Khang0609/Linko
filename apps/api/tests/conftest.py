from __future__ import annotations

import os
from collections.abc import Generator
from copy import deepcopy
from typing import Any

os.environ.setdefault("JWT_SECRET", "test-only-jwt-secret-with-32-characters")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.config import settings
from app.main import app

_sync_engine = create_engine(settings.alembic_database_url)
_TRUNCATE_SQL = """
TRUNCATE TABLE
    match_interactions,
    offers,
    needs,
    business_persons,
    accounts,
    businesses,
    persons,
    idempotency_keys
RESTART IDENTITY CASCADE
"""


@pytest.fixture(scope="session")
def test_client() -> Generator[TestClient, None, None]:
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


@pytest.fixture
def clean_db() -> Generator[None, None, None]:
    with _sync_engine.begin() as connection:
        connection.execute(text(_TRUNCATE_SQL))
    yield
    with _sync_engine.begin() as connection:
        connection.execute(text(_TRUNCATE_SQL))


@pytest.fixture
def signup_account(test_client: TestClient):
    counter = 0

    def _signup(email: str | None = None, password: str = "Password123!") -> dict[str, Any]:
        nonlocal counter
        counter += 1
        account_email = email or f"user{counter}@example.com"
        response = test_client.post(
            "/api/v1/auth/signup",
            json={"email": account_email, "password": password},
        )
        assert response.status_code == 201, response.text
        body = response.json()
        return {
            "account_id": body["account_id"],
            "token": body["access_token"],
            "headers": {"Authorization": f"Bearer {body['access_token']}"},
            "email": account_email.strip().lower(),
            "password": password,
        }

    return _signup


@pytest.fixture
def auth_headers(clean_db: None, signup_account) -> dict[str, str]:
    return signup_account()["headers"]


@pytest.fixture
def sample_business_payload() -> dict[str, Any]:
    return deepcopy(
        {
            "name": "Công ty TNHH Thực phẩm Nam Phúc",
            "legal_type": "cong_ty_tnhh_2tv",
            "business_stage": "dang_tang_truong",
            "year_established": 2019,
            "industry_l1": "san_xuat_che_bien",
            "industry_l2": "san_xuat_che_bien.che_bien_thuc_pham",
            "employee_range": "11_50",
            "revenue_range_vnd": "3_ty_10_ty",
            "city": "TP.HCM",
            "province": "TP. Hồ Chí Minh",
            "geo_operating": ["TP. Hồ Chí Minh"],
            "description": "Chuyên sản xuất nước mắm truyền thống",
            "offers": [
                {
                    "intent_type": "find_buyer",
                    "category_l1": "ban_buon_ban_le",
                    "category_l2": "ban_buon_ban_le.gia_vi_nuoc_cham",
                    "geo_scope": ["TP. Hồ Chí Minh"],
                    "title": "Bán sỉ nước mắm truyền thống",
                    "structured_attrs": {
                        "product_category": "gia_vi_nuoc_cham",
                        "moq": {"value": 50, "unit": "thung"},
                    },
                }
            ],
            "needs": [],
            "persons": [{"full_name": "Nguyễn Văn Nam", "phone": "0901234567", "role": "owner"}],
        }
    )
