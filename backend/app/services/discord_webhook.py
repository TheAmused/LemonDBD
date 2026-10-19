# backend/app/services/discord_webhook.py
"""Discord notifications for new bug reports (and the admin "send a test notification" check).

The webhook URL is an admin setting (stored encrypted), falling back to the environment or the app
config. Whether new reports are announced at all is the admin setting `bug_report_discord`; the test
notification ignores it, so an admin can check the webhook before switching announcements on.
"""
import logging
import threading
from datetime import datetime, timezone
from typing import Any

from curl_cffi import requests

from app.services.site_settings import get_secret

logger = logging.getLogger(__name__)

_STATUS_COLORS = {
    "pending": 14423100,
    "in_progress": 16097035,
    "resolved": 1096065,
    "rejected": 6583371,
}
_TIMEOUT_SECONDS = 15


def webhook_url() -> str | None:
    """The webhook the admin set in Settings > Integrations, else the deployment's (environment, then app config), or None."""
    return get_secret("discord_webhook_url") or None


_MARKDOWN_SPECIALS = set("\\*_~`|>[]()#-")
_ZERO_WIDTH_SPACE = "\u200b"


def escape_markdown(text: str) -> str:
    """A guest's text as plain text in Discord: markdown (masked links `[x](url)`, headings, spoilers)
    escaped, and `@everyone` / `@here` / `<@id>` mentions broken so they can never ping."""
    escaped = "".join(f"\\{ch}" if ch in _MARKDOWN_SPECIALS else ch for ch in str(text))
    return escaped.replace("@", f"@{_ZERO_WIDTH_SPACE}")


def _code_span(text: str) -> str:
    """Inside a `code span` backslashes are literal, so a backtick is swapped for a look-alike instead."""
    return "`" + str(text).replace("`", "\u02cb").replace("@", f"@{_ZERO_WIDTH_SPACE}") + "`"


def bug_report_embed(report: dict[str, Any]) -> dict[str, Any]:
    """The Discord embed announcing one bug report. Everything the reporter typed is escaped."""
    report_id = report.get("id", 0)
    images = report.get("images", [])
    return {
        "title": f"🚨 [Bug Report #{report_id}] {escape_markdown(str(report.get('title') or 'Untitled')[:200])}",
        "description": escape_markdown((report.get("message") or "No description provided.")[:1900]),
        "color": _STATUS_COLORS.get(report.get("status", "pending"), _STATUS_COLORS["pending"]),
        "fields": [
            {"name": "👤 Submitter", "value": _code_span(str(report.get("reporter_name", "Guest"))[:100]), "inline": True},
            {"name": "📧 Contact", "value": _code_span(str(report.get("reporter_email") or "Not Provided")[:150]), "inline": True},
            {"name": "📌 Status", "value": f"**{str(report.get('status', 'pending')).upper()}**", "inline": True},
            {"name": "🆔 Ticket ID", "value": f"#{report_id}", "inline": True},
            {"name": "🖼️ Attachments", "value": f"{len(images)} screenshot(s)", "inline": True},
        ],
        "footer": {"text": "LemonDBD Bug Tracking System"},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def diagnostic_embed(admin_login: str) -> dict[str, Any]:
    """A harmless embed proving the webhook works."""
    return {
        "title": "✅ LemonDBD test notification",
        "description": f"Sent from the admin panel by `{admin_login}`. New bug reports will appear here.",
        "color": _STATUS_COLORS["resolved"],
        "footer": {"text": "LemonDBD Bug Tracking System"},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def post_embed(embed: dict[str, Any], url: str) -> int:
    """Send one embed; returns Discord's HTTP status. Raises on a network failure."""
    response = requests.post(
        url,
        # No mention in an announcement may ever ping anyone.
        json={"username": "LemonDBD Bug Watcher", "embeds": [embed], "allowed_mentions": {"parse": []}},
        impersonate="chrome120",
        timeout=_TIMEOUT_SECONDS,
        headers={"Content-Type": "application/json"},
    )
    return int(response.status_code)


def announce_bug_report(report: dict[str, Any]) -> None:
    """Fire-and-forget announcement of a new bug report (no-op without a webhook)."""
    url = webhook_url()
    if not url:
        logger.warning("[Discord Webhook] DISCORD_WEBHOOK_URL not configured. Skipping notification.")
        return
    embed = bug_report_embed(report)

    def _send() -> None:
        try:
            status = post_embed(embed, url)
            logger.info(f"[Discord Webhook] Discord API responded with HTTP {status}")
        except Exception as err:
            logger.error(f"[Discord Webhook] Error firing Discord webhook for report #{report.get('id')}: {err}", exc_info=True)

    threading.Thread(target=_send, daemon=True).start()
