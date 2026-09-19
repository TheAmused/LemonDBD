# backend/app/models/base.py
from collections.abc import Set
from datetime import datetime, timezone
from typing import ClassVar, cast

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict, MutableList
from sqlalchemy.orm import object_mapper


def utcnow() -> datetime:
    """Returns current UTC timestamp with timezone awareness."""
    return datetime.now(timezone.utc)


# Mutable so in-place changes are saved; one type instance each, since
# as_mutable matches columns by type identity.
JSON_LIST = MutableList.as_mutable(JSONB().with_variant(JSON(), "sqlite"))
JSON_DICT = MutableDict.as_mutable(JSONB().with_variant(JSON(), "sqlite"))


def column_dict(obj: object, exclude: Set[str] = frozenset()) -> dict[str, object]:
    """Every mapped column of `obj` under its attribute name, datetimes as ISO strings."""
    row: dict[str, object] = {}
    for key in object_mapper(obj).columns.keys():
        if key in exclude:
            continue
        value = getattr(obj, key)
        row[key] = value.isoformat() if isinstance(value, datetime) else value
    return row


class ColumnDictMixin[DictT]:
    """`to_dict()` from the model's columns, typed as the API TypedDict `DictT`."""

    _api_exclude: ClassVar[frozenset[str]] = frozenset()

    def to_dict(self) -> DictT:
        return cast(DictT, column_dict(self, self._api_exclude))
