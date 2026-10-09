# backend/app/utils/downloads.py
"""Shared HTTP shape for JSON files the browser should save rather than render."""
import json
from typing import Any

from flask import Response, make_response


def json_download_response(data: Any, filename: str) -> Response:
    """Pretty-printed JSON as an attachment; `no-store` because it is personal data."""
    response = make_response(json.dumps(data, ensure_ascii=False, indent=2), 200)
    response.headers["Content-Type"] = "application/json; charset=utf-8"
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    response.headers["Cache-Control"] = "no-store"
    return response
