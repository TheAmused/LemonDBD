# backend/app/core/limiter.py
import logging
import os
from typing import Any, Dict, Optional, Sequence
from flask import request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

logger = logging.getLogger(__name__)


def get_client_ip() -> str:
    """
    Retrieves the client's real IP address.
    Checks X-Real-IP header first (which Nginx sets directly from $remote_addr and cannot be client-spoofed),
    then falls back to X-Forwarded-For (first comma-separated IP),
    and finally Flask-Limiter's get_remote_address.
    """
    real_ip = request.headers.get("X-Real-IP")
    if real_ip and real_ip.strip():
        return real_ip.strip()

    forwarded = request.headers.getlist("X-Forwarded-For")
    if forwarded:
        for entry in forwarded:
            ips = [ip.strip() for ip in entry.split(",") if ip.strip()]
            if ips:
                return ips[0]
    return get_remote_address()


def validate_honeypot(
    data: Optional[Dict[str, Any]],
    field_names: Sequence[str] = ("website_trap", "honeypot_verification", "company_fax"),
) -> bool:
    """
    Validates honeypot fields.
    Returns False if any field in field_names is present in data with a non-empty string or boolean True,
    True otherwise.
    """
    if not isinstance(data, dict):
        return True

    for field in field_names:
        val = data.get(field)
        if isinstance(val, str):
            if val.strip():
                return False
        elif val is True:
            return False
        elif val is not None and not isinstance(val, bool) and val:
            return False
    return True


limiter = Limiter(
    key_func=get_client_ip,
    default_limits=[],
    storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "memory://"),
    strategy="fixed-window",
)
