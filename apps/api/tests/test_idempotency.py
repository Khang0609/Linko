from __future__ import annotations

from datetime import UTC, datetime, timedelta

from core.idempotency import hash_payload, is_expired


def test_hash_same_payload() -> None:
    left = {"name": "A", "offers": [{"title": "One"}]}
    right = {"offers": [{"title": "One"}], "name": "A"}

    assert hash_payload(left) == hash_payload(right)


def test_hash_different_payload() -> None:
    assert hash_payload({"name": "A"}) != hash_payload({"name": "B"})


def test_ttl_expiry() -> None:
    now = datetime(2026, 6, 27, 12, tzinfo=UTC)

    assert is_expired(now - timedelta(seconds=1), now)
    assert not is_expired(now + timedelta(seconds=1), now)
