# backend/app/core/catalog_memo.py
"""A per-worker memo for catalog queries called outside `@cache_catalog`.

The gauntlet and page-streak services call the perk and character queries
directly. The catalog generation is part of every key, so a bump makes every
worker's copy unreachable, and a result is filed under the generation read
*before* it was computed, so a bump landing mid-query cannot keep stale rows.
Without Redis the generation is per-worker; the short TTL bounds the rest.
"""
from __future__ import annotations

from typing import Callable, Hashable, TypeVar

from app.core import redis_cache
from app.core.cache import SimpleTTLCache

T = TypeVar("T")

_memo = SimpleTTLCache(maxsize=512, default_ttl=60.0)
_MISS = object()


def remember(key: tuple[Hashable, ...], compute: Callable[[], T], ttl: float) -> T:
    """`compute()` memoized for `ttl` seconds within the current catalog generation.

    A `None` result ("not found") and an exception are never kept.
    """
    version = redis_cache.catalog_version()
    full = (version, *key)
    hit = _memo.get(full, _MISS)
    if hit is not _MISS:
        return hit  # type: ignore[return-value]
    value = compute()
    if value is not None:
        _memo.set(full, value, ttl=ttl)
    return value


def clear() -> None:
    _memo.clear()
