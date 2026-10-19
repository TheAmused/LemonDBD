# backend/app/core/catalog_memo.py
"""A per-worker memo for catalog queries that are called outside `@cache_catalog`.

The gauntlet and page-streak services call the perk and character queries
directly, with no HTTP layer in front of them, so those queries keep a small
in-process cache. It used to be a bare TTL dict that nothing could invalidate:
`bump_catalog_version()` cleared Redis, the next request rebuilt its answer
from the worker's stale copy, and `@cache_catalog` then filed that stale answer
under the *new* generation for a day.

Here the generation is part of every key, so a bump makes every worker's copy
unreachable at once (workers read the shared generation from Redis, cached for
a second), and the value is filed under the generation read *before* it was
computed, so a bump that lands mid-query leaves the result under a generation
nobody asks for any more. Without Redis the generation is per-worker and a bump
reaches only the worker that ran it; the short TTL bounds the rest.
"""
from __future__ import annotations

from typing import Callable, Hashable, TypeVar

from app.core import redis_cache
from app.core.cache import SimpleTTLCache

T = TypeVar("T")

#: Bounded because a single entry can be a whole perk page.
_memo = SimpleTTLCache(maxsize=512, default_ttl=60.0)
_MISS = object()


def remember(key: tuple[Hashable, ...], compute: Callable[[], T], ttl: float) -> T:
    """`compute()` memoized for `ttl` seconds within the current catalog generation.

    A `None` result is returned but not kept (it means "not found", and the
    row may be added by the next seed). An exception from `compute` propagates
    and is never kept.
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
