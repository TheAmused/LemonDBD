# backend/app/core/limiter.py
import ipaddress
import logging
import os
from collections.abc import Sequence
from typing import Any
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
    try:
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
    except Exception:
        return "127.0.0.1"


def validate_honeypot(
    data: dict[str, Any] | None,
    field_names: Sequence[str] = ("website_trap", "honeypot_verification", "company_fax"),
) -> bool:
    """
    Validates honeypot fields.
    Returns False if any field in field_names is present in data with a non-empty string or boolean True,
    True otherwise. Whitespace-only strings, None, and False are treated as benign empty inputs.
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
        elif val is not None and not isinstance(val, bool) and bool(val):
            return False
    return True


# The exact loopback / RFC1918 docker-internal ranges exempted at the nginx
# layer (see nginx/default.conf's $limit_key geo map). Deliberately narrower
# than ipaddress's built-in is_private, which also covers RFC 5737
# documentation/test-net ranges (e.g. 192.0.2.0/24) that are NOT local
# traffic and must stay rate-limited.
_LOCAL_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("::1/128"),
]


def is_local_traffic() -> bool:
    """
    True for requests originating from loopback or private/docker-internal
    networks. Mirrors the nginx-layer exemption so that trusted local/dev/test
    traffic isn't also throttled by this in-app limiter after already being
    let through nginx.
    """
    try:
        ip = ipaddress.ip_address(get_client_ip())
        return any(ip in net for net in _LOCAL_NETWORKS)
    except ValueError:
        return False


limiter = Limiter(
    key_func=get_client_ip,
    default_limits=[],
    storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "memory://"),
    strategy="fixed-window",
    enabled=os.getenv("RATELIMIT_ENABLED", "true").lower() in ("true", "1", "yes"),
)
limiter.request_filter(is_local_traffic)