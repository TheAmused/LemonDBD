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

The counter is seeded from the clock: Redis runs without persistence, and a
counter restarting at 1 would repeat generations browsers still hold ETags for.

**A cache must never be able to take the site down.** A failed Redis call trips
a circuit breaker that skips Redis for `RETRY_AFTER_SECONDS` and serves from the
in-process fallback.

`REDIS_URL` is the cache and may evict. `LIMITS_REDIS_URL` holds rate-limit
counters and single-use ALTCHA records, which cache traffic must not evict;
unset, they use the cache instance.
"""
from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any

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

#: After a failure, Redis is not tried again for this long.
RETRY_AFTER_SECONDS = 30.0

#: The fallback when Redis is absent or unreachable. Short TTL on purpose: it is
#: per-worker and cannot be invalidated across workers, so it must not hold
#: anything for long.
_local = SimpleTTLCache(maxsize=512, default_ttl=60.0)


def _now_ms() -> int:
    return int(time.time() * 1000)


class _Link:
    """One Redis connection and its circuit breaker."""

    def __init__(self, env_name: str, fallback: _Link | None = None) -> None:
        self.env_name = env_name
        self.fallback = fallback
        self.client: Any = None
        self.lock = threading.Lock()
        self.down_until = 0.0
        self.outage_logged = False

    def get(self) -> Any:
        """The connected client, or None when unconfigured, down or still connecting."""
        url = os.getenv(self.env_name)
        if not url:
            return self.fallback.get() if self.fallback else None
        if time.monotonic() < self.down_until:
            return None
        if self.client is not None:
            return self.client
        # One thread connects; the rest use the fallback rather than queue.
        if not self.lock.acquire(blocking=False):
            return None
        try:
            if self.client is None:
                self.client = self._connect(url)
        except Exception as exc:  # redis missing, refused, wrong URL, timeout
            self.mark_down(exc)
            return None
        finally:
            self.lock.release()
        return self.client

    def _connect(self, url: str) -> Any:
        import redis  # imported lazily so the app runs without the package

        client = redis.Redis.from_url(
            url,
            socket_timeout=0.25,
            socket_connect_timeout=0.25,
            health_check_interval=30,
        )
        client.ping()
        logger.info("[cache] Redis connected at %s (%s)", url.split("@")[-1], self.env_name)
        self.mark_up()
        return client

    def mark_down(self, exc: Exception) -> None:
        """Skip Redis for a while; warn once per outage."""
        self.down_until = time.monotonic() + RETRY_AFTER_SECONDS
        if not self.outage_logged:
            self.outage_logged = True
            logger.warning(
                "[cache] Redis unavailable (%s); falling back to a per-worker "
                "in-memory cache for %.0fs. The app works, it is just no longer "
                "sharing one cache across gunicorn workers.", exc, RETRY_AFTER_SECONDS,
            )

    def mark_up(self) -> None:
        if self.outage_logged:
            self.outage_logged = False
            logger.info("[cache] Redis is reachable again (%s)", self.env_name)


_catalog_link = _Link("REDIS_URL")
_limits_link = _Link("LIMITS_REDIS_URL", fallback=_catalog_link)

_version_cache: tuple[int, float] | None = None
_local_catalog_version: int = _now_ms()


def get_client() -> Any:
    """The shared cache client, or None when Redis is not configured/reachable."""
    return _catalog_link.get()


def get_limits_client() -> Any:
    """The client for state that must not be evicted (ALTCHA replay records)."""
    return _limits_link.get()


def report_limits_failure(exc: Exception) -> None:
    """Let the breaker know a call on the limits client failed."""
    _limits_link.mark_down(exc)


def is_enabled() -> bool:
    return get_client() is not None


# ---------------------------------------------------------------- versioning

def _read_version(client: Any) -> int:
    raw = client.get(VERSION_KEY)
    if raw is None:
        client.set(VERSION_KEY, _now_ms(), nx=True)
        raw = client.get(VERSION_KEY)
    return int(raw)


def catalog_version(*, fresh: bool = False) -> int:
    """The current catalog generation, cached in-process for a second.

    `fresh=True` bypasses that second, for the check before storing a result.
    """
    global _version_cache

    now = time.monotonic()
    if not fresh and _version_cache and now - _version_cache[1] < 1.0:
        return _version_cache[0]

    client = get_client()
    if client is None:
        _version_cache = (_local_catalog_version, now)
        return _local_catalog_version

    version = _local_catalog_version
    try:
        version = _read_version(client)
        _catalog_link.mark_up()
    except Exception as exc:
        _catalog_link.mark_down(exc)
    _version_cache = (version, now)
    return version


def bump_catalog_version() -> int:
    """Invalidates every cached catalog entry at once.

    Call this after anything that changes what a catalog endpoint would return:
    a seed run, a seed patch, an admin kill-switch toggle.
    """
    global _version_cache, _local_catalog_version
    _version_cache = None
    _local.clear()

    client = get_client()
    if client is not None:
        try:
            client.set(VERSION_KEY, _now_ms(), nx=True)
            version = int(client.incr(VERSION_KEY))
            _catalog_link.mark_up()
            logger.info("[cache] catalog invalidated, now at version %d", version)
            return version
        except Exception as exc:
            _catalog_link.mark_down(exc)
    _local_catalog_version += 1
    return _local_catalog_version


# ------------------------------------------------------------------ get/set

def _versioned(key: str, version: int | None = None) -> str:
    return f"{NAMESPACE}:cat:v{catalog_version() if version is None else version}:{key}"


def get_raw(key: str, *, version: int | None = None) -> bytes | None:
    """The stored bytes for `key` in generation `version` (default: current)."""
    full = _versioned(key, version)
    client = get_client()
    if client is not None:
        try:
            raw = client.get(full)
            _catalog_link.mark_up()
            return raw
        except Exception as exc:
            _catalog_link.mark_down(exc)
    return _local.get(full)


def set_raw(key: str, value: bytes, ttl: int | None = None, *, version: int | None = None) -> None:
    full = _versioned(key, version)
    duration = DEFAULT_TTL if ttl is None else ttl
    client = get_client()
    if client is not None:
        try:
            client.setex(full, duration, value)
            _catalog_link.mark_up()
            return
        except Exception as exc:
            _catalog_link.mark_down(exc)
    # Deliberately capped: the fallback is per-worker and un-invalidatable
    # across workers, so it holds things for a minute, not a day.
    _local.set(full, value, ttl=min(duration, 60.0))


def delete(key: str) -> None:
    """Drop `key` from the current generation, here and in the local fallback."""
    full = _versioned(key)
    _local.delete(full)
    client = get_client()
    if client is not None:
        try:
            client.delete(full)
            _catalog_link.mark_up()
        except Exception as exc:
            _catalog_link.mark_down(exc)


def get(key: str, *, version: int | None = None) -> Any:
    raw = get_raw(key, version=version)
    return None if raw is None else safe_json_loads(raw, default=None)


def set(key: str, value: Any, ttl: int | None = None, *, version: int | None = None) -> None:
    set_raw(key, safe_json_dumps(value).encode("utf-8"), ttl=ttl, version=version)


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
            _catalog_link.mark_down(exc)
    return info
