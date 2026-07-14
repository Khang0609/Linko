"""FastAPI dependencies for analyzer runtime adapters."""

from __future__ import annotations

from app.analyzer.payloads import DisabledPayloadResolver, PayloadResolver
from app.analyzer.providers.base import LLMProvider
from app.analyzer.providers.disabled import DisabledProvider
from app.analyzer.providers.gemini import GeminiProvider
from app.config import settings


def get_analyzer_provider() -> LLMProvider:
    """Select an explicitly configured runtime provider without mock fallback."""
    if settings.analyzer_provider != "gemini" or not settings.gemini_project:
        return DisabledProvider()
    return GeminiProvider(
        project=settings.gemini_project,
        region=settings.gemini_region,
        model=settings.gemini_model,
        timeout=settings.analyzer_provider_timeout_seconds,
    )


def get_payload_resolver() -> PayloadResolver:
    """Return the safe disabled adapter until object storage is specified."""
    return DisabledPayloadResolver()
