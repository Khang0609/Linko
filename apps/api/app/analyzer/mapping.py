"""Enum mapping & post-validation for LLM-extracted data — Issue #10.

The LLM *proposes* enum values. This module validates every value against the
seed catalog (industries, intent_types) and normalizes province names.
Unknown values are nulled out with needs_review=True.
"""

from __future__ import annotations

import logging
from typing import Any, get_args

from app.analyzer.schemas import BusinessDraft, FieldMeta, NeedDraft, OfferDraft
from app.schemas import (
    BusinessStage,
    EmployeeRange,
    IntentTypeCode,
    LegalType,
    RevenueRangeVnd,
)
from core.province_mapping import normalize_province

logger = logging.getLogger(__name__)

# Pre-compute valid enum sets from the Literal types in app.schemas
_LEGAL_TYPES: set[str] = set(get_args(LegalType))
_BUSINESS_STAGES: set[str] = set(get_args(BusinessStage))
_EMPLOYEE_RANGES: set[str] = set(get_args(EmployeeRange))
_REVENUE_RANGES: set[str] = set(get_args(RevenueRangeVnd))
_INTENT_TYPES: set[str] = set(get_args(IntentTypeCode))

# Industry catalog loaded from the seed migration.
# Keys: code → (level, parent_code, is_active)
# Populated by load_industry_catalog() at service startup.
_INDUSTRY_CATALOG: dict[str, tuple[int, str | None, bool]] = {}


def load_industry_catalog(rows: list[dict[str, Any]]) -> None:
    """Load industry catalog from DB rows into the module-level cache.

    Each row must have: code, level, parent_code, is_active.
    """
    _INDUSTRY_CATALOG.clear()
    for row in rows:
        _INDUSTRY_CATALOG[row["code"]] = (
            row["level"],
            row.get("parent_code"),
            row.get("is_active", True),
        )


def _validate_enum(value: str | None, valid: set[str], field_name: str) -> tuple[str | None, FieldMeta]:
    """Check if value is in the valid set. Return (validated_value, meta)."""
    if value is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    if value in valid:
        return value, FieldMeta(confidence=None, needs_review=False)
    return None, FieldMeta(confidence=None, needs_review=True)


def _validate_industry_l1(code: str | None) -> tuple[str | None, FieldMeta]:
    """Validate L1 industry code against seed catalog."""
    if code is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    entry = _INDUSTRY_CATALOG.get(code)
    if entry is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    level, _parent, is_active = entry
    if level != 1 or not is_active:
        return None, FieldMeta(confidence=None, needs_review=True)
    return code, FieldMeta(confidence=None, needs_review=False)


def _validate_industry_l2(code: str | None, validated_l1: str | None) -> tuple[str | None, FieldMeta]:
    """Validate L2 industry code: must exist, be level=2, active, and parent must match validated L1."""
    if code is None:
        return None, FieldMeta(confidence=None, needs_review=False)
    entry = _INDUSTRY_CATALOG.get(code)
    if entry is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    level, parent_code, is_active = entry
    if level != 2 or not is_active:
        return None, FieldMeta(confidence=None, needs_review=True)
    # Parent-child validation: L2 must belong to the validated L1
    if validated_l1 is not None and parent_code != validated_l1:
        return None, FieldMeta(confidence=None, needs_review=True)
    return code, FieldMeta(confidence=None, needs_review=False)


def _validate_province(raw: str | None) -> tuple[str | None, FieldMeta]:
    """Normalize province name using core/province_mapping."""
    if raw is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    normalized, was_converted = normalize_province(raw)
    if normalized is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    return normalized, FieldMeta(confidence=None, needs_review=was_converted)


def _validate_intent_in_items(
    items: list[OfferDraft] | list[NeedDraft],
    warnings: list[str],
    kind: str,
) -> list[OfferDraft] | list[NeedDraft]:
    """Validate intent_type codes in offer/need drafts. Drop items with unknown intent."""
    valid_items = []
    for item in items:
        if item.intent_type and item.intent_type not in _INTENT_TYPES:
            warnings.append(f"UNKNOWN_INTENT_{kind.upper()}:{item.intent_type}")
            continue
        # Also validate category L1/L2 in offers/needs
        if item.category_l1:
            l1_entry = _INDUSTRY_CATALOG.get(item.category_l1)
            if not l1_entry or l1_entry[0] != 1 or not l1_entry[2]:
                item.category_l1 = None
        if item.category_l2:
            l2_entry = _INDUSTRY_CATALOG.get(item.category_l2)
            invalid_l2 = not l2_entry or l2_entry[0] != 2 or not l2_entry[2]
            mismatched_parent = bool(l2_entry and item.category_l1 and l2_entry[1] != item.category_l1)
            if invalid_l2 or mismatched_parent:
                item.category_l2 = None
        valid_items.append(item)
    return valid_items


def post_validate(
    draft: BusinessDraft,
    raw_confidence: dict[str, float] | None = None,
) -> tuple[BusinessDraft, dict[str, FieldMeta], list[str]]:
    """Run all post-validation checks on the LLM-extracted draft.

    Returns:
        (validated_draft, field_meta_dict, warnings)
    """
    meta: dict[str, FieldMeta] = {}
    warnings: list[str] = []
    conf = raw_confidence or {}

    # --- Enum fields ---
    draft.legal_type, meta["legal_type"] = _validate_enum(draft.legal_type, _LEGAL_TYPES, "legal_type")
    draft.business_stage, meta["business_stage"] = _validate_enum(
        draft.business_stage, _BUSINESS_STAGES, "business_stage"
    )
    draft.employee_range, meta["employee_range"] = _validate_enum(
        draft.employee_range, _EMPLOYEE_RANGES, "employee_range"
    )
    draft.revenue_range_vnd, meta["revenue_range_vnd"] = _validate_enum(
        draft.revenue_range_vnd, _REVENUE_RANGES, "revenue_range_vnd"
    )

    # --- Industry hierarchy ---
    draft.industry_l1, meta["industry_l1"] = _validate_industry_l1(draft.industry_l1)
    draft.industry_l2, meta["industry_l2"] = _validate_industry_l2(draft.industry_l2, draft.industry_l1)

    # --- Province ---
    draft.province, meta["province"] = _validate_province(draft.province)

    # --- Simple text fields: mark with LLM confidence if available ---
    for field in ("name", "tax_id", "city", "description", "year_established"):
        c = conf.get(field)
        meta[field] = FieldMeta(
            confidence=c,
            needs_review=getattr(draft, field) is None,
        )

    # --- Offers/Needs intent validation ---
    draft.offers = _validate_intent_in_items(draft.offers, warnings, "offer")
    draft.needs = _validate_intent_in_items(draft.needs, warnings, "need")

    # --- persons always empty ---
    draft.persons = []

    # --- Warnings for empty offers+needs ---
    if not draft.offers and not draft.needs:
        warnings.append("NO_OFFERS_OR_NEEDS")

    return draft, meta, warnings
