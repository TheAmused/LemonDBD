# backend/app/services/site_settings.py
"""Admin-editable settings: a DB override per key, falling back to the config/env default.

Reads never raise (no app context, missing table...): the caller always gets a usable
value. Settings are read through here at the moment they are used, so an admin change takes
effect without a restart. The overrides are held in a small per-process cache
(``SITE_SETTINGS_CACHE_SECONDS``, 5 s by default, cleared on every save in this process), so hot
paths such as the rate limiter do not query the database on every request; other worker
processes see a change within that many seconds.

Secrets (webhook URLs) are stored encrypted and only ever leave through ``get_secret``; the
listing reports whether one is set, never what it is.
"""
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from flask import current_app, has_app_context
from sqlalchemy import select

from app.core.extensions import db
from app.core.transaction import transaction
from app.models.admin import SiteSetting
from app.utils.site_settings_spec import (
    BANNER_LOCALES,
    SETTING_SPECS,
    SPEC_BY_KEY,
    is_risky_change,
    validate_setting,
)

logger = logging.getLogger(__name__)

_FALLBACK_DEFAULTS: dict[str, str | int | bool] = {
    "contact_email": "",
    "registration_open": True,
    "email_verification_required": True,
    "altcha_enforced": True,
    "google_sign_in_enabled": True,
    "content_reports_open": True,
    "scoreboard_ocr_enabled": True,
    "guest_bug_reports": True,
    "bug_report_discord": True,
    "site_banner_enabled": False,
    "site_banner_level": "info",
    "site_banner_until": "",
    "site_banner_text": "",
    **{f"site_banner_text_{code}": "" for code in BANNER_LOCALES},
    "discord_invite_url": "",
    "donation_bmc_url": "",
    "donation_kofi_url": "",
    "donation_message": "",
    "verification_code_hours": 24,
    "reset_token_minutes": 60,
    "session_hours": 24,
    "rate_auth_per_minute": 10,
    "rate_recovery_per_minute": 5,
    "rate_two_factor_per_minute": 10,
    "rate_bug_report_per_minute": 15,
    "rate_content_report_per_minute": 10,
    "rate_scoreboard_per_minute": 6,
    "two_factor_max_attempts": 5,
    "two_factor_lockout_minutes": 15,
    "verification_max_attempts": 5,
    "resend_cooldown_seconds": 60,
    "password_min_length": 6,
    "scoreboard_upload_max_mb": 8,
    "smash_image_max_mb": 5,
    "sanction_email_attempts": 5,
    "content_evidence_days": 14,
    "match_log_max_entries": 100,
    "streak_prune_days": 90,
    "warning_lifetime_days": 90,
    "ban_list_retention_days": 1095,
    "warnings_before_suspension": 3,
    "suspension_first_days": 7,
    "suspension_second_days": 30,
    "discord_webhook_url": "",
    "discord_changelog_webhook_url": "",
}

# Settings whose starting value is a config key (set from the environment).
_CONFIG_DEFAULTS: dict[str, str] = {
    "email_verification_required": "REQUIRE_EMAIL_VERIFICATION",
    "altcha_enforced": "ALTCHA_ENFORCED",
    "discord_invite_url": "DISCORD_INVITE_URL",
    "donation_bmc_url": "DONATION_BMC_URL",
    "donation_kofi_url": "DONATION_KOFI_URL",
}

# The environment variable / config key a secret falls back to when the admin has not set one.
_SECRET_ENV: dict[str, str] = {
    "discord_webhook_url": "DISCORD_WEBHOOK_URL",
    "discord_changelog_webhook_url": "DISCORD_CHANGELOG_WEBHOOK_URL",
}


class RiskyChangeError(ValueError):
    """A change that lowers a protection was sent without the explicit confirmation and reason."""


def default_value(key: str) -> str | int | bool:
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
    config_key = _CONFIG_DEFAULTS.get(key)
    if config_key and config_key in cfg:
        configured = cfg.get(config_key)
        fallback = _FALLBACK_DEFAULTS[key]
        if isinstance(fallback, bool):
            return bool(configured)
        return str(configured or "").strip()
    return _FALLBACK_DEFAULTS[key]


# --- storage -------------------------------------------------------------------------------------

_cache: tuple[float, dict[str, str]] | None = None


def invalidate_cache() -> None:
    """Forget the cached overrides (called after every save)."""
    global _cache
    _cache = None


def _cache_seconds() -> float:
    try:
        return float(current_app.config.get("SITE_SETTINGS_CACHE_SECONDS", 5)) if has_app_context() else 0.0
    except (TypeError, ValueError):
        return 0.0


