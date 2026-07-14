"""Plain-text ingestion — Issue #10."""

from __future__ import annotations

from app.analyzer.ingest.base import IngestResult

MAX_TEXT_CHARS = 20_000


def ingest_text(*, inline_text: str | None = None) -> IngestResult:
    """Normalize inline text after any external reference has been resolved."""
    raw = (inline_text or "").strip()
    warnings: list[str] = []

    if not raw:
        return IngestResult(text="", source_type="text", warnings=["EMPTY_TEXT_INPUT"])

    if len(raw) > MAX_TEXT_CHARS:
        warnings.append(f"TEXT_TRUNCATED:{len(raw)}>{MAX_TEXT_CHARS}")
        raw = raw[:MAX_TEXT_CHARS]

    return IngestResult(text=raw, source_type="text", warnings=warnings)
