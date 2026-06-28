from __future__ import annotations

from collections.abc import Generator
from copy import deepcopy
from typing import Any

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