def _stored_overrides() -> dict[str, str]:
    """``{key: stored text}`` for every overridden setting. Raises when the table cannot be read."""
    global _cache
    ttl = _cache_seconds()
    now = time.monotonic()
    cached = _cache
    if ttl > 0 and cached is not None and now - cached[0] < ttl:
        return cached[1]
    values = {key: value for key, value in db.session.execute(select(SiteSetting.key, SiteSetting.value)).all()}
    if ttl > 0:
        _cache = (now, values)
    return values


def _read_override(key: str) -> str | None:
    try:
        return _stored_overrides().get(key)
    except Exception as err:  # missing table, no app context, ...
        if has_app_context():
            db.session.rollback()
        logger.debug("site setting %s: falling back to default (%s)", key, err)
        return None


def get_setting(key: str) -> str | int | bool:
    """Effective value of one setting (override, else default); never raises.

    A ``secret`` setting always reads as an empty string here: use ``get_secret``.
    """
    spec = SPEC_BY_KEY[key]
    if spec.kind == "secret":
        return ""
    raw = _read_override(key)
    if raw is not None:
        try:
            return validate_setting(key, raw)
        except ValueError as err:  # a corrupt row must not break the feature that reads it
            logger.warning("site setting %s holds an invalid value (%s); using the default", key, err)
    return default_value(key)


def secret_env_value(key: str) -> str:
    """The deployment's own value for a secret setting (environment first, then app config)."""
    name = _SECRET_ENV.get(key)
    if not name:
        return ""
    env_value = (os.getenv(name) or "").strip()
    if env_value:
        return env_value
    if has_app_context():
        configured = current_app.config.get(name)
        if isinstance(configured, str):
            return configured.strip()
    return ""


def get_secret(key: str) -> str:
    """The decrypted admin-set secret, else the deployment's own value, else ``""``. Never raises."""
    spec = SPEC_BY_KEY.get(key)
    if spec is None or spec.kind != "secret":
        return ""
    token = _read_override(key)
    if token:
        try:
            from app.core.two_factor_crypto import decrypt_secret

            return validate_setting(key, decrypt_secret(token))
        except Exception as err:  # key rotated away, corrupt row...
            logger.warning("secret setting %s cannot be used (%s); falling back to the deployment value", key, err)
    return secret_env_value(key)


# --- readers -------------------------------------------------------------------------------------


def verification_lifetime() -> timedelta:
    return timedelta(hours=int(get_setting("verification_code_hours")))


def reset_lifetime() -> timedelta:
    return timedelta(minutes=int(get_setting("reset_token_minutes")))


def session_lifetime() -> timedelta:
    return timedelta(hours=int(get_setting("session_hours")))


def streak_prune_days() -> int:
    return int(get_setting("streak_prune_days"))


def warning_lifetime_days() -> int:
    """How long a warning counts as active (after that it stays on record but no longer escalates)."""
    return int(get_setting("warning_lifetime_days"))


def ban_list_retention_days() -> int:
    """How long the hash of a permanently banned e-mail stays on the ban-evasion list."""
    return int(get_setting("ban_list_retention_days"))


def escalation_thresholds() -> dict[str, int]:
    """The numbers behind the escalation suggestion."""
    return {
        "warnings_before_suspension": int(get_setting("warnings_before_suspension")),
        "first_suspension_days": int(get_setting("suspension_first_days")),
        "second_suspension_days": int(get_setting("suspension_second_days")),
    }


def contact_email() -> str:
    return str(get_setting("contact_email"))


def registration_open() -> bool:
    """Whether visitors may create accounts (register form and first Google sign-in). Admins always can."""
    return bool(get_setting("registration_open"))


def email_verification_required() -> bool:
    """Whether an account must confirm its e-mail address before it can sign in (sign-up and
    sign-in hand out a verification token instead of a session). While off, accounts are
    confirmed on sign-in."""
    return bool(get_setting("email_verification_required"))


def altcha_enforced() -> bool:
    """Whether sign-up / sign-in / password reset / guest bug reports must carry a solved ALTCHA challenge."""
    return bool(get_setting("altcha_enforced"))


def google_sign_in_enabled() -> bool:
    """The admin switch only; Google sign-in also needs ``GOOGLE_CLIENT_ID`` (see ``google_sign_in_available``)."""
    return bool(get_setting("google_sign_in_enabled"))


def google_sign_in_available() -> bool:
    from app.services.user import google_auth

    return google_sign_in_enabled() and google_auth.is_configured()


def content_reports_open() -> bool:
    return bool(get_setting("content_reports_open"))


