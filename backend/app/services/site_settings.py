# backend/app/services/site_settings.py
"""Admin-editable settings: a DB override per key, falling back to the config/env default.

Reads never raise (no app context, missing table...): the caller always gets a usable
value. Security-relevant lifetimes are therefore read through here at the moment they
are used, so an admin change takes effect without a restart.
"""
import logging
import time
from datetime import timedelta
from typing import Any

from flask import current_app, has_app_context
from sqlalchemy import select

from app.core.extensions import db
from app.models.admin import SiteSetting
from app.utils.site_settings_spec import SETTING_SPECS, SPEC_BY_KEY, is_page_id, parse_pages, validate_setting

logger = logging.getLogger(__name__)

_FALLBACK_DEFAULTS: dict[str, str | int] = {
    "contact_email": "",
    "verification_code_hours": 24,
    "reset_token_minutes": 60,
    "session_hours": 24,
    "streak_prune_days": 90,
    "disabled_pages": "",
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


_PAGES_TTL_SECONDS = 2.0
_pages_cache: tuple[float, list[str]] | None = None


def kill_switches_enabled() -> bool:
    """False when PAGE_KILL_SWITCHES_ENABLED turns the whole page kill-switch system off."""
    return bool(current_app.config.get("PAGE_KILL_SWITCHES_ENABLED", True)) if has_app_context() else True


def disabled_pages() -> list[str]:
    """Pages currently switched off (admins still see them); empty when the system is off.
    Cached for a couple of seconds because the API guard asks on every request; a local change
    clears the cache at once."""
    global _pages_cache
    if not kill_switches_enabled():
        return []
    now = time.monotonic()
    testing = has_app_context() and bool(current_app.config.get("TESTING"))
    if not testing and _pages_cache is not None and now - _pages_cache[0] < _PAGES_TTL_SECONDS:
        return list(_pages_cache[1])
    value = str(get_setting("disabled_pages"))
    try:
        pages = parse_pages(value)
    except ValueError:
        pages = []
    _pages_cache = (now, pages)
    return list(pages)


def set_page_disabled(page: str, disabled: bool) -> list[str]:
    """Switch one page off/on; returns the new list. Raises ValueError for an unknown page."""
    global _pages_cache
    if not is_page_id(page):
        raise ValueError(f"Invalid page id '{page}'.")
    current = set(parse_pages(get_setting("disabled_pages")))
    if disabled:
        current.add(page)
    else:
        current.discard(page)
    new_value = ",".join(sorted(current))
    update_settings({"disabled_pages": new_value or None})
    return parse_pages(new_value)


def configured_disabled_pages() -> list[str]:
    """What the admin has switched off, whether or not the system is currently enabled."""
    try:
        return parse_pages(get_setting("disabled_pages"))
    except ValueError:
        return []


def list_settings() -> list[dict[str, Any]]:
    """Every setting with its effective value, default, bounds and whether it is overridden."""
    overrides = _overrides()
    rows: list[dict[str, Any]] = []
    for spec in SETTING_SPECS:
        if spec.kind == "pages":  # managed from the page switches, not the configuration form
            continue
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
    global _pages_cache
    _pages_cache = None
    return {key: (default_value(key) if value is None else value) for key, value in cleaned.items()}
