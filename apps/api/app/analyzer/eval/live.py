"""Manual analyzer evaluation runner.

This command reports diagnostic field agreement only. It does not implement a
production accuracy gate, and the deterministic mock fixture is never evidence
of live model quality.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal
from uuid import UUID

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.analyzer.eval.loader import load_evaluation_cases
from app.analyzer.eval.score import compute_metrics, score_case
from app.analyzer.mapping import build_industry_catalog
from app.analyzer.payloads import DisabledPayloadResolver
from app.analyzer.providers.gemini import GeminiProvider
from app.analyzer.providers.mock import MockProvider
from app.analyzer.schemas import AnalyzeRequest
from app.analyzer.service import run_analysis
from app.config import settings
from app.models import Industry, IntentType

MOCK_FIXTURE_PATH = (
    Path(__file__).resolve().parents[3]
    / "tests"
    / "fixtures"
    / "analyzer"
    / "mock_eval_cases.jsonl"
)
EVALUATOR_ACCOUNT_ID = UUID(int=0)


@dataclass(frozen=True)
class EvaluationOutcome:
    """Diagnostic execution result; never a merge or production acceptance gate."""

    completed: bool
    metrics: dict[str, float]
    acceptance_eligible: Literal[False] = False


def _fetch_db_catalogs() -> tuple[str, str, list[dict[str, Any]]]:
    """Synchronously fetch active reference catalogs for a manual run."""
    engine = create_engine(
        settings.alembic_database_url,
        connect_args={"connect_timeout": 2},
    )
    with Session(engine) as session:
        industries = session.scalars(
            select(Industry).where(Industry.is_active.is_(True))
        ).all()
        industry_rows: list[dict[str, Any]] = []
        l1_names: dict[str, str] = {}
        l2_by_parent: dict[str, list[str]] = {}
        for industry in industries:
            industry_rows.append(
                {
                    "code": industry.code,
                    "level": industry.level,
                    "parent_code": industry.parent_code,
                    "is_active": industry.is_active,
                }
            )
            if industry.level == 1:
                l1_names[industry.code] = industry.name_vi
            elif industry.level == 2 and industry.parent_code:
                l2_by_parent.setdefault(industry.parent_code, []).append(
                    f"  * {industry.code}: {industry.name_vi}"
                )

        industry_lines: list[str] = []
        for code in sorted(l1_names):
            industry_lines.append(f"- {code}: {l1_names[code]}")
            industry_lines.extend(sorted(l2_by_parent.get(code, [])))

        intents = session.scalars(
            select(IntentType).where(IntentType.is_active.is_(True))
        ).all()
        intent_lines = sorted(
            f"- {intent.code}: {intent.name_vi} ({intent.match_kind})"
            for intent in intents
        )

    return "\n".join(industry_lines), "\n".join(intent_lines), industry_rows


async def run_evaluation(
    cases_path: Path,
    provider_name: Literal["gemini", "mock"],
) -> EvaluationOutcome:
    """Run a manual diagnostic evaluation without asserting an accuracy gate."""
    if provider_name == "gemini" and not settings.gemini_project:
        print("VERTEX_PROJECT is required for a Gemini evaluation.", file=sys.stderr)
        return EvaluationOutcome(completed=False, metrics={})

    try:
        industry_prompt, intent_prompt, industry_rows = _fetch_db_catalogs()
        cases = load_evaluation_cases(cases_path)
    except Exception:
        print(
            "Evaluation setup failed; verify database and fixture configuration.",
            file=sys.stderr,
        )
        return EvaluationOutcome(completed=False, metrics={})

    if not cases:
        print("Evaluation fixture contains no cases.", file=sys.stderr)
        return EvaluationOutcome(completed=False, metrics={})

    if provider_name == "gemini":
        provider = GeminiProvider(
            project=settings.gemini_project,
            region=settings.gemini_region,
            model=settings.gemini_model,
            timeout=settings.analyzer_provider_timeout_seconds,
            industry_catalog=industry_prompt,
            intent_catalog=intent_prompt,
        )
        print("Running a manual Gemini diagnostic; results are not a production gate.")
    else:
        provider = MockProvider()
        print(
            "Running deterministic mock plumbing only; metrics must not be used "
            "to claim model accuracy."
        )

    industry_catalog = build_industry_catalog(industry_rows)
    resolver = DisabledPayloadResolver()
    case_results: list[dict[str, bool]] = []
    started = time.monotonic()

    for index, case in enumerate(cases, 1):
        source_type = case.get("source_type")
        raw_input = case.get("input")
        if source_type == "text":
            request = AnalyzeRequest(source_type="text", inline_text=raw_input)
        elif source_type in ("url", "pdf"):
            request = AnalyzeRequest(source_type=source_type, payload_ref=raw_input)
        else:
            print(f"Skipping case {index}: unsupported source_type={source_type!r}")
            continue

        response = await run_analysis(
            request,
            provider,
            industry_catalog=industry_catalog,
            payload_resolver=resolver,
            account_id=EVALUATOR_ACCOUNT_ID,
            timeout=settings.analyzer_timeout_seconds,
        )
        if response.status == "fallback":
            print(f"Case {index} returned fallback: {response.warnings}")
            continue
        case_results.append(score_case(response.data, case.get("expected", {})))

    metrics = compute_metrics(case_results)
    print(f"Diagnostic field agreement: {metrics.get('overall_accuracy', 0.0):.4f}")
    print(f"Execution time: {time.monotonic() - started:.2f} seconds")
    return EvaluationOutcome(completed=bool(case_results), metrics=metrics)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manual analyzer diagnostic runner")
    parser.add_argument(
        "--provider",
        required=True,
        choices=["gemini", "mock"],
        help="Provider to run; there is no implicit mock fallback",
    )
    parser.add_argument(
        "--cases-path",
        type=Path,
        help="JSONL cases; required for Gemini and defaults to mock fixture for mock",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if args.provider == "gemini" and args.cases_path is None:
        parser.error("--cases-path is required when --provider=gemini")
    cases_path = args.cases_path or MOCK_FIXTURE_PATH
    try:
        outcome = asyncio.run(run_evaluation(cases_path, args.provider))
    except KeyboardInterrupt:
        print("Evaluation interrupted.")
        raise SystemExit(130) from None
    raise SystemExit(0 if outcome.completed else 1)


if __name__ == "__main__":
    main()