def scoreboard_ocr_enabled() -> bool:
    return bool(get_setting("scoreboard_ocr_enabled"))


def guest_bug_reports_allowed() -> bool:
    """Whether signed-out visitors may send bug reports."""
    return bool(get_setting("guest_bug_reports"))


def bug_report_discord_enabled() -> bool:
    """Whether a new bug report is announced on the Discord webhook (when one is configured)."""
    return bool(get_setting("bug_report_discord"))


def rate_limit(key: str) -> int:
    """Requests per minute allowed by one of the ``rate_*_per_minute`` settings."""
    return int(get_setting(key))


def two_factor_max_attempts() -> int:
    return int(get_setting("two_factor_max_attempts"))


def two_factor_lockout() -> timedelta:
    return timedelta(minutes=int(get_setting("two_factor_lockout_minutes")))


def verification_max_attempts() -> int:
    return int(get_setting("verification_max_attempts"))


def resend_cooldown() -> timedelta:
    return timedelta(seconds=int(get_setting("resend_cooldown_seconds")))


def password_min_length() -> int:
    return int(get_setting("password_min_length"))


def scoreboard_upload_max_bytes() -> int:
    return int(get_setting("scoreboard_upload_max_mb")) * 1024 * 1024


def smash_image_max_bytes() -> int:
    return int(get_setting("smash_image_max_mb")) * 1024 * 1024


def sanction_email_attempts() -> int:
    return int(get_setting("sanction_email_attempts"))


def content_evidence_days() -> int:
    return int(get_setting("content_evidence_days"))


def match_log_max_entries() -> int:
    return int(get_setting("match_log_max_entries"))


# --- public configuration -----------------------------------------------------------------------


def _banner_until_passed(until: str) -> bool:
    if not until:
        return False
    try:
        return datetime.fromisoformat(until.replace("Z", "+00:00")) <= datetime.now(timezone.utc)
    except ValueError:
        return False


def public_config() -> dict[str, Any]:
    """What any visitor may read: the notice banner, outbound links and a few feature flags.

    Built from an explicit list, never by dumping settings, so adding a setting can not leak it by
    accident. While the banner is off or expired it carries no text at all.
    """
    banner: dict[str, Any] = {"active": False}
    text = {"en": str(get_setting("site_banner_text"))}
    text.update({code: str(get_setting(f"site_banner_text_{code}")) for code in BANNER_LOCALES})
    until = str(get_setting("site_banner_until"))
    if get_setting("site_banner_enabled") and text["en"] and not _banner_until_passed(until):
        banner = {
            "active": True,
            "level": str(get_setting("site_banner_level")),
            "until": until or None,
            "text": {code: value for code, value in text.items() if value},
        }

    def link(key: str) -> str | None:
        return str(get_setting(key)) or None

    return {
        "banner": banner,
        "links": {
            "discord_invite": link("discord_invite_url"),
            "donation_bmc": link("donation_bmc_url"),
            "donation_kofi": link("donation_kofi_url"),
            "donation_message": link("donation_message"),
        },
        "features": {
            "registration_open": registration_open(),
            "email_verification_required": email_verification_required(),
            "google_sign_in": google_sign_in_available(),
            "content_reports_open": content_reports_open(),
            # The bug-report form needs it up front: with guest reports off it asks a signed-out
            # visitor to sign in instead of letting them fill the form in for nothing.
            "guest_bug_reports": guest_bug_reports_allowed(),
            "scoreboard_ocr": scoreboard_ocr_enabled(),
        },
        "limits": {
            "resend_cooldown_seconds": int(get_setting("resend_cooldown_seconds")),
            "password_min_length": password_min_length(),
            "scoreboard_upload_max_bytes": scoreboard_upload_max_bytes(),
        },
    }


# --- admin listing and saving ------------------------------------------------------------------


def list_settings() -> list[dict[str, Any]]:
    """Every setting with its effective value, default, bounds and whether it is overridden.

    A secret is never included: only whether the admin set one (``overridden``) or the deployment
    provides one (``env_set``).
    """
    try:
        overrides = _stored_overrides()
    except Exception:
        logger.warning("Could not read the stored settings; listing defaults", exc_info=True)
        if has_app_context():
            db.session.rollback()
        overrides = {}
    rows: list[dict[str, Any]] = []
    for spec in SETTING_SPECS:
        row: dict[str, Any] = {
            "key": spec.key,
            "kind": spec.kind,
            "group": spec.group,
            "overridden": spec.key in overrides,
            "min": spec.minimum,
            "max": spec.maximum,
            "max_length": spec.max_length,
            "choices": list(spec.choices),
            "allow_empty": spec.allow_empty,
            "risky_when": spec.risky_when,
        }
        if spec.kind == "secret":
            row.update(value=None, default=None, env_set=bool(secret_env_value(spec.key)))
        else:
            default = default_value(spec.key)
            value = default
            if spec.key in overrides:
                try:
                    value = validate_setting(spec.key, overrides[spec.key])
                except ValueError:
                    pass
            row.update(value=value, default=default)
        rows.append(row)
    return rows


