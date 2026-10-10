# backend/scripts/normalize_export/rows.py
"""Small helpers for reshaping one seed row."""
from __future__ import annotations

from typing import Any


def drop_null_keys(row: dict[str, Any], *keys: str) -> dict[str, Any]:
    """Remove a foreign key that is null because it does not apply.

    An add-on points at a killer or at an item class -- 880 of the 935 at a
    killer -- so one of the two keys is always null, and writing
    `"item_category_id": null` onto every killer add-on states the same
    not-applicable 880 times. The importer reads both keys with `.get()`, so an
    absent key means null; the CHECK constraint is what actually guarantees
    only one is ever set.
    """
    for key in keys:
        if row.get(key) is None:
            row.pop(key, None)
    return row


def prune(row: dict[str, Any], *drop: str) -> dict[str, Any]:
    return {k: v for k, v in row.items() if k not in drop}


def ordered(row: dict[str, Any], *first: str) -> dict[str, Any]:
    """Put `id` and the foreign keys at the top of each record."""
    head = {k: row[k] for k in first if k in row}
    return {**head, **{k: v for k, v in row.items() if k not in head}}
