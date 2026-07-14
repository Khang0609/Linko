"""Abstract base for LLM providers — Issue #10."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class LLMParseError(ValueError):
    """Raised when provider output cannot satisfy the extraction schema."""


class ProviderUnavailableError(RuntimeError):
    """Raised when a configured provider cannot be initialized or reached."""


class LLMProvider(ABC):
    """Interface that all LLM providers must implement."""

    available = True

    def configure_context(
        self,
        *,
        industry_catalog: str,
        intent_catalog: str,
        timeout: float,
    ) -> None:
        """Attach per-request reference context and remaining timeout budget."""
        del industry_catalog, intent_catalog, timeout

    @abstractmethod
    async def extract(self, text: str) -> dict[str, Any]:
        """Extract structured business data from text.

        Returns a dict matching the BusinessDraft + field_confidence schema.
        Raises on timeout or unrecoverable errors.
        """
        ...
