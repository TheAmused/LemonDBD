# backend/app/services/site_settings.py
"""Admin-editable settings: a DB override per key, falling back to the config/env default.

Reads never raise (no app context, missing table...): the caller always gets a usable
value. Security-relevant lifetimes are therefore read through here at the moment they
are used, so an admin change takes effect without a restart.
"""
import logging
from datetime import timedelta
from typing import Any

from flask import current_app, has_app_context
from sqlalchemy import select

from app.core.extensions import db
from app.models.admin import SiteSetting
from app.utils.site_settings_spec import SETTING_SPECS, SPEC_BY_KEY, validate_setting

logger = logging.getLogger(__name__)

_FALLBACK_DEFAULTS: dict[str, str | int] = {
    "contact_email": "",
    "verification_code_hours": 24,
    "reset_token_minutes": 60,
    "session_hours": 24,
    "streak_prune_days": 90,
}


def default_value(key: str) -> str | int:
    """The config/env value an unset setting falls back to."""
    cfg = current_app.config if has_app_context() else {}
    if key == "contact_email":
        return cfg.get("PRIVACY_CONTACT_EMAIL") or cfg.get("MAIL_USERNAME") or ""
    if key == "session_hours":
        delta = cfg.get("JWT_ACCESS_TOKEN_EXPIRES")
        if isinstance(delta, timedelta):
            return max(1, int(delta.total_seconds() // 3600))
    if key == "streak_prune_days":
        return int(cfg.get("STREAK_INACTIVITY_PRUNE_DAYS") or _FALLBACK_DEFAULTS[key])
    return _FALLBACK_DEFAULTS[key]


def _overrides() -> dict[str, str]:
    return {row.key: row.value for row in db.session.scalars(select(SiteSetting)).all()}


def get_setting(key: str) -> str | int:
    """Effective value of one setting (override, else default); never raises."""
    spec = SPEC_BY_KEY[key]
    try:
        raw = db.session.scalar(select(SiteSetting.value).where(SiteSetting.key == key))
        if raw is not None:
            return validate_setting(key, raw)
    except Exception as err:  # missing table, no app context, corrupt row...
        if has_app_context():
            db.session.rollback()
        logger.debug("site setting %s: falling back to default (%s)", spec.key, err)
    return default_value(key)


def verification_lifetime() -> timedelta:
    return timedelta(hours=int(get_setting("verification_code_hours")))


def reset_lifetime() -> timedelta:
    return timedelta(minutes=int(get_setting("reset_token_minutes")))


def session_lifetime() -> timedelta:
    return timedelta(hours=int(get_setting("session_hours")))


def streak_prune_days() -> int:
    return int(get_setting("streak_prune_days"))


def contact_email() -> str:
    return str(get_setting("contact_email"))


def list_settings() -> list[dict[str, Any]]:
    """Every setting with its effective value, default, bounds and whether it is overridden."""
    overrides = _overrides()
    rows: list[dict[str, Any]] = []
    for spec in SETTING_SPECS:
        default = default_value(spec.key)
        value = default
        if spec.key in overrides:
            try:
                value = validate_setting(spec.key, overrides[spec.key])
            except ValueError:
                pass
        rows.append({
            "key": spec.key,
            "kind": spec.kind,
            "group": spec.group,
            "value": value,
            "default": default,
            "overridden": spec.key in overrides,
            "min": spec.minimum,
            "max": spec.maximum,
        })
    return rows


def update_settings(changes: dict[str, Any]) -> dict[str, Any]:
    """Apply ``{key: value}`` changes (``None`` clears the override). Returns ``{key: new_value}``.

    Raises ValueError (before touching the database) when any entry is invalid.
    """
    cleaned: dict[str, str | int | None] = {}
    for key, raw in changes.items():
        if key not in SPEC_BY_KEY:
            raise ValueError(f"Unknown setting '{key}'.")
        cleaned[key] = None if raw is None else validate_setting(key, raw)

    existing = {row.key: row for row in db.session.scalars(select(SiteSetting)).all()}
    for key, value in cleaned.items():
        row = existing.get(key)
        if value is None:
            if row is not None:
                db.session.delete(row)
        elif row is not None:
            row.value = str(value)
        else:
            db.session.add(SiteSetting(key=key, value=str(value)))
    db.session.commit()
    return {key: (default_value(key) if value is None else value) for key, value in cleaned.items()}
