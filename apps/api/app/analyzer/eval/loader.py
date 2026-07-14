"""Strict JSONL loader for analyzer evaluation fixtures."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_evaluation_cases(filepath: str | Path) -> list[dict[str, Any]]:
    """Load every JSON object from an evaluation fixture or fail closed."""
    path = Path(filepath)
    if not path.is_file():
        raise FileNotFoundError(f"Evaluation fixture not found: {path}")

    cases: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as fixture:
        for line_number, line in enumerate(fixture, 1):
            if not line.strip():
                continue
            try:
                case = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"Invalid evaluation JSON on line {line_number}"
                ) from exc
            if not isinstance(case, dict):
                raise ValueError(
                    f"Evaluation case on line {line_number} must be an object"
                )
            cases.append(case)
    return cases
