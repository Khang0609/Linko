"""Google Gemini LLM provider via Vertex AI — Issue #10.

Uses google-genai SDK with Vertex mode. Lazy init so CI/local without
credentials doesn't break on import.

Config:
- Region: asia-southeast1 (Singapore)
- Model: gemini-2.5-flash-lite (pinned)
- thinking_budget: 0
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.analyzer.prompt import build_system_prompt, build_user_prompt
from app.analyzer.providers.base import LLMParseError, LLMProvider, ProviderUnavailableError
from app.analyzer.schemas import ExtractionPayload

logger = logging.getLogger(__name__)


class GeminiProvider(LLMProvider):
    """Gemini 2.5 Flash-Lite provider via google-genai SDK.

    Lazily initializes the client on first call so that missing credentials
    don't crash the import or app startup (important for CI and local dev).
    """

    def __init__(
        self,
        *,
        project: str | None = None,
        region: str = "asia-southeast1",
        model: str = "gemini-2.5-flash-lite",
        timeout: float = 4.0,
        industry_catalog: str = "",
        intent_catalog: str = "",
    ) -> None:
        self._project = project
        self._region = region
        self._model = model
        self._timeout = timeout
        self._industry_catalog = industry_catalog
        self._intent_catalog = intent_catalog
        self._client: Any | None = None
        self._init_error: str | None = None

    def _lazy_init(self) -> Any:
        """Initialize google-genai client on first use."""
        if self._client is not None:
            return self._client
        if self._init_error is not None:
            raise ProviderUnavailableError("Gemini provider initialization failed")

        if not self._project:
            raise ProviderUnavailableError("Vertex project is not configured")

        try:
            from google import genai
            from google.genai import types

            self._client = genai.Client(
                vertexai=True,
                project=self._project,
                location=self._region,
                http_options=types.HttpOptions(timeout=int(self._timeout * 1000)),
            )
            return self._client
        except Exception as exc:
            self._init_error = f"Gemini init failed: {exc}"
            logger.error(self._init_error)
            raise ProviderUnavailableError("Gemini provider initialization failed") from exc

    def configure_context(
        self,
        *,
        industry_catalog: str,
        intent_catalog: str,
        timeout: float,
    ) -> None:
        self._industry_catalog = industry_catalog
        self._intent_catalog = intent_catalog
        self._timeout = min(self._timeout, timeout)

    async def extract(self, text: str) -> dict[str, Any]:
        """Call Gemini to extract structured business data."""
        client = self._lazy_init()

        system_prompt = build_system_prompt(
            industry_catalog=self._industry_catalog,
            intent_catalog=self._intent_catalog,
        )
        user_prompt = build_user_prompt(text)

        from google.genai import types

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=ExtractionPayload,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        )

        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=self._model,
                    contents=[user_prompt],
                    config=config,
                ),
                timeout=self._timeout,
            )
        except TimeoutError:
            raise
        except ProviderUnavailableError:
            raise
        except Exception as exc:
            logger.error("Gemini API call failed: %s", exc)
            raise ProviderUnavailableError("Gemini provider request failed") from exc

        try:
            parsed = getattr(response, "parsed", None)
            if isinstance(parsed, ExtractionPayload):
                payload = parsed
            elif parsed is not None:
                payload = ExtractionPayload.model_validate(parsed)
            else:
                if not response.text:
                    raise ValueError("Gemini returned empty response")
                raw_text = response.text.strip()
                if raw_text.startswith("```"):
                    lines = raw_text.split("\n")
                    raw_text = "\n".join(lines[1:-1]) if len(lines) > 2 else raw_text
                payload = ExtractionPayload.model_validate_json(raw_text)
        except Exception as exc:
            raise LLMParseError("Gemini output did not match ExtractionPayload") from exc

        return payload.model_dump()
