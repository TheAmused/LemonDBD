# backend/app/utils/responses.py
"""Standardized API response envelopes for LemonDBD endpoints."""
from __future__ import annotations

from typing import Any
from flask import Response, jsonify


def api_error(
    message: str,
    status_code: int = 400,
    code: str | None = None,
    **extra: Any,
) -> tuple[Response, int]:
    """Uniform error response envelope across all Flask route controllers."""
    payload: dict[str, Any] = {
        "error": message,
        "status": status_code,
    }
    if code is not None:
        payload["code"] = code
    if extra:
        payload.update(extra)
    return jsonify(payload), status_code


def api_success(
    data: Any = None,
    message: str | None = None,
    status_code: int = 200,
    **extra: Any,
) -> tuple[Response, int]:
    """Uniform success response envelope for mutations or wrapped responses."""
    payload: dict[str, Any] = {"status": "success"}
    if message is not None:
        payload["message"] = message
    if data is not None:
        payload["data"] = data
    if extra:
        payload.update(extra)
    return jsonify(payload), status_code
