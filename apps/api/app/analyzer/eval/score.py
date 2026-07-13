"""Scoring engine for Golden Set evaluation — Issue #10.

Computes exact per-field match accuracy.
Applies string normalization (lowercase, whitespace collapse, parenthetical stripping)
to handle missing-field annotations like "(không có)".
Supports set-compare for offer/need intent types.
Excludes certifications from scoring.
"""

from __future__ import annotations

import re
from typing import Any

from app.analyzer.schemas import BusinessDraft

_SCORED_FIELDS = (
    "name",
    "tax_id",
    "legal_type",
    "business_stage",
    "year_established",
    "industry_l1",
    "industry_l2",
    "employee_range",
    "revenue_range_vnd",
    "city",
    "province",
)


def normalize_val(val: Any) -> Any:
    """Normalize string values to ensure fair comparison."""
    if val is None:
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, str):
        # Strip parenthetical annotations like "(không có)", "(missing)"
        text = re.sub(r"\(.*?\)", "", val).strip()
        # Collapse whitespace
        text = " ".join(text.split()).lower()
        return text or None
    return val


def compare_fields(actual: Any, expected: Any) -> bool:
    """Compare normalized values."""
    return normalize_val(actual) == normalize_val(expected)


def score_case(actual: BusinessDraft, expected: dict[str, Any]) -> dict[str, bool]:
    """Score a single extraction result against its expected gold standard.

    Returns:
        dict mapping field_name → is_correct (bool)
    """
    results: dict[str, bool] = {}

    # 1. Scored standard fields
    for field in _SCORED_FIELDS:
        exp_val = expected.get(field)
        act_val = getattr(actual, field, None)
        results[field] = compare_fields(act_val, exp_val)

    # 2. Offers & Needs intents set comparison
    # Expected offers and needs intent sets
    exp_offers = {normalize_val(o.get("intent_type")) for o in expected.get("offers", []) if o.get("intent_type")}
    exp_needs = {normalize_val(n.get("intent_type")) for n in expected.get("needs", []) if n.get("intent_type")}

    # Actual offers and needs intent sets
    act_offers = {normalize_val(o.intent_type) for o in actual.offers if o.intent_type}
    act_needs = {normalize_val(n.intent_type) for n in actual.needs if n.intent_type}

    results["offers_intents"] = act_offers == exp_offers
    results["needs_intents"] = act_needs == exp_needs

    return results


def compute_metrics(case_results: list[dict[str, bool]]) -> dict[str, float]:
    """Compute overall field accuracy and per-field breakdown metrics."""
    if not case_results:
        return {"overall_accuracy": 0.0}

    total_correct = 0
    total_scored = 0

    field_totals: dict[str, int] = {}
    field_correct: dict[str, int] = {}

    for res in case_results:
        for field, is_correct in res.items():
            total_scored += 1
            if is_correct:
                total_correct += 1

            field_totals[field] = field_totals.get(field, 0) + 1
            if is_correct:
                field_correct[field] = field_correct.get(field, 0) + 1

    metrics = {
        "overall_accuracy": total_correct / total_scored if total_scored > 0 else 0.0
    }

    # Add per-field breakdown
    for field in field_totals:
        metrics[f"field_accuracy_{field}"] = (
            field_correct.get(field, 0) / field_totals[field] if field_totals[field] > 0 else 0.0
        )

    return metrics
