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


# Mutable wrappers: services read a list, change it in place and assign the
# same object back, which a plain JSON column would not see as a change.
# Each wrapper needs its own type instance: as_mutable matches columns by the
# identity of the type object it was given.
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
    """`to_dict()` built from the model's columns instead of a hand-kept key
    list. `DictT` is the API TypedDict; test_streak_to_dict_matches_its_typed_shape
    fails if a column and that type drift apart."""

    _api_exclude: ClassVar[frozenset[str]] = frozenset()

    def to_dict(self) -> DictT:
        return cast(DictT, column_dict(self, self._api_exclude))