def _stored(value: str | int | bool) -> str:
    """The text kept in the database (booleans as "true"/"false")."""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def _encrypt(value: str) -> str:
    from app.core.two_factor_crypto import TwoFactorUnavailable, encrypt_secret, is_configured

    if not is_configured():
        raise ValueError("Secrets cannot be stored: the server has no TWO_FACTOR_ENCRYPTION_KEY.")
    try:
        return encrypt_secret(value)
    except TwoFactorUnavailable as err:
        raise ValueError("Secrets cannot be stored: the encryption key is not valid.") from err


def _check_combination(cleaned: dict[str, str | int | bool | None]) -> None:
    """Rules that involve more than one setting, checked against the values as they would be after saving."""

    def effective(key: str) -> str | int | bool:
        if key in cleaned:
            return default_value(key) if cleaned[key] is None else cleaned[key]  # type: ignore[return-value]
        return get_setting(key)

    if effective("site_banner_enabled") is True and not str(effective("site_banner_text")).strip():
        raise ValueError("Write the banner text (English) before switching the banner on.")


def _redate_existing_records(cleaned: dict[str, Any]) -> None:
    """A new warning lifetime or ban-list retention applies to the records already stored too."""
    from app.services import retention

    now = datetime.now(timezone.utc)
    for key, redate in (("warning_lifetime_days", retention.redate_warnings), ("ban_list_retention_days", retention.redate_ban_list)):
        if key in cleaned:
            days = int(default_value(key) if cleaned[key] is None else cleaned[key])
            changed = redate(days, now)
            if changed:
                logger.info("%s set to %s days: %s existing record(s) re-dated", key, days, changed)


def update_settings(
    changes: dict[str, Any], *, confirm_risky: bool = False, reason: str = ""
) -> dict[str, Any]:
    """Apply ``{key: value}`` changes (``None`` clears the override). Returns ``{key: new_value}``.

    Raises ValueError (before touching the database) when any entry is invalid, and
    RiskyChangeError when a change lowers a protection without ``confirm_risky`` and a ``reason``.
    Secrets come back as a placeholder, never as the value.
    """
    cleaned: dict[str, str | int | bool | None] = {}
    for key, raw in changes.items():
        if key not in SPEC_BY_KEY:
            raise ValueError(f"Unknown setting '{key}'.")
        cleaned[key] = None if raw is None else validate_setting(key, raw)

    def lowers_protection(key: str, value: str | int | bool | None) -> bool:
        if value is not None:
            return is_risky_change(key, value)
        # "Use default" lowers a protection too when the default is the unsafe value and the
        # setting is not already at it (a deployment whose env turns the check off).
        default = default_value(key)
        return is_risky_change(key, default) and get_setting(key) != default

    risky = sorted(key for key, value in cleaned.items() if lowers_protection(key, value))
    if risky and not (confirm_risky and len(reason.strip()) >= 5):
        raise RiskyChangeError(
            "This lowers a protection (" + ", ".join(risky) + "). Confirm it and give a reason (at least 5 characters)."
        )
    _check_combination(cleaned)

    stored: dict[str, str | None] = {}
    for key, value in cleaned.items():
        if value is None:
            stored[key] = None
        elif SPEC_BY_KEY[key].kind == "secret":
            stored[key] = _encrypt(str(value))
        else:
            stored[key] = _stored(value)

    try:
        with transaction():
            existing = {row.key: row for row in db.session.scalars(select(SiteSetting)).all()}
            for key, text in stored.items():
                row = existing.get(key)
                if text is None:
                    if row is not None:
                        db.session.delete(row)
                elif row is not None:
                    row.value = text
                else:
                    db.session.add(SiteSetting(key=key, value=text))
            # In the same transaction: a new period reaches existing records, or nothing changes.
            _redate_existing_records(cleaned)
    finally:
        invalidate_cache()

    result: dict[str, Any] = {}
    for key, value in cleaned.items():
        if SPEC_BY_KEY[key].kind == "secret":
            result[key] = "<secret>" if value is not None else "<default>"
        else:
            result[key] = default_value(key) if value is None else value
    return result
