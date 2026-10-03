# backend/app/utils/privacy_info.py
"""Facts the Privacy Policy page quotes, derived from the real configuration.

The page's translated text holds placeholders (``{contactEmail}``, ``{sessionWindow}``...)
and the frontend fills them from `GET /api/v1/privacy-info`, so changing a lifetime or the
contact address never needs a translation edit. Durations are sent in seconds and
formatted client-side in the viewer's language.
"""
from datetime import timedelta

_MAIL_PROVIDERS: tuple[tuple[str, str], ...] = (
    ("gmail.com", "Google Gmail"),
    ("googlemail.com", "Google Gmail"),
    ("office365.com", "Microsoft Outlook"),
    ("outlook.com", "Microsoft Outlook"),
    ("sendgrid.net", "Twilio SendGrid"),
    ("mailgun.org", "Mailgun"),
    ("amazonaws.com", "Amazon SES"),
    ("zoho.", "Zoho Mail"),
)


def mail_provider_name(mail_server: str) -> str:
    """Human-readable name of the SMTP provider (falls back to the host name)."""
    host = (mail_server or "").strip().lower()
    for needle, name in _MAIL_PROVIDERS:
        if needle in host:
            return name
    return host


def build_privacy_info(
    *,
    contact_email: str,
    mail_server: str,
    verification_lifetime: timedelta,
    reset_lifetime: timedelta,
    session_lifetime: timedelta,
    streak_prune_days: int,
) -> dict[str, str | int]:
    return {
        "contactEmail": (contact_email or "").strip(),
        "mailProvider": mail_provider_name(mail_server),
        "verificationSeconds": int(verification_lifetime.total_seconds()),
        "resetSeconds": int(reset_lifetime.total_seconds()),
        "sessionSeconds": int(session_lifetime.total_seconds()),
        "streakPruneSeconds": int(timedelta(days=streak_prune_days).total_seconds()),
    }
