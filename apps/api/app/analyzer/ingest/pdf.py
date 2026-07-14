"""PDF ingestion via PyMuPDF — Issue #10.

Born-digital only: extracts text layers from PDF.
Scanned PDFs (no text layer) → SCAN_NOT_SUPPORTED warning + fallback.
Limits: max 10 MB, max 50 pages.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from weakref import WeakKeyDictionary

import pymupdf  # PyMuPDF

from app.analyzer.ingest.base import IngestResult
from app.config import settings

logger = logging.getLogger(__name__)

MAX_PDF_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_PAGES = 50
MAX_TEXT_CHARS = 20_000
_pdf_semaphores: WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Semaphore] = (
    WeakKeyDictionary()
)
_background_pdf_jobs: set[asyncio.Task[IngestResult]] = set()


def _pdf_semaphore() -> asyncio.Semaphore:
    loop = asyncio.get_running_loop()
    semaphore = _pdf_semaphores.get(loop)
    if semaphore is None:
        semaphore = asyncio.Semaphore(settings.analyzer_pdf_max_concurrency)
        _pdf_semaphores[loop] = semaphore
    return semaphore


def _finish_background_job(task: asyncio.Task[IngestResult]) -> None:
    _background_pdf_jobs.discard(task)
    if not task.cancelled():
        with suppress(Exception):
            task.exception()


async def ingest_pdf_bytes_async(
    data: bytes,
    *,
    semaphore: asyncio.Semaphore | None = None,
) -> IngestResult:
    """Extract PDF text off the event loop with bounded concurrency."""

    async def run() -> IngestResult:
        limiter = semaphore or _pdf_semaphore()
        async with limiter:
            return await asyncio.to_thread(ingest_pdf_bytes, data)

    task = asyncio.create_task(run())
    _background_pdf_jobs.add(task)
    task.add_done_callback(_finish_background_job)
    return await asyncio.shield(task)


def ingest_pdf_bytes(data: bytes) -> IngestResult:
    """Extract text from born-digital PDF bytes.

    Args:
        data: PDF content returned by a trusted payload resolver.

    Returns:
        IngestResult with extracted text or appropriate warnings.
    """
    warnings: list[str] = []
    file_size = len(data)
    if file_size > MAX_PDF_BYTES:
        warnings.append(f"PDF_TOO_LARGE:{file_size}>{MAX_PDF_BYTES}")
        return IngestResult(text="", source_type="pdf", warnings=warnings)

    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
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
