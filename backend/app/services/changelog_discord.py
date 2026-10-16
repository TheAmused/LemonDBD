# backend/app/services/changelog_discord.py
"""Posts a published "What's New" entry to the team's Discord channel through a webhook."""
import logging
from typing import Literal

from curl_cffi import requests
from flask import current_app

from app.models import ChangelogPost
from app.utils.discord_markdown import html_to_discord

logger = logging.getLogger(__name__)

AnnounceResult = Literal["sent", "failed", "not_configured"]

_EMBED_COLOR = 14423100  # the site's accent red


def announce_post(post: ChangelogPost) -> AnnounceResult:
    """Sends `post` as an embed. Never raises: a Discord outage comes back as "failed" and the caller shows it to the admin."""
    webhook = (current_app.config.get("DISCORD_CHANGELOG_WEBHOOK_URL") or "").strip()
    if not webhook:
        return "not_configured"

    published = post.published_at or post.created_at
    embed = {
        "title": post.title[:256],
        "description": html_to_discord(post.content_html),
        "url": current_app.config.get("FRONTEND_URL"),
        "color": _EMBED_COLOR,
        "footer": {"text": "LemonDBD"},
        "timestamp": published.isoformat() if published else None,
    }
    try:
        resp = requests.post(
            webhook,
            json={"username": "LemonDBD Updates", "embeds": [embed]},
            impersonate="chrome120",
            timeout=8,
            headers={"Content-Type": "application/json"},
        )
    except Exception:
        logger.exception("[changelog] Discord webhook request failed for post #%s", post.id)
        return "failed"
    if resp.status_code >= 300:
        logger.error("[changelog] Discord answered HTTP %s for post #%s", resp.status_code, post.id)
        return "failed"
    return "sent"
