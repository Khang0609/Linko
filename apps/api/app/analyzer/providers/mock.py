"""Mock LLM provider for CI — Issue #10.

Returns deterministic fake output based on input hash.
Does NOT echo golden set data.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

from app.analyzer.providers.base import LLMProvider


class MockProvider(LLMProvider):
    """Deterministic mock provider for unit tests and CI.

    Produces a stable fake output keyed by the first 8 chars of the SHA-256
    of the input text. This lets tests assert on repeatable results without
    requiring real LLM credentials.
    """

    async def extract(self, text: str) -> dict[str, Any]:
        """Return a deterministic fake extraction result."""
        digest = hashlib.sha256(text.encode()).hexdigest()[:8]

        return {
            "name": f"MockBusiness-{digest}",
            "tax_id": None,
            "legal_type": "cong_ty_tnhh_2tv",
            "business_stage": "dang_tang_truong",
            "year_established": 2020,
            "industry_l1": "san_xuat_che_bien",
            "industry_l2": "san_xuat_che_bien.che_bien_thuc_pham",
            "employee_range": "11_50",
            "revenue_range_vnd": "3_ty_10_ty",
            "city": "TP.HCM",
            "province": "TP. Hồ Chí Minh",
            "geo_operating": ["TP. Hồ Chí Minh"],
            "description": f"Mock description for input {digest}",
            "offers": [
                {
                    "intent_type": "find_buyer",
                    "title": "Mock offer",
                    "description": None,
                    "category_l1": "ban_buon_ban_le",
                    "category_l2": "ban_buon_ban_le.thuc_pham_che_bien",
                    "geo_scope": [],
                }
            ],
            "needs": [],
            "persons": [],
            "field_confidence": {
                "name": 0.95,
                "legal_type": 0.8,
                "business_stage": 0.7,
                "industry_l1": 0.9,
                "industry_l2": 0.85,
                "province": 0.95,
                "city": 0.9,
                "description": 0.8,
            },
        }


class TimeoutMockProvider(LLMProvider):
    """Mock that always times out — for testing fallback behavior."""

    async def extract(self, text: str) -> dict[str, Any]:
        import asyncio

        await asyncio.sleep(100)  # will be cancelled by timeout
        return {}  # pragma: no cover


class InvalidJsonMockProvider(LLMProvider):
    """Mock that returns invalid JSON — for testing error handling."""

    async def extract(self, text: str) -> dict[str, Any]:
        # Simulate provider returning garbage
        raw = "this is not valid json {{{{"
        return json.loads(raw)  # will raise json.JSONDecodeError
