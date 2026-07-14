"""Smart Analyzer Pydantic schemas — Issue #10.

AnalyzeRequest  → input contract
AnalyzeResponse → output envelope (completed | fallback)
BusinessDraft   → mirrors BusinessCreate but fully nullable
FieldMeta       → per-field confidence + needs_review flag
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator
from pydantic_core import PydanticCustomError

# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    """Input payload for POST /api/v1/analyze."""

    source_type: Literal["text", "url", "pdf"]
    inline_text: str | None = None
    payload_ref: str | None = None

    @model_validator(mode="after")
    def validate_source_input(self) -> AnalyzeRequest:
        if self.source_type == "text":
            has_inline = self.inline_text is not None and self.inline_text.strip() != ""
            has_ref = self.payload_ref is not None and self.payload_ref.strip() != ""
            if not has_inline and not has_ref:
                raise PydanticCustomError(
                    "missing_text_source",
                    "source_type='text' requires exactly one of inline_text or payload_ref.",
                )
            if has_inline and has_ref:
                raise PydanticCustomError(
                    "ambiguous_text_source",
                    "source_type='text' requires exactly one of inline_text or payload_ref, not both.",
                )
        elif self.source_type in ("url", "pdf"):
            if not self.payload_ref or not self.payload_ref.strip():
                raise PydanticCustomError(
                    "missing_payload_ref",
                    f"source_type='{self.source_type}' requires payload_ref.",
                )
        return self


# ---------------------------------------------------------------------------
# Response building blocks
# ---------------------------------------------------------------------------

class FieldMeta(BaseModel):
    """Per-field metadata attached to every extracted field."""

    confidence: float | None = Field(default=None, ge=0, le=1)
    needs_review: bool = True


class OfferDraft(BaseModel):
    """Draft offer — all fields optional."""

    intent_type: str | None = None
    category_l1: str | None = None
    category_l2: str | None = None
    geo_scope: list[str] = Field(default_factory=list)
    title: str | None = None
    description: str | None = None
    structured_attrs: dict[str, Any] = Field(default_factory=dict)


class NeedDraft(BaseModel):
    """Draft need — all fields optional."""

    intent_type: str | None = None
    category_l1: str | None = None
    category_l2: str | None = None
    geo_scope: list[str] = Field(default_factory=list)
    title: str | None = None
    description: str | None = None
    structured_attrs: dict[str, Any] = Field(default_factory=dict)


class BusinessDraft(BaseModel):
    """Mirrors BusinessCreate but ALL fields are nullable/optional.

    persons is always [] in v0.1 — we do not extract contact info.
    offers/needs are [] when the source document doesn't mention business intent.
    """

    name: str | None = None
    tax_id: str | None = None
    legal_type: str | None = None
    business_stage: str | None = None
    year_established: int | None = None
    industry_l1: str | None = None
    industry_l2: str | None = None
    employee_range: str | None = None
    revenue_range_vnd: str | None = None
    city: str | None = None
    province: str | None = None
    geo_operating: list[str] = Field(default_factory=list)
    description: str | None = None
    offers: list[OfferDraft] = Field(default_factory=list)
    needs: list[NeedDraft] = Field(default_factory=list)
    persons: list[dict[str, Any]] = Field(default_factory=list, max_length=0)


# ---------------------------------------------------------------------------
# Response envelope
# ---------------------------------------------------------------------------

class AnalyzeResponse(BaseModel):
    """Output envelope for the analyzer endpoint."""

    status: Literal["completed", "fallback"]
    schema_version: Literal["1.0"] = "1.0"
    data: BusinessDraft
    field_meta: dict[str, FieldMeta] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


def fallback_response(*warnings: str) -> AnalyzeResponse:
    """Build a safe fallback response with empty data + warning messages."""
    return AnalyzeResponse(
        status="fallback",
        data=BusinessDraft(),
        field_meta={},
        warnings=list(warnings),
    )
