# backend/app/utils/rate_limit.py
import threading
import time
from collections import defaultdict


class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter per client identifier with auto-pruning."""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60, prune_interval: int = 50):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.prune_interval = prune_interval
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()
        self._call_count = 0

    def is_allowed(self, client_key: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        with self._lock:
            self._call_count += 1
            if self._call_count >= self.prune_interval:
                self._prune_stale_keys(cutoff)
                self._call_count = 0

            timestamps = self._requests[client_key]
            filtered = [t for t in timestamps if t > cutoff]
            if len(filtered) >= self.max_requests:
                self._requests[client_key] = filtered
                return False
            filtered.append(now)
            self._requests[client_key] = filtered
            return True

    def _prune_stale_keys(self, cutoff: float) -> None:
        stale_keys = [k for k, v in self._requests.items() if not v or max(v) <= cutoff]
        for k in stale_keys:
            del self._requests[k]

    def reset(self) -> None:
        with self._lock:
            self._requests.clear()
            self._call_count = 0
