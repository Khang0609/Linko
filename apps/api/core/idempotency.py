from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any

from fastapi import Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True, slots=True)
class CachedIdempotencyResponse:
    status_code: int
    body: dict[str, Any]


@dataclass(frozen=True, slots=True)
class IdempotencyLookup:
    is_new: bool
    cached_response: CachedIdempotencyResponse | None = None
    payload_mismatch: bool = False
    in_progress: bool = False


def hash_payload(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)
    return sha256(canonical.encode("utf-8")).hexdigest()


def is_expired(expires_at: datetime, now: datetime | None = None) -> bool:
    current = now or datetime.now(UTC)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    return expires_at <= current


def get_idempotency_key(request: Request) -> str | None:
    key = request.headers.get("Idempotency-Key")
    if key is None:
        return None
    key = key.strip()
    return key or None


class IdempotencyManager:
    def __init__(self, ttl_seconds: int) -> None:
        self.ttl_seconds = ttl_seconds

    async def get_or_create(self, session: AsyncSession, key: str, payload_hash: str) -> IdempotencyLookup:
        expires_at = datetime.now(UTC) + timedelta(seconds=self.ttl_seconds)
        inserted = await session.execute(
            text(
                """
                INSERT INTO idempotency_keys (key, payload_hash, expires_at)
                VALUES (:key, :payload_hash, :expires_at)
                ON CONFLICT (key) DO NOTHING
                RETURNING key
                """
            ),
            {"key": key, "payload_hash": payload_hash, "expires_at": expires_at},
        )
        if inserted.scalar_one_or_none() is not None:
            return IdempotencyLookup(is_new=True)

        row = (
            await session.execute(
                text(
                    """
                    SELECT payload_hash, response_status, response_body, expires_at
                    FROM idempotency_keys
                    WHERE key = :key
                    FOR UPDATE
                    """
                ),
                {"key": key},
            )
        ).mappings().one()

        if is_expired(row["expires_at"]):
            await session.execute(
                text(
                    """
                    UPDATE idempotency_keys
                    SET payload_hash = :payload_hash,
                        response_status = NULL,
                        response_body = NULL,
                        expires_at = :expires_at
                    WHERE key = :key
                    """
                ),
                {"key": key, "payload_hash": payload_hash, "expires_at": expires_at},
            )
            return IdempotencyLookup(is_new=True)

        if row["payload_hash"] != payload_hash:
            return IdempotencyLookup(is_new=False, payload_mismatch=True)

        if row["response_status"] is None or row["response_body"] is None:
            return IdempotencyLookup(is_new=False, in_progress=True)

        return IdempotencyLookup(
            is_new=False,
            cached_response=CachedIdempotencyResponse(
                status_code=row["response_status"],
                body=row["response_body"],
            ),
        )

    async def store_response(self, session: AsyncSession, key: str, status_code: int, body: dict[str, Any]) -> None:
        await session.execute(
            text(
                """
                UPDATE idempotency_keys
                SET response_status = :status_code,
                    response_body = CAST(:body AS jsonb)
                WHERE key = :key
                """
            ),
            {"key": key, "status_code": status_code, "body": json.dumps(body, ensure_ascii=False)},
        )
