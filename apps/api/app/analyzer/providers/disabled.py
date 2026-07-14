"""Disabled analyzer provider used when runtime extraction is not configured."""

from __future__ import annotations

from typing import Any

from app.analyzer.providers.base import LLMProvider, ProviderUnavailableError


class DisabledProvider(LLMProvider):
    """Non-extracting provider that prevents synthetic runtime responses."""

    available = False

    async def extract(self, text: str) -> dict[str, Any]:
        del text
        raise ProviderUnavailableError("Analyzer provider is not configured")
