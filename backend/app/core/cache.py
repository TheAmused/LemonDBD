# backend/app/core/cache.py
import logging
import threading
import time
from typing import Any

logger = logging.getLogger(__name__)


class SimpleTTLCache:
    """Thread-safe in-memory cache with Time-To-Live (TTL) expiration and max capacity."""

    def __init__(self, maxsize: int = 2000, default_ttl: float = 60.0):
        self._maxsize = maxsize
        self._default_ttl = default_ttl
        self._cache: dict[Any, tuple[Any, float]] = {}
        self._lock = threading.Lock()

    def get(self, key: Any, default: Any = None) -> Any:
        """The cached value, or `default` on a miss.

        A caller that stores `None` on purpose passes its own sentinel as
        `default` to tell a cached `None` from a miss. Values are returned by
        reference, so callers must treat them as read-only.
        """
        now = time.monotonic()
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return default
            val, expire_at = entry
            if now > expire_at:
                del self._cache[key]
                return default
            return val

    def set(self, key: Any, value: Any, ttl: float | None = None) -> None:
        now = time.monotonic()
        duration = ttl if ttl is not None else self._default_ttl
        with self._lock:
            # Re-inserting moves a refreshed key to the back of the eviction
            # order, and replacing an existing key never needs to make room.
            replacing = self._cache.pop(key, None) is not None
            if not replacing and len(self._cache) >= self._maxsize:
                expired_keys = [k for k, (_, exp) in self._cache.items() if now > exp]
                if expired_keys:
                    for k in expired_keys:
                        del self._cache[k]
                else:
                    # Evict the entry that was written longest ago.
                    del self._cache[next(iter(self._cache))]
            self._cache[key] = (value, now + duration)

    def delete(self, key: Any) -> None:
        with self._lock:
            self._cache.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def size(self) -> int:
        with self._lock:
            return len(self._cache)
