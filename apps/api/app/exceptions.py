from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ProblemDetail(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str
    instance: str
    errors: list[dict[str, Any]] | None = None


class AppProblemError(Exception):
    status_code = 500
    title = "Internal Server Error"
    type = "about:blank"

    def __init__(self, detail: str, errors: list[dict[str, Any]] | None = None) -> None:
        super().__init__(detail)
        self.detail = detail
        self.errors = errors


class BusinessValidationError(AppProblemError):
    status_code = 422
    title = "Business validation failed"
    type = "https://linko.vn/problems/business-validation"


class DuplicateBusinessError(AppProblemError):
    status_code = 409
    title = "Duplicate business"
    type = "https://linko.vn/problems/duplicate-business"


class IdempotencyConflictError(AppProblemError):
    status_code = 409
    title = "Idempotency key is already processing"
    type = "https://linko.vn/problems/idempotency-conflict"

    def __init__(self, detail: str = "The idempotency key is still processing.") -> None:
        super().__init__(detail)


class IdempotencyReplayError(Exception):
    def __init__(self, status_code: int, body: dict[str, Any]) -> None:
        super().__init__("Idempotent response replayed.")
        self.status_code = status_code
        self.body = body


def problem_response(
    request: Request,
    *,
    status_code: int,
    title: str,
    detail: str,
    type_: str = "about:blank",
    errors: list[dict[str, Any]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body = ProblemDetail(
        type=type_,
        title=title,
        status=status_code,
        detail=detail,
        instance=str(request.url.path),
        errors=errors,
    )
    return JSONResponse(
        status_code=status_code,
        content=body.model_dump(exclude_none=True),
        media_type="application/problem+json",
        headers=headers,
    )


def _clean_validation_errors(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []
    for error in errors:
        cleaned_error = {
            "field": ".".join(str(part) for part in error.get("loc", []) if part != "body"),
            "message": error.get("msg", "Invalid value."),
            "type": error.get("type", "validation_error"),
        }
        context = error.get("ctx")
        if context:
            cleaned_error["context"] = {key: str(value) for key, value in context.items()}
        cleaned.append(cleaned_error)
    return cleaned


async def app_problem_handler(request: Request, exc: AppProblemError) -> JSONResponse:
    headers = {"Retry-After": "2"} if isinstance(exc, IdempotencyConflictError) else None
    return problem_response(
        request,
        status_code=exc.status_code,
        title=exc.title,
        detail=exc.detail,
        type_=exc.type,
        errors=exc.errors,
        headers=headers,
    )


async def idempotency_replay_handler(_request: Request, exc: IdempotencyReplayError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.body,
        headers={"Idempotent-Replayed": "true"},
    )


async def request_validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    is_json_invalid = any(error.get("type") == "json_invalid" for error in errors)
    status_code = 400 if is_json_invalid else 422
    return problem_response(
        request,
        status_code=status_code,
        title="Malformed JSON" if is_json_invalid else "Request validation failed",
        detail="Request body is not valid JSON." if is_json_invalid else "Request body failed validation.",
        type_="https://linko.vn/problems/malformed-json"
        if is_json_invalid
        else "https://linko.vn/problems/request-validation",
        errors=_clean_validation_errors(errors),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled API error")
    return problem_response(
        request,
        status_code=500,
        title="Internal Server Error",
        detail="The API could not complete the request.",
        type_="https://linko.vn/problems/internal-server-error",
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppProblemError, app_problem_handler)
    app.add_exception_handler(IdempotencyReplayError, idempotency_replay_handler)
    app.add_exception_handler(RequestValidationError, request_validation_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
