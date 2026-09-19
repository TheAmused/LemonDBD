# backend/app/models/base.py
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Self, overload

from app.core.json_provider import safe_json_dumps, safe_json_loads


def utcnow() -> datetime:
    """Returns current UTC timestamp with timezone awareness."""
    return datetime.now(timezone.utc)


class JsonField[T]:
    """Typed read/write view over a Text column that stores JSON.

    `run.completed_killers` parses `run.completed_killers_json` (missing or
    broken JSON reads as a fresh `default()`), and assigning to it writes the
    column back. The column stays the stored and exported source of truth."""

    def __init__(self, column: str, default: Callable[[], T]) -> None:
        self.column = column
        self.default = default
        self.empty_json = safe_json_dumps(default())

    @overload
    def __get__(self, obj: None, owner: type) -> Self: ...
    @overload
    def __get__(self, obj: object, owner: type) -> T: ...
    def __get__(self, obj: object | None, owner: type) -> "T | Self":
        if obj is None:
            return self
        value: T | None = safe_json_loads(getattr(obj, self.column))
        return self.default() if value is None else value

    def __set__(self, obj: object, value: T) -> None:
        setattr(obj, self.column, safe_json_dumps(value, default_val=self.empty_json))
