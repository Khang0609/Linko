"""Claim-check payload resolution boundary for analyzer inputs."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID


class PayloadRefUnavailableError(RuntimeError):
    """Raised when a payload reference cannot be resolved safely."""


class PayloadResolver(Protocol):
    """Resolve tenant-scoped claim-check references without exposing server paths."""

    async def resolve_text(self, ref: str, account_id: UUID) -> str: ...

    async def resolve_pdf(self, ref: str, account_id: UUID) -> bytes: ...


class DisabledPayloadResolver:
    """Runtime resolver until the object-storage contract and ownership checks exist."""

    async def resolve_text(self, ref: str, account_id: UUID) -> str:
        del ref, account_id
        raise PayloadRefUnavailableError("Text payload references are unavailable")

    async def resolve_pdf(self, ref: str, account_id: UUID) -> bytes:
        del ref, account_id
        raise PayloadRefUnavailableError("PDF payload references are unavailable")
