# backend/app/models/base.py
from collections.abc import Set
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, ClassVar, cast

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
    """Every mapped column of `obj` under its attribute name, datetimes and dates as ISO strings."""
    row: dict[str, object] = {}
    for key in object_mapper(obj).columns.keys():
        if key in exclude:
            continue
        value = getattr(obj, key)
        if isinstance(value, (datetime, date)):
            row[key] = value.isoformat()
        elif isinstance(value, Decimal):
            row[key] = format(value, "f")
        else:
            row[key] = value
    return row


class ColumnDictMixin[DictT = dict[str, Any]]:
    """`to_dict()` from the model's columns, typed as the API TypedDict `DictT`."""

    _api_exclude: ClassVar[frozenset[str]] = frozenset()

    def to_dict(self) -> DictT:
        return cast(DictT, column_dict(self, self._api_exclude))


class TranslatableModelMixin:
    """Provides unified translation dictionary access across domain models."""

    def get_translation(self, lang: str | None) -> dict[str, Any]:
        """Return the dictionary of translated fields for the given language, or empty dict."""
        if not lang:
            return {}
        translations = getattr(self, "translations", None)
        if not isinstance(translations, dict):
            return {}
        entry = translations.get(lang)
        return entry if isinstance(entry, dict) else {}

    def localized(
        self,
        lang: str | None,
        field: str | None = None,
        fallback: Any = "",
    ) -> Any:
        """Resolve a localized field for `lang`, falling back to `fallback` if not set."""
        if field is None:
            return self.get_translation(lang)
        entry = self.get_translation(lang)
        val = entry.get(field)
        if val is not None and val != "":
            return str(val) if isinstance(fallback, str) else val
        return fallback

    def localized_name(self, lang: str | None = None) -> str:
        """Name in `lang`, falling back to canonical English name."""
        name = getattr(self, "name", None) or getattr(self, "title", "")
        return str(self.localized(lang, "name", name))
