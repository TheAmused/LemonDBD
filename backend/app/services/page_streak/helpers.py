# backend/app/services/page_streak/helpers.py
from typing import Any

DEFAULT_PERKS_PER_PAGE: int = 15
BUILD_SIZE: int = 4
GENERAL_CHARACTER: str = "General"


def to_utc_iso(value: Any) -> str | None:
    """Normalize a stored datetime or timestamp string into an ISO-8601 UTC string."""
    if not value:
        return value
    if hasattr(value, "isoformat"):
        iso = value.isoformat()
        # A tz-aware datetime's isoformat() ends in "+00:00", never "Z" -- checking
        # str(value) here (as this used to) checks the wrong string and always
        # fails, so both suffixes get appended, producing an invalid
        # "...+00:00Z" timestamp that JS's `new Date()` can't parse.
        if iso.endswith("+00:00"):
            return iso[:-6] + "Z"
        if iso.endswith("Z"):
            return iso
        return iso + "Z"
    val_str = str(value)
    if val_str.endswith("Z"):
        return val_str
    if len(val_str) == 19 and val_str[10] == " ":
        return val_str[:10] + "T" + val_str[11:] + "Z"
    return val_str
