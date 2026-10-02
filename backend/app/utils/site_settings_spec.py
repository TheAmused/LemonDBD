# backend/app/utils/site_settings_spec.py
"""Definition and validation of the admin-editable site settings (pure, no app imports)."""
import re
from dataclasses import dataclass
from typing import Any

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass(frozen=True)
class SettingSpec:
    key: str
    kind: str  # "int" | "email"
    group: str
    minimum: int | None = None
    maximum: int | None = None
    max_length: int = 150


# A page id is the first URL segment after the locale (the route folder name). The backend does not
# keep a list of pages: the frontend discovers them from its route folders, and any slug can be
# switched off, so a new page never needs a backend change. Which routes can never be switched off
# (admin, user, ...) is decided by the frontend proxy and panel.
_PAGE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,40}$")
MAX_DISABLED_PAGES = 40


def is_page_id(value: Any) -> bool:
    return isinstance(value, str) and bool(_PAGE_ID_RE.match(value))


def parse_pages(raw: Any) -> list[str]:
    """Normalise a comma string / list of page ids: valid slugs only, de-duplicated, sorted."""
    if raw is None:
        return []
    items = raw if isinstance(raw, (list, tuple, set)) else str(raw).split(",")
    wanted = {str(item).strip() for item in items if str(item).strip()}
    for page in wanted:
        if not is_page_id(page):
            raise ValueError(f"Invalid page id '{page}'.")
    if len(wanted) > MAX_DISABLED_PAGES:
        raise ValueError("Too many pages.")
    return sorted(wanted)


SETTING_SPECS: tuple[SettingSpec, ...] = (
    SettingSpec("contact_email", "email", "privacy"),
    SettingSpec("verification_code_hours", "int", "tokens", minimum=1, maximum=168),
    SettingSpec("reset_token_minutes", "int", "tokens", minimum=5, maximum=1440),
    SettingSpec("session_hours", "int", "tokens", minimum=1, maximum=720),
    SettingSpec("streak_prune_days", "int", "retention", minimum=7, maximum=3650),
    SettingSpec("disabled_pages", "pages", "pages", max_length=255),
)

SPEC_BY_KEY: dict[str, SettingSpec] = {s.key: s for s in SETTING_SPECS}


def validate_setting(key: str, raw: Any) -> str | int:
    """Return the cleaned value or raise ValueError with a human-readable message."""
    spec = SPEC_BY_KEY.get(key)
    if spec is None:
        raise ValueError(f"Unknown setting '{key}'.")

    if spec.kind == "pages":
        return ",".join(parse_pages(raw))

    if spec.kind == "email":
        value = str(raw or "").strip()
        if not value or len(value) > spec.max_length or not _EMAIL_RE.match(value):
            raise ValueError("Enter a valid email address.")
        return value

    if isinstance(raw, bool) or isinstance(raw, float) and not float(raw).is_integer():
        raise ValueError(f"'{key}' must be a whole number.")
    try:
        number = int(str(raw).strip())
    except (TypeError, ValueError):
        raise ValueError(f"'{key}' must be a whole number.") from None
    if spec.minimum is not None and number < spec.minimum:
        raise ValueError(f"'{key}' must be at least {spec.minimum}.")
    if spec.maximum is not None and number > spec.maximum:
        raise ValueError(f"'{key}' must be at most {spec.maximum}.")
    return number
