# backend/app/core/logging_setup.py
"""Process-wide logging: level and format from the environment, and a request id on every line.

- `LOG_LEVEL` (default INFO) sets the level; `LOG_FORMAT=json` writes one JSON object per line for
  a log collector, anything else keeps the readable text format.
- Every request gets an id: the `X-Request-ID` nginx sends (or a fresh one when there is none or it
  looks wrong). It is on each log line written while the request runs and echoed back in the
  `X-Request-ID` response header, so a user's report can be matched to the server's logs.
"""
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone

from flask import Flask, g, has_request_context, request

TEXT_FORMAT = "%(asctime)s [%(levelname)s] %(name)s [%(request_id)s]: %(message)s"
REQUEST_ID_HEADER = "X-Request-ID"
_VALID_REQUEST_ID = re.compile(r"[A-Za-z0-9._-]{8,128}")
#: Marks the handler this module installed, so a second create_app() reuses it.
_HANDLER_FLAG = "_lemondbd_handler"


class RequestIdFilter(logging.Filter):
    """Adds `record.request_id`: the current request's id, or "-" outside a request."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = getattr(g, "request_id", "-") if has_request_context() else "-"
        return True


class JsonFormatter(logging.Formatter):
    """One JSON object per record: time, level, logger, message, request id, and any traceback."""

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "time": datetime.fromtimestamp(record.created, timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if record.exc_info:
            entry["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False, default=str)


def log_level() -> int:
    """`LOG_LEVEL` as a logging level; an unknown name falls back to INFO."""
    level = logging.getLevelName((os.getenv("LOG_LEVEL") or "INFO").strip().upper())
    return level if isinstance(level, int) else logging.INFO


def configure_logging() -> None:
    """Installs the stream handler on the root logger, like `logging.basicConfig` did: only when
    nothing else (pytest, an embedding app) has configured logging already."""
    root = logging.getLogger()
    ours = [h for h in root.handlers if getattr(h, _HANDLER_FLAG, False)]
    if root.handlers and not ours:
        return
    handler = ours[0] if ours else logging.StreamHandler()
    setattr(handler, _HANDLER_FLAG, True)
    use_json = (os.getenv("LOG_FORMAT") or "").strip().lower() == "json"
    handler.setFormatter(JsonFormatter() if use_json else logging.Formatter(TEXT_FORMAT))
    if not any(isinstance(f, RequestIdFilter) for f in handler.filters):
        handler.addFilter(RequestIdFilter())
    if not ours:
        root.addHandler(handler)
    root.setLevel(log_level())


def init_request_ids(app: Flask) -> None:
    """Gives each request an id (see the module docstring)."""

    @app.before_request
    def _assign_request_id() -> None:
        incoming = request.headers.get(REQUEST_ID_HEADER, "")
        g.request_id = incoming if _VALID_REQUEST_ID.fullmatch(incoming) else uuid.uuid4().hex

    @app.after_request
    def _echo_request_id(response):
        if getattr(g, "request_id", None):
            response.headers.setdefault(REQUEST_ID_HEADER, g.request_id)
        return response
