# backend/app/services/discord_webhook.py
"""Discord notifications for new bug reports (and the admin "send a test notification" check).

The webhook URL comes from the environment or the app config. Whether new reports are announced
at all is the admin setting `bug_report_discord`; the test notification ignores it, so an admin can
check the webhook before switching announcements on.
"""
import logging
import os
import threading
from datetime import datetime, timezone
from typing import Any

from curl_cffi import requests
from flask import current_app

logger = logging.getLogger(__name__)

_STATUS_COLORS = {
    "pending": 14423100,
    "in_progress": 16097035,
    "resolved": 1096065,
    "rejected": 6583371,
}
_TIMEOUT_SECONDS = 15


def webhook_url() -> str | None:
    """The configured webhook (environment first, then app config), or None."""
    env_url = os.getenv("DISCORD_WEBHOOK_URL")
    if env_url and env_url.strip():
        return env_url.strip()
    try:
        config_url = current_app.config.get("DISCORD_WEBHOOK_URL")
    except RuntimeError:
        return None
    return config_url.strip() if isinstance(config_url, str) and config_url.strip() else None


def bug_report_embed(report: dict[str, Any]) -> dict[str, Any]:
    """The Discord embed announcing one bug report."""
    report_id = report.get("id", 0)
    images = report.get("images", [])
    return {
        "title": f"🚨 [Bug Report #{report_id}] {str(report.get('title') or 'Untitled')[:200]}",
        "description": (report.get("message") or "No description provided.")[:1900],
        "color": _STATUS_COLORS.get(report.get("status", "pending"), _STATUS_COLORS["pending"]),
        "fields": [
            {"name": "👤 Submitter", "value": f"`{report.get('reporter_name', 'Guest')}`", "inline": True},
            {"name": "📧 Contact", "value": f"`{report.get('reporter_email') or 'Not Provided'}`", "inline": True},
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
        json={"username": "LemonDBD Bug Watcher", "embeds": [embed]},
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
