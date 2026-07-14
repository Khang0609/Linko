"""Enum mapping and post-validation for Smart Analyzer output."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeAlias, get_args

from app.analyzer.schemas import BusinessDraft, FieldMeta, NeedDraft, OfferDraft
from app.schemas import (
    BusinessStage,
    EmployeeRange,
    IntentTypeCode,
    LegalType,
    RevenueRangeVnd,
)
from core.province_mapping import normalize_province

_LEGAL_TYPES: set[str] = set(get_args(LegalType))
_BUSINESS_STAGES: set[str] = set(get_args(BusinessStage))
_EMPLOYEE_RANGES: set[str] = set(get_args(EmployeeRange))
_REVENUE_RANGES: set[str] = set(get_args(RevenueRangeVnd))
_INTENT_TYPES: set[str] = set(get_args(IntentTypeCode))

IndustryEntry: TypeAlias = tuple[int, str | None, bool]
IndustryCatalog: TypeAlias = Mapping[str, IndustryEntry]


def build_industry_catalog(rows: list[dict[str, Any]]) -> dict[str, IndustryEntry]:
    """Build an industry catalog snapshot from database rows."""
    return {
        row["code"]: (
            row["level"],
            row.get("parent_code"),
            row.get("is_active", True),
        )
        for row in rows
    }


def _validate_enum(value: str | None, valid: set[str]) -> tuple[str | None, FieldMeta]:
    if value is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    if value in valid:
        return value, FieldMeta(confidence=None, needs_review=False)
    return None, FieldMeta(confidence=None, needs_review=True)


def _validate_industry_l1(
    code: str | None,
    catalog: IndustryCatalog,
) -> tuple[str | None, FieldMeta]:
    if code is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    entry = catalog.get(code)
    if entry is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    level, _parent, is_active = entry
    if level != 1 or not is_active:
        return None, FieldMeta(confidence=None, needs_review=True)
    return code, FieldMeta(confidence=None, needs_review=False)


def _validate_industry_l2(
    code: str | None,
    validated_l1: str | None,
    catalog: IndustryCatalog,
) -> tuple[str | None, FieldMeta]:
    if validated_l1 is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    if code is None:
        return None, FieldMeta(confidence=None, needs_review=False)
    entry = catalog.get(code)
    if entry is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    level, parent_code, is_active = entry
    if level != 2 or not is_active or parent_code != validated_l1:
        return None, FieldMeta(confidence=None, needs_review=True)
    return code, FieldMeta(confidence=None, needs_review=False)


def _validate_province(raw: str | None) -> tuple[str | None, FieldMeta]:
    if raw is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    normalized, was_converted = normalize_province(raw)
    if normalized is None:
        return None, FieldMeta(confidence=None, needs_review=True)
    return normalized, FieldMeta(confidence=None, needs_review=was_converted)


def _validate_intent_items(
    items: list[OfferDraft] | list[NeedDraft],
    catalog: IndustryCatalog,
) -> tuple[list[OfferDraft] | list[NeedDraft], bool]:
    """Null unknown item enums while preserving the extracted item."""
    needs_review = False
    for item in items:
        if item.intent_type and item.intent_type not in _INTENT_TYPES:
            item.intent_type = None
            needs_review = True

        if item.category_l1:
            l1_entry = catalog.get(item.category_l1)
            if not l1_entry or l1_entry[0] != 1 or not l1_entry[2]:
                item.category_l1 = None
                needs_review = True

        if item.category_l2:
            l2_entry = catalog.get(item.category_l2)
            invalid_l2 = not l2_entry or l2_entry[0] != 2 or not l2_entry[2]
            wrong_parent = bool(l2_entry and l2_entry[1] != item.category_l1)
            if invalid_l2 or wrong_parent:
                item.category_l2 = None
                needs_review = True

    return items, needs_review


def post_validate(
    draft: BusinessDraft,
    *,
    industry_catalog: IndustryCatalog,
    raw_confidence: dict[str, float] | None = None,
) -> tuple[BusinessDraft, dict[str, FieldMeta], list[str]]:
    """Validate extracted values and return canonical field metadata."""
    meta: dict[str, FieldMeta] = {}
    warnings: list[str] = []
    conf = raw_confidence or {}

    draft.legal_type, meta["business.legal_type"] = _validate_enum(
        draft.legal_type, _LEGAL_TYPES
    )
    draft.business_stage, meta["business.business_stage"] = _validate_enum(
        draft.business_stage, _BUSINESS_STAGES
    )
    draft.employee_range, meta["business.employee_range"] = _validate_enum(
        draft.employee_range, _EMPLOYEE_RANGES
    )
    draft.revenue_range_vnd, meta["business.revenue_range_vnd"] = _validate_enum(
        draft.revenue_range_vnd, _REVENUE_RANGES
    )

    draft.industry_l1, meta["business.industry_l1"] = _validate_industry_l1(
        draft.industry_l1, industry_catalog
    )
    draft.industry_l2, meta["business.industry_l2"] = _validate_industry_l2(
        draft.industry_l2, draft.industry_l1, industry_catalog
    )
    draft.province, meta["business.province"] = _validate_province(draft.province)

    for field in ("name", "tax_id", "city", "description", "year_established"):
        meta[f"business.{field}"] = FieldMeta(
            confidence=conf.get(field),
            needs_review=getattr(draft, field) is None,
        )

    draft.offers, offers_need_review = _validate_intent_items(
        draft.offers, industry_catalog
    )
    draft.needs, needs_need_review = _validate_intent_items(
        draft.needs, industry_catalog
    )

    no_intents = not draft.offers and not draft.needs
    meta["business.intent"] = FieldMeta(
        confidence=None,
        needs_review=no_intents or offers_need_review or needs_need_review,
    )
    meta["business.offers"] = FieldMeta(
        confidence=None,
        needs_review=not draft.offers or offers_need_review,
    )
    meta["business.needs"] = FieldMeta(
        confidence=None,
        needs_review=not draft.needs or needs_need_review,
    )

    draft.persons = []
    meta["business.persons"] = FieldMeta(confidence=None, needs_review=False)

    if no_intents:
        warnings.append("MISSING_OFFER_OR_NEED")

    return draft, meta, warnings
