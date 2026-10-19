# backend/tests/unit/redis_support.py
"""A dict-backed stand-in for the few redis-py calls the cache layer makes."""
from __future__ import annotations

from typing import Any


def _as_bytes(value: Any) -> bytes:
    if isinstance(value, bytes):
        return value
    return str(value).encode("utf-8")


class FakeRedis:
    """Mimics `redis.Redis(decode_responses=False)` for get/set/setex/incr/delete/info."""

    def __init__(self) -> None:
        self.data: dict[str, bytes] = {}
        self.ttls: dict[str, int] = {}
        self.fail = False

    def _check(self) -> None:
        if self.fail:
            raise ConnectionError("fake redis is down")

    def get(self, key: str) -> bytes | None:
        self._check()
        return self.data.get(key)

    def set(self, key: str, value: Any, nx: bool = False, ex: int | None = None) -> bool | None:
        self._check()
        if nx and key in self.data:
            return None
        self.data[key] = _as_bytes(value)
        if ex is not None:
            self.ttls[key] = ex
        return True

    def setex(self, key: str, seconds: int, value: Any) -> bool:
        self._check()
        self.data[key] = _as_bytes(value)
        self.ttls[key] = seconds
        return True

    def incr(self, key: str) -> int:
        self._check()
        value = int(self.data.get(key, b"0")) + 1
        self.data[key] = str(value).encode("ascii")
        return value

    def delete(self, key: str) -> int:
        self._check()
        return 1 if self.data.pop(key, None) is not None else 0

    def info(self, section: str = "") -> dict[str, int]:
        self._check()
        return {"keyspace_hits": 0, "keyspace_misses": 0}

    def ping(self) -> bool:
        self._check()
        return True

    def entry_keys(self) -> list[str]:
        """The catalog entries, without the version counter."""
        return [k for k in self.data if ":cat:v" in k]
