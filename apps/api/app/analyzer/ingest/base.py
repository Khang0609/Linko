"""Base types for the ingest pipeline — Issue #10."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class IngestResult:
    """Result of document ingestion — plain text ready for LLM extraction."""

    text: str
    source_type: str
    warnings: list[str] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not self.text.strip()
