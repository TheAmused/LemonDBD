# backend/app/services/page_streak/helpers.py
from typing import Any, Optional

DEFAULT_PERKS_PER_PAGE: int = 15
BUILD_SIZE: int = 4
GENERAL_CHARACTER: str = "General"


def to_utc_iso(value: Any) -> Optional[str]:
    """Normalize a stored datetime or timestamp string into an ISO-8601 UTC string."""
    if not value:
        return value
    if hasattr(value, "isoformat"):
        return value.isoformat() + ("" if str(value).endswith("Z") else "Z")
    val_str = str(value)
    if val_str.endswith("Z"):
        return val_str
    if len(val_str) == 19 and val_str[10] == " ":
        return val_str[:10] + "T" + val_str[11:] + "Z"
    return val_str

