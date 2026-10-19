# backend/app/core/altcha_guard.py
"""Server-side check of the ALTCHA proof-of-work the web client solves before it signs up,
signs in, asks for a password reset or files a guest bug report.

The client has always sent the solved challenge as the `altcha` field; until this module nothing on
the server looked at it, so a bot that skipped the widget and called the API directly got through.

A solved challenge is single-use: its signature is remembered until the challenge would have
expired anyway (Redis `SET NX EX` when REDIS_URL is set -- one record for all gunicorn workers --
otherwise a per-process dict), so a captured payload cannot be replayed.
"""
from __future__ import annotations

import logging
import threading
import time
from collections.abc import Callable
from functools import wraps
from typing import Any

from flask import current_app, jsonify, request

from app.core.redis_cache import get_limits_client, report_limits_failure
from app.services.altcha_service import AltchaService

logger = logging.getLogger(__name__)

ALTCHA_ERROR_CODE = "altcha_failed"
ALTCHA_ERROR_MESSAGE = "Security check failed. Wait a moment for it to finish and try again."
_REDIS_PREFIX = "lemondbd:altcha:used:"
_MAX_LOCAL_ENTRIES = 20000

_used: dict[str, float] = {}
_used_lock = threading.Lock()


def altcha_enforced() -> bool:
    """On unless switched off: the admin setting `altcha_enforced`, which starts from ALTCHA_ENFORCED (the test config turns it off)."""
    from app.services.site_settings import altcha_enforced as setting

    return setting()


def _claim(signature: str, expires: float) -> bool:
    """True the first time this solved challenge is presented, False for a replay."""
    ttl = max(1, int(expires - time.time()) + 5)
    client = get_limits_client()
    if client is not None:
        try:
            return bool(client.set(f"{_REDIS_PREFIX}{signature}", "1", nx=True, ex=ttl))
        except Exception as exc:  # a broken Redis must not lock everyone out
            report_limits_failure(exc)
            logger.warning("[altcha] Redis replay check failed (%s); using the in-process record", exc)

    now = time.time()
    with _used_lock:
        if len(_used) >= _MAX_LOCAL_ENTRIES:
            for key in [k for k, until in _used.items() if until < now]:
                del _used[key]
            # Still full of live records: bound the memory by dropping the
            # oldest instead of growing for as long as the flood lasts.
            while len(_used) >= _MAX_LOCAL_ENTRIES:
                del _used[next(iter(_used))]
        if signature in _used and _used[signature] >= now:
            return False
        _used[signature] = now + ttl
        return True


def altcha_failure(payload: Any) -> str | None:
    """None when `payload` is a valid, unused solution; otherwise the reason."""
    secret = current_app.config.get("SECRET_KEY") or ""
    ok, reason = AltchaService.verify_solution(payload, secret)
    if not ok:
        return reason
    try:
        expires = float(payload["expires"])
    except (KeyError, TypeError, ValueError):
        return "Invalid expires timestamp."
    if not _claim(str(payload["signature"]).lower(), expires):
        return "This security check was already used."
    return None


def altcha_rejection(data: dict[str, Any] | None):
    """A ready 400 response when the request's `altcha` field does not check out, else None."""
    if not altcha_enforced():
        return None
    reason = altcha_failure((data or {}).get("altcha"))
    if reason is None:
        return None
    logger.info("[altcha] rejected: %s", reason)
    return jsonify({"error": ALTCHA_ERROR_MESSAGE, "error_code": ALTCHA_ERROR_CODE, "status": 400}), 400


def require_altcha(view: Callable[..., Any]) -> Callable[..., Any]:
    """Route decorator: refuse the request unless its JSON body carries a fresh, valid `altcha`."""

    @wraps(view)
    def wrapper(*args: Any, **kwargs: Any):
        rejected = altcha_rejection(request.get_json(silent=True))
        if rejected is not None:
            return rejected
        return view(*args, **kwargs)

    return wrapper
