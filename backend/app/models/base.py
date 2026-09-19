# backend/app/models/base.py
from datetime import datetime, timezone

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict, MutableList


def utcnow() -> datetime:
    """Returns current UTC timestamp with timezone awareness."""
    return datetime.now(timezone.utc)


# Mutable wrappers: services read a list, change it in place and assign the
# same object back, which a plain JSON column would not see as a change.
# Each wrapper needs its own type instance: as_mutable matches columns by the
# identity of the type object it was given.
JSON_LIST = MutableList.as_mutable(JSONB().with_variant(JSON(), "sqlite"))
JSON_DICT = MutableDict.as_mutable(JSONB().with_variant(JSON(), "sqlite"))
