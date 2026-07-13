"""PDF ingestion via PyMuPDF — Issue #10.

Born-digital only: extracts text layers from PDF.
Scanned PDFs (no text layer) → SCAN_NOT_SUPPORTED warning + fallback.
Limits: max 10 MB, max 50 pages.
"""

from __future__ import annotations

import logging
from pathlib import Path

import pymupdf  # PyMuPDF

from app.analyzer.ingest.base import IngestResult

logger = logging.getLogger(__name__)

MAX_PDF_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_PAGES = 50
MAX_TEXT_CHARS = 20_000


def ingest_pdf(file_path: str) -> IngestResult:
    """Extract text from a born-digital PDF file.

    Args:
        file_path: Absolute path to the PDF file on disk.

    Returns:
        IngestResult with extracted text or appropriate warnings.
    """
    warnings: list[str] = []
    path = Path(file_path)

    if not path.is_file():
        return IngestResult(text="", source_type="pdf", warnings=["PDF_FILE_NOT_FOUND"])

    file_size = path.stat().st_size
    if file_size > MAX_PDF_BYTES:
        warnings.append(f"PDF_TOO_LARGE:{file_size}>{MAX_PDF_BYTES}")
        return IngestResult(text="", source_type="pdf", warnings=warnings)

    try:
        doc = pymupdf.open(str(path))
    except Exception:
        logger.exception("Failed to open PDF")
        return IngestResult(text="", source_type="pdf", warnings=["PDF_OPEN_ERROR"])

    try:
        page_count = len(doc)
        if page_count > MAX_PAGES:
            warnings.append(f"PDF_TOO_MANY_PAGES:{page_count}>{MAX_PAGES}")
            page_count = MAX_PAGES

        texts: list[str] = []
        for i in range(page_count):
            page = doc[i]
            page_text = page.get_text("text")
            if page_text:
                texts.append(page_text.strip())

        full_text = "\n\n".join(texts).strip()

        if not full_text:
            warnings.append("SCAN_NOT_SUPPORTED")
            return IngestResult(text="", source_type="pdf", warnings=warnings)

        if len(full_text) > MAX_TEXT_CHARS:
            warnings.append(f"TEXT_TRUNCATED:{len(full_text)}>{MAX_TEXT_CHARS}")
            full_text = full_text[:MAX_TEXT_CHARS]

        return IngestResult(text=full_text, source_type="pdf", warnings=warnings)
    finally:
        doc.close()
