# backend/app/utils/site_settings_spec.py
"""Definition and validation of the admin-editable site settings (pure, no app imports).

Every setting is declared once here: its kind, its group in the Settings tab and its hard bounds.
Nothing outside this table can be written, and every value is validated on the way in and again on
the way out, so a corrupt row can never reach the code that reads it.

Kinds: ``bool`` | ``int`` | ``email`` | ``url`` (https only) | ``text`` | ``choice`` |
``datetime`` (ISO 8601, stored as UTC) | ``secret`` (write-only; encrypted before it is stored).
"""
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_TRUE = frozenset({"true", "1", "yes", "on"})
_FALSE = frozenset({"false", "0", "no", "off"})
# Control characters (and the line/paragraph separators) never belong in a one-line setting.
_CONTROL_RE = re.compile(r"[\x00-\x1f\x7f  ]")

DISCORD_WEBHOOK_HOSTS = ("discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com")
DISCORD_INVITE_HOSTS = ("discord.gg", "discord.com", "discordapp.com")
BANNER_LEVELS = ("info", "warning", "critical")
BANNER_LOCALES = ("pl", "de", "es", "ja")


@dataclass(frozen=True)
class SettingSpec:
    key: str
    kind: str
    group: str
    minimum: int | None = None
    maximum: int | None = None
    max_length: int = 150
    choices: tuple[str, ...] = ()
    allow_empty: bool = False
    allowed_hosts: tuple[str, ...] = ()  # url / secret: the host must be one of these (or a subdomain)
    path_prefix: str = ""  # secret: the URL path must start with this
    public: bool = False  # exposed (as a value or a derived value) by GET /site-config
    risky_when: bool | None = None  # bool: the value that lowers protection and needs an explicit confirmation


def _int_spec(key: str, group: str, minimum: int, maximum: int, **extra: Any) -> SettingSpec:
    return SettingSpec(key, "int", group, minimum=minimum, maximum=maximum, **extra)


SETTING_SPECS: tuple[SettingSpec, ...] = (
    SettingSpec("contact_email", "email", "privacy"),
    # Switches an admin flips during a spam wave or an outage, without a deploy.
    SettingSpec("registration_open", "bool", "access", public=True),
    SettingSpec("email_verification_required", "bool", "access", public=True, risky_when=False),
    SettingSpec("altcha_enforced", "bool", "access", risky_when=False),
    SettingSpec("google_sign_in_enabled", "bool", "access", public=True),
    SettingSpec("content_reports_open", "bool", "access", public=True),
    SettingSpec("scoreboard_ocr_enabled", "bool", "access", public=True),
    SettingSpec("guest_bug_reports", "bool", "bug_reports"),
    SettingSpec("bug_report_discord", "bool", "bug_reports"),
    # Site-wide notice (a banner under the header). Text is plain; the front end never renders HTML.
    SettingSpec("site_banner_enabled", "bool", "notices", public=True),
    SettingSpec("site_banner_level", "choice", "notices", choices=BANNER_LEVELS, public=True),
    SettingSpec("site_banner_until", "datetime", "notices", allow_empty=True, public=True),
    SettingSpec("site_banner_text", "text", "notices", max_length=240, allow_empty=True, public=True),
    *(
        SettingSpec(f"site_banner_text_{code}", "text", "notices", max_length=240, allow_empty=True, public=True)
        for code in BANNER_LOCALES
    ),
    # Outbound links. https only, no credentials in the URL; empty hides the link.
    SettingSpec("discord_invite_url", "url", "links", max_length=200, allow_empty=True, public=True,
                allowed_hosts=DISCORD_INVITE_HOSTS),
    SettingSpec("donation_bmc_url", "url", "links", max_length=300, allow_empty=True, public=True),
    SettingSpec("donation_kofi_url", "url", "links", max_length=300, allow_empty=True, public=True),
    SettingSpec("donation_patreon_url", "url", "links", max_length=300, allow_empty=True, public=True),
    SettingSpec("donation_message", "text", "links", max_length=200, allow_empty=True, public=True),
    _int_spec("verification_code_hours", "tokens", 1, 168),
    _int_spec("reset_token_minutes", "tokens", 5, 1440),
    _int_spec("session_hours", "tokens", 1, 720),
    # Abuse limits. Floors keep the site usable (a limit of 1 would lock honest users out of logging in);
    # ceilings stop a typo from switching a protection off.
    _int_spec("rate_auth_per_minute", "limits", 3, 120),
    _int_spec("rate_recovery_per_minute", "limits", 2, 60),
    _int_spec("rate_two_factor_per_minute", "limits", 3, 60),
    _int_spec("rate_bug_report_per_minute", "limits", 1, 60),
    _int_spec("rate_content_report_per_minute", "limits", 1, 60),
    _int_spec("rate_scoreboard_per_minute", "limits", 1, 60),
    _int_spec("two_factor_max_attempts", "limits", 3, 10),
    _int_spec("two_factor_lockout_minutes", "limits", 5, 1440),
    _int_spec("verification_max_attempts", "limits", 3, 10),
    _int_spec("resend_cooldown_seconds", "limits", 30, 600, public=True),
    _int_spec("password_min_length", "limits", 6, 64, public=True),
    _int_spec("scoreboard_upload_max_mb", "limits", 1, 8, public=True),
    _int_spec("smash_image_max_mb", "limits", 1, 5),
    _int_spec("sanction_email_attempts", "limits", 1, 10),
    # Retention. Ceilings are the values the Privacy Policy promises: an admin can shorten, never lengthen.
    _int_spec("content_evidence_days", "retention", 1, 14),
    _int_spec("match_log_max_entries", "retention", 10, 100),
    _int_spec("streak_prune_days", "retention", 7, 3650),
    _int_spec("warning_lifetime_days", "retention", 1, 3650),
    _int_spec("ban_list_retention_days", "retention", 30, 3650),
    # Thresholds behind the escalation suggestion (a person still decides every sanction).
    _int_spec("warnings_before_suspension", "moderation", 1, 20),
    _int_spec("suspension_first_days", "moderation", 1, 365),
    _int_spec("suspension_second_days", "moderation", 1, 365),
    # Integrations. Write-only: stored encrypted, never sent back to the browser.
    SettingSpec("discord_webhook_url", "secret", "integrations", max_length=200,
                allowed_hosts=DISCORD_WEBHOOK_HOSTS, path_prefix="/api/webhooks/"),
    SettingSpec("discord_changelog_webhook_url", "secret", "integrations", max_length=200,
                allowed_hosts=DISCORD_WEBHOOK_HOSTS, path_prefix="/api/webhooks/"),
)

