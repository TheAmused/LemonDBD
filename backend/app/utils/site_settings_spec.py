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


SETTING_SPECS: tuple[SettingSpec, ...] = (
    SettingSpec("contact_email", "email", "privacy"),
    SettingSpec("verification_code_hours", "int", "tokens", minimum=1, maximum=168),
    SettingSpec("reset_token_minutes", "int", "tokens", minimum=5, maximum=1440),
    SettingSpec("session_hours", "int", "tokens", minimum=1, maximum=720),
    SettingSpec("streak_prune_days", "int", "retention", minimum=7, maximum=3650),
)

SPEC_BY_KEY: dict[str, SettingSpec] = {s.key: s for s in SETTING_SPECS}


def validate_setting(key: str, raw: Any) -> str | int:
    """Return the cleaned value or raise ValueError with a human-readable message."""
    spec = SPEC_BY_KEY.get(key)
    if spec is None:
        raise ValueError(f"Unknown setting '{key}'.")

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
