"""Live evaluation command-line runner — Issue #10.

Loads reference catalogs from DB, parses JSONL golden set, executes the
extraction pipeline (using GeminiProvider by default or MockProvider as fallback),
computes overall and per-field accuracy, and reports the results.

Usage:
    python -m app.analyzer.eval.live [--golden-path PATH] [--provider PROVIDER]
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import time
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.analyzer.eval.loader import load_golden_set
from app.analyzer.eval.score import compute_metrics, score_case
from app.analyzer.mapping import build_industry_catalog
from app.analyzer.providers.gemini import GeminiProvider
from app.analyzer.providers.mock import MockProvider
from app.analyzer.schemas import AnalyzeRequest
from app.analyzer.service import run_analysis
from app.config import settings
from app.models import Industry, IntentType


def _fetch_db_catalogs() -> tuple[str, str, list[dict[str, Any]]]:
    """Synchronously fetch active catalog tables for the prompt & validation."""
    engine = create_engine(settings.alembic_database_url, connect_args={"connect_timeout": 2})

    with Session(engine) as session:
        # Fetch industries
        industries = session.scalars(select(Industry).where(Industry.is_active.is_(True))).all()
        industry_rows = []
        l1_lines = []
        l2_by_parent: dict[str, list[str]] = {}

        for ind in industries:
            industry_rows.append({
                "code": ind.code,
                "level": ind.level,
                "parent_code": ind.parent_code,
                "is_active": ind.is_active,
            })
            if ind.level == 1:
                l1_lines.append(f"- {ind.code}: {ind.name_vi}")
            elif ind.level == 2 and ind.parent_code:
                l2_by_parent.setdefault(ind.parent_code, []).append(f"  * {ind.code}: {ind.name_vi}")

        ind_lines = []
        for l1 in sorted(l1_lines):
            ind_lines.append(l1)
            code = l1.split(":")[0].replace("- ", "").strip()
            if code in l2_by_parent:
                ind_lines.extend(sorted(l2_by_parent[code]))
        industry_catalog_text = "\n".join(ind_lines)

        # Fetch intents
        intents = session.scalars(select(IntentType).where(IntentType.is_active.is_(True))).all()
        intent_lines = []
        for intent in intents:
            intent_lines.append(f"- {intent.code}: {intent.name_vi} ({intent.match_kind})")
        intent_catalog_text = "\n".join(sorted(intent_lines))

    return industry_catalog_text, intent_catalog_text, industry_rows


async def run_evaluation(
    golden_path: Path,
    provider_name: str,
) -> bool:
    """Run full evaluation pipeline. Returns True if accuracy >= 0.85, else False."""
    print("=" * 70)
    print("LINKO SMART BUSINESS ANALYZER - GOLDEN SET EVALUATION")
    print("=" * 70)

    # 1. Fetch reference catalogs from DB
    try:
        print("Fetching reference catalogs from database...")
        ind_cat, int_cat, ind_rows = _fetch_db_catalogs()
        industry_catalog = build_industry_catalog(ind_rows)
        print("Reference data loaded successfully.")
    except Exception as exc:
        print(f"Error connecting to database or loading catalogs: {exc}", file=sys.stderr)
        print("Continuing with default offline/fallback catalogs...", file=sys.stderr)
        ind_cat = "- san_xuat_che_bien: Sản xuất chế biến\n- ban_buon_ban_le: Bán buôn bán lẻ"
        int_cat = "- find_buyer: Tìm người mua (complementarity)\n- find_supplier: Tìm nhà cung cấp (complementarity)"
        ind_rows = [
            {"code": "san_xuat_che_bien", "level": 1, "parent_code": None, "is_active": True},
            {
                "code": "san_xuat_che_bien.che_bien_thuc_pham",
                "level": 2,
                "parent_code": "san_xuat_che_bien",
                "is_active": True,
            },
            {"code": "ban_buon_ban_le", "level": 1, "parent_code": None, "is_active": True},
            {
                "code": "ban_buon_ban_le.thuc_pham_che_bien",
                "level": 2,
                "parent_code": "ban_buon_ban_le",
                "is_active": True,
            },
        ]
        industry_catalog = build_industry_catalog(ind_rows)

    # 2. Select Provider
    if provider_name == "gemini":
        print(f"Initializing GeminiProvider with model: {settings.gemini_model}")
        provider = GeminiProvider(
            project=settings.gemini_project,
            region=settings.gemini_region,
            model=settings.gemini_model,
            timeout=settings.analyzer_provider_timeout_seconds,
            industry_catalog=ind_cat,
            intent_catalog=int_cat,
        )
    else:
        print("Initializing MockProvider...")
        provider = MockProvider()

    # 3. Load Golden Set cases
    print(f"Loading golden set from {golden_path}...")
    cases = load_golden_set(golden_path)
    if not cases:
        print("No cases loaded. Evaluation aborted.", file=sys.stderr)
        return False

    print(f"Loaded {len(cases)} evaluation cases.")
    print("-" * 70)

    # 4. Loop cases and run pipeline
    case_results = []
    start_time = time.monotonic()

    for idx, case in enumerate(cases, 1):
        case_id = case.get("id", f"UNKNOWN-{idx}")
        source_type = case.get("source_type")
        raw_input = case.get("input")
        expected = case.get("expected", {})

        print(f"[{idx}/{len(cases)}] Running {case_id} ({source_type})... ", end="", flush=True)

        # Prepare request
        if source_type == "text":
            req = AnalyzeRequest(source_type="text", inline_text=raw_input)
        elif source_type in ("url", "pdf"):
            req = AnalyzeRequest(source_type=source_type, payload_ref=raw_input)
        else:
            print(f"FAILED (Unknown source type {source_type})")
            continue

        try:
            # Run pipeline
            res = await run_analysis(
                req,
                provider,
                industry_catalog=industry_catalog,
                timeout=settings.analyzer_timeout_seconds,
            )

            if res.status == "fallback":
                print(f"COMPLETED WITH FALLBACK (Warnings: {res.warnings})")
            else:
                print("COMPLETED")

            # Score result
            scores = score_case(res.data, expected)
            case_results.append(scores)

        except Exception as exc:
            print(f"FAILED with unhandled error: {exc}")

    total_duration = time.monotonic() - start_time
    print("-" * 70)
    print("EVALUATION METRICS SUMMARY")
    print("-" * 70)

    metrics = compute_metrics(case_results)
    overall_acc = metrics.get("overall_accuracy", 0.0)

    print(f"Overall Field Accuracy: {overall_acc:.4f} ({overall_acc * 100:.1f}%)")
    print(f"Total Execution Time:  {total_duration:.2f} seconds")
    print("-" * 70)
    print("Per-Field Accuracy Breakdown:")
    for key, val in sorted(metrics.items()):
        if key.startswith("field_accuracy_"):
            field_name = key.replace("field_accuracy_", "")
            print(f"  - {field_name:<20}: {val:.4f} ({val * 100:.1f}%)")

    print("=" * 70)

    # Validate Gate
    gate_passed = overall_acc >= 0.85
    if gate_passed:
        print("SUCCESS: Overall field accuracy satisfies the >= 0.85 gate constraint.")
    else:
        print("FAILURE: Overall field accuracy is below the 0.85 gate requirement.", file=sys.stderr)

    return gate_passed


def main() -> None:
    # Insert parent directory to Python path if run directly
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

    parser = argparse.ArgumentParser(description="Live Golden Set Evaluation Runner")
    parser.add_argument(
        "--golden-path",
        type=str,
        default=str(Path(__file__).resolve().parent.parent.parent.parent / "tests" / "golden" / "golden_set.jsonl"),
        help="Path to the golden set JSONL file",
    )
    parser.add_argument(
        "--provider",
        type=str,
        default="mock",
        choices=["mock", "gemini"],
        help="LLM provider to evaluate",
    )

    args = parser.parse_args()

    # Run event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        passed = loop.run_until_complete(run_evaluation(Path(args.golden_path), args.provider))
        sys.exit(0 if passed else 1)
    except KeyboardInterrupt:
        print("\nEvaluation interrupted by user.")
        sys.exit(130)
    finally:
        loop.close()


if __name__ == "__main__":
    main()
