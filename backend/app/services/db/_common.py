# backend/app/services/db/_common.py
"""Helpers shared by the DB export/import modules."""

from __future__ import annotations

from datetime import datetime


def parse_datetime(val: str | datetime | None) -> datetime | None:
    """ISO-8601 string (a trailing `Z` is accepted) or `datetime` -> `datetime`.

    Empty or unparseable input yields None rather than raising, so one bad
    timestamp in an export never aborts an import.
    """
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except Exception:
        return None
