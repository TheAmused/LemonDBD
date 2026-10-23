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


def _is_trusted_proxy(address: str | None) -> bool:
    """True when the TCP peer is on the docker / loopback network, i.e. it is nginx.

    Only such a peer may tell us who the client is. The backend port is not published
    outside the host, so a public client never connects to it directly; if it ever were,
    its forwarding headers are ignored rather than believed.
    """
    try:
        ip = ipaddress.ip_address((address or "").strip())
    except ValueError:
        return False
    return any(ip in net for net in _LOCAL_NETWORKS)


def get_client_ip() -> str:
    """
    Retrieves the client's real IP address.

    X-Real-IP (set by nginx from $remote_addr) and then the first X-Forwarded-For entry are
    honoured only when the request itself came from a trusted proxy (nginx on the docker
    network). Anything else is keyed on the TCP peer, so a forged header cannot pick another
    client's bucket or claim to be local traffic and skip every limit.
    """
    try:
        peer = get_remote_address()
        if not _is_trusted_proxy(peer):
            return peer

        real_ip = request.headers.get("X-Real-IP")
        if real_ip and real_ip.strip():
            return real_ip.strip()

        forwarded = request.headers.getlist("X-Forwarded-For")
        if forwarded:
            for entry in forwarded:
                ips = [ip.strip() for ip in entry.split(",") if ip.strip()]
                if ips:
                    return ips[0]
        return peer
    except RuntimeError:
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


def _ratelimit_storage_uri() -> str:
    """Where the limiter keeps its counters.

    `memory://` under gunicorn is one counter set per worker, so a "5 per
    minute" limit lets 5 requests through per worker -- 20 with the default 4
    workers, and the caller only has to be unlucky with the load balancer to
    find that out. Redis, where it is configured, is the one counter all the
    workers increment, which is the number the limit was written as.
    """
    explicit = os.getenv("RATELIMIT_STORAGE_URI")
    if explicit:
        return explicit

    # The counters go to the instance that never evicts, when there is one.
    redis_url = os.getenv("LIMITS_REDIS_URL") or os.getenv("REDIS_URL")
    if not redis_url:
        return "memory://"
    try:
        # Unlike the catalog cache, Flask-Limiter has no fallback of its own:
        # handed a redis:// URI it cannot open, it raises at init_app and the
        # app never starts. `redis` is an optional dependency here, so the
        # import is checked before the limiter is told to rely on it.
        import redis  # noqa: F401
    except ImportError:
        logger.warning(
            "[limiter] a Redis URL is set but the redis package is not installed; "
            "rate-limit counters stay per-worker and every limit is effectively "
            "multiplied by the worker count."
        )
        return "memory://"
    return redis_url


limiter = Limiter(
    key_func=get_client_ip,
    default_limits=[],
    storage_uri=_ratelimit_storage_uri(),
    strategy="fixed-window",
    enabled=os.getenv("RATELIMIT_ENABLED", "true").lower() in ("true", "1", "yes"),
)
limiter.request_filter(is_local_traffic)