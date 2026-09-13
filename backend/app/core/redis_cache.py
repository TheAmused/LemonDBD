# backend/app/core/redis_cache.py
"""A Redis-backed cache for the static catalog, degrading to in-process memory.

Why Redis and not the existing `SimpleTTLCache`: gunicorn runs
`GUNICORN_WORKERS` (4 by default) separate processes. An in-process cache is
therefore four caches, each warmed independently, each holding its own copy,
and none of them invalidated when another worker's request changes the data.
Redis is one cache all four share.

**Invalidation is a version bump, never a scan.** Every key is namespaced with a
counter (`lemondbd:catalog:version`); `bump_catalog_version()` increments it and
the entire old generation becomes unreachable in one round trip, then expires on
its own TTL. The alternative -- `KEYS`/`SCAN` with a pattern -- is O(keyspace)
and blocks the server, which is exactly the kind of thing that looks fine on a
laptop and falls over in production.

**A cache must never be able to take the site down.** Every Redis call here is
wrapped: on any failure the module logs once, flips to the in-process fallback,
and keeps serving. A dead Redis makes the app slower, not broken.
"""
from __future__ import annotations

import logging
import os
import threading
from typing import Any, Callable

from app.core.cache import SimpleTTLCache
from app.core.json_provider import safe_json_dumps, safe_json_loads

logger = logging.getLogger(__name__)

#: Key prefix for everything this module writes, so a shared Redis stays legible.
NAMESPACE = "lemondbd"
VERSION_KEY = f"{NAMESPACE}:catalog:version"

#: How long a catalog entry lives even if nothing bumps the version. This is a
#: backstop against a missed invalidation, not the primary mechanism -- the
#: version bump is. A day is long because the catalog changes when the seeder
#: runs, which is at most once per deploy.
DEFAULT_TTL = int(os.getenv("CATALOG_CACHE_TTL", "86400"))

#: The fallback when Redis is absent or unreachable. Short TTL on purpose: it is
#: per-worker and cannot be invalidated across workers, so it must not hold
#: anything for long.
_local = SimpleTTLCache(maxsize=512, default_ttl=60.0)

_client: Any = None
_client_lock = threading.Lock()
_unavailable_logged = False
_version_cache: tuple[int, float] | None = None


def _log_unavailable(exc: Exception) -> None:
    """Warn once, then stay quiet -- a broken Redis must not flood the log."""
    global _unavailable_logged
    if not _unavailable_logged:
        _unavailable_logged = True
        logger.warning(
            "[cache] Redis unavailable (%s); falling back to a per-worker "
            "in-memory cache. The app works, it is just no longer sharing one "
            "cache across gunicorn workers.", exc,
        )


def get_client() -> Any:
    """The shared Redis client, or None when Redis is not configured/reachable."""
    global _client
    url = os.getenv("REDIS_URL")
    if not url:
        return None
    if _client is not None:
        return _client
    with _client_lock:
        if _client is not None:
            return _client
        try:
            import redis  # imported lazily so the app runs without the package

            client = redis.Redis.from_url(
                url,
                decode_responses=True,
                socket_timeout=0.25,
                socket_connect_timeout=0.25,
                health_check_interval=30,
            )
            client.ping()
            _client = client
            logger.info("[cache] Redis connected at %s", url.split("@")[-1])
        except Exception as exc:  # redis missing, refused, wrong URL, timeout
            _log_unavailable(exc)
            return None
    return _client


def is_enabled() -> bool:
    return get_client() is not None


# ---------------------------------------------------------------- versioning

def catalog_version() -> int:
    """The current catalog generation. Part of every key and every ETag.

    Cached in-process for a second: it is read on every cached request, and a
    round trip per request to learn a number that changes a few times a day is
    the sort of cost a cache is supposed to remove, not add.
    """
    global _version_cache
    import time

    now = time.monotonic()
    if _version_cache and now - _version_cache[1] < 1.0:
        return _version_cache[0]

    version = 1
    client = get_client()
    if client is not None:
        try:
            raw = client.get(VERSION_KEY)
            version = int(raw) if raw is not None else 1
        except Exception as exc:
            _log_unavailable(exc)
    _version_cache = (version, now)
    return version


def bump_catalog_version() -> int:
    """Invalidates every cached catalog entry at once.

    Call this after anything that changes what a catalog endpoint would return:
    a seed run, a seed patch, an admin kill-switch toggle.
    """
    global _version_cache
    _version_cache = None
    _local.clear()

    client = get_client()
    if client is None:
        return 1
    try:
        version = int(client.incr(VERSION_KEY))
        logger.info("[cache] catalog invalidated, now at version %d", version)
        return version
    except Exception as exc:
        _log_unavailable(exc)
        return 1


# ------------------------------------------------------------------ get/set

def _versioned(key: str) -> str:
    return f"{NAMESPACE}:cat:v{catalog_version()}:{key}"


def get(key: str) -> Any:
    full = _versioned(key)
    client = get_client()
    if client is not None:
        try:
            raw = client.get(full)
            if raw is not None:
                return safe_json_loads(raw, default=None)
            return None
        except Exception as exc:
            _log_unavailable(exc)
    return _local.get(full)


def set(key: str, value: Any, ttl: int | None = None) -> None:
    full = _versioned(key)
    duration = DEFAULT_TTL if ttl is None else ttl
    client = get_client()
    if client is not None:
        try:
            client.setex(full, duration, safe_json_dumps(value))
            return
        except Exception as exc:
            _log_unavailable(exc)
    # Deliberately capped: the fallback is per-worker and un-invalidatable
    # across workers, so it holds things for a minute, not a day.
    _local.set(full, value, ttl=min(duration, 60.0))


def get_or_set(key: str, producer: Callable[[], Any], ttl: int | None = None) -> Any:
    hit = get(key)
    if hit is not None:
        return hit
    value = producer()
    if value is not None:
        set(key, value, ttl=ttl)
    return value


def stats() -> dict[str, Any]:
    """For the health endpoint: is the shared cache actually shared right now?"""
    client = get_client()
    info: dict[str, Any] = {
        "backend": "redis" if client is not None else "in-process",
        "catalog_version": catalog_version(),
        "local_entries": _local.size(),
    }
    if client is not None:
        try:
            raw = client.info("stats")
            hits = int(raw.get("keyspace_hits", 0))
            misses = int(raw.get("keyspace_misses", 0))
            info["keyspace_hits"] = hits
            info["keyspace_misses"] = misses
            total = hits + misses
            info["hit_rate"] = round(hits / total * 100, 1) if total else None
        except Exception as exc:
            _log_unavailable(exc)
    return info
