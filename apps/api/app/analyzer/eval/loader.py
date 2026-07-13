"""Golden set loader — Issue #10.

Loads and parses JSONL golden set cases.
Excludes case GS-024 per specification constraint.
"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

EXPECTED_SHA256 = "e40e084e311540cc88de9687e382d6cebb8ef5b4cb58797f6cc587c67290bc57"


def verify_file_hash(filepath: Path) -> bool:
    """Calculate SHA-256 of file and verify it against expected hash.

    Logs a warning if it doesn't match but returns True/False.
    """
    hasher = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            while chunk := f.read(8192):
                hasher.update(chunk)
        actual = hasher.hexdigest()
        if actual != EXPECTED_SHA256:
            logger.warning("Golden set SHA-256 mismatch: expected %s, got %s", EXPECTED_SHA256, actual)
            return False
        return True
    except Exception as exc:
        logger.error("Failed to calculate SHA-256 of golden set: %s", exc)
        return False


def load_golden_set(filepath: str | Path) -> list[dict[str, Any]]:
    """Load evaluation cases from JSONL golden set file.

    Excludes GS-024 from the returned list.
    """
    path = Path(filepath)
    if not path.exists():
        logger.error("Golden set file not found: %s", path)
        return []

    # Verify hash for integrity reporting
    verify_file_hash(path)

    cases = []
    try:
        with open(path, encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                if not line.strip():
                    continue
                try:
                    case = json.loads(line)
                    case_id = case.get("id")
                    if case_id == "GS-024":
                        logger.info("Excluding case GS-024 (needs adjudication)")
                        continue
                    cases.append(case)
                except json.JSONDecodeError as exc:
                    logger.error("Failed to parse golden set line %d: %s", line_num, exc)
    except Exception as exc:
        logger.error("Failed to read golden set file: %s", exc)

    return cases
