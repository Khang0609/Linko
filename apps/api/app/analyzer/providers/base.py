"""Abstract base for LLM providers — Issue #10."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class LLMProvider(ABC):
    """Interface that all LLM providers must implement."""

    @abstractmethod
    async def extract(self, text: str) -> dict[str, Any]:
        """Extract structured business data from text.

        Returns a dict matching the BusinessDraft + field_confidence schema.
        Raises on timeout or unrecoverable errors.
        """
        ...
