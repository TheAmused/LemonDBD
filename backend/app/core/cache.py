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

    def get(self, key: Any) -> Any:
        now = time.monotonic()
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            val, expire_at = entry
            if now > expire_at:
                try:
                    del self._cache[key]
                except KeyError:
                    pass
                return None
            return val

    def set(self, key: Any, value: Any, ttl: float | None = None) -> None:
        now = time.monotonic()
        duration = ttl if ttl is not None else self._default_ttl
        with self._lock:
            if len(self._cache) >= self._maxsize:
                # Evict expired keys or oldest entries
                expired_keys = [k for k, (_, exp) in self._cache.items() if now > exp]
                if expired_keys:
                    for k in expired_keys:
                        del self._cache[k]
                else:
                    # Remove first inserted item (FIFO eviction)
                    try:
                        first_key = next(iter(self._cache))
                        del self._cache[first_key]
                    except StopIteration:
                        pass
            self._cache[key] = (value, now + duration)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def size(self) -> int:
        with self._lock:
            return len(self._cache)


# Global catalog in-memory cache instance (60s default TTL)
catalog_cache = SimpleTTLCache(maxsize=2000, default_ttl=60.0)