SPEC_BY_KEY: dict[str, SettingSpec] = {s.key: s for s in SETTING_SPECS}
RISKY_KEYS: frozenset[str] = frozenset(s.key for s in SETTING_SPECS if s.risky_when is not None)


def is_risky_change(key: str, value: Any) -> bool:
    """True when setting ``key`` to ``value`` lowers a protection (needs an explicit confirmation)."""
    spec = SPEC_BY_KEY.get(key)
    return bool(spec and spec.risky_when is not None and isinstance(value, bool) and value is spec.risky_when)


def _host_allowed(host: str, allowed: tuple[str, ...]) -> bool:
    return not allowed or any(host == name or host.endswith(f".{name}") for name in allowed)


def _clean_url(spec: SettingSpec, raw: Any) -> str:
    value = str(raw if raw is not None else "").strip()
    if not value:
        if spec.allow_empty:
            return ""
        raise ValueError(f"'{spec.key}' cannot be empty.")
    if len(value) > spec.max_length:
        raise ValueError(f"'{spec.key}' must be at most {spec.max_length} characters.")
    if _CONTROL_RE.search(value) or any(ch.isspace() for ch in value):
        raise ValueError("Enter a valid link without spaces.")
    try:
        parts = urlsplit(value)
        host = (parts.hostname or "").lower()
        parts.port  # noqa: B018 - raises ValueError on a malformed port
    except ValueError:
        raise ValueError("Enter a valid link.") from None
    if parts.scheme != "https" or not host or "." not in host:
        raise ValueError("Links must start with https://.")
    if parts.username is not None or parts.password is not None:
        raise ValueError("Links must not contain a username or password.")
    if parts.port not in (None, 443):
        raise ValueError("Links must use the standard HTTPS port.")
    if not _host_allowed(host, spec.allowed_hosts):
        raise ValueError(f"This link must point to {', '.join(spec.allowed_hosts)}.")
    if spec.path_prefix and not parts.path.startswith(spec.path_prefix):
        raise ValueError(f"The link path must start with {spec.path_prefix}.")
    return value


def _clean_text(spec: SettingSpec, raw: Any) -> str:
    value = " ".join(str(raw if raw is not None else "").split())  # one line, single spaces
    if _CONTROL_RE.search(value):
        raise ValueError(f"'{spec.key}' contains characters that are not allowed.")
    if not value and not spec.allow_empty:
        raise ValueError(f"'{spec.key}' cannot be empty.")
    if len(value) > spec.max_length:
        raise ValueError(f"'{spec.key}' must be at most {spec.max_length} characters.")
    return value


def _clean_datetime(spec: SettingSpec, raw: Any) -> str:
    value = str(raw if raw is not None else "").strip()
    if not value:
        if spec.allow_empty:
            return ""
        raise ValueError(f"'{spec.key}' cannot be empty.")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ValueError("Enter a valid date and time.") from None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def validate_setting(key: str, raw: Any) -> str | int | bool:
    """Return the cleaned value or raise ValueError with a human-readable message."""
    spec = SPEC_BY_KEY.get(key)
    if spec is None:
        raise ValueError(f"Unknown setting '{key}'.")

    if spec.kind == "bool":
        if isinstance(raw, bool):
            return raw
        text = str(raw).strip().lower() if isinstance(raw, (str, int)) else ""
        if text in _TRUE:
            return True
        if text in _FALSE:
            return False
        raise ValueError(f"'{key}' must be true or false.")

    if spec.kind == "email":
        value = str(raw or "").strip()
        if not value or len(value) > spec.max_length or not _EMAIL_RE.match(value):
            raise ValueError("Enter a valid email address.")
        return value

    if spec.kind in ("url", "secret"):
        return _clean_url(spec, raw)

    if spec.kind == "text":
        return _clean_text(spec, raw)

    if spec.kind == "datetime":
        return _clean_datetime(spec, raw)

    if spec.kind == "choice":
        value = str(raw or "").strip().lower()
        if value not in spec.choices:
            raise ValueError(f"'{key}' must be one of: {', '.join(spec.choices)}.")
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
