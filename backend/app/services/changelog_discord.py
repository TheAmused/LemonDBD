# backend/app/services/changelog_discord.py
"""Posts a published "What's New" entry to the team's Discord channel through a webhook, and updates that message
when the entry is edited."""
import logging
from typing import Literal, NamedTuple

from curl_cffi import requests
from flask import current_app

from app.models import ChangelogPost
from app.utils.discord_markdown import html_to_discord

logger = logging.getLogger(__name__)

# "missing": the message was deleted on Discord, so there is nothing left to update.
AnnounceResult = Literal["sent", "failed", "not_configured", "missing"]


class Announcement(NamedTuple):
    result: AnnounceResult
    #: Discord's id of the posted message; None unless the entry was just sent and Discord returned it.
    message_id: str | None = None


_EMBED_COLOR = 14423100  # the site's accent red
_HEADERS = {"Content-Type": "application/json"}


def _webhook() -> str:
    return (current_app.config.get("DISCORD_CHANGELOG_WEBHOOK_URL") or "").strip().rstrip("/")


def _embed(post: ChangelogPost) -> dict[str, str | int | None]:
    published = post.published_at or post.created_at
    # The patch title is a `#` heading inside the description, not the embed title: an embed title is no bigger
    # than the text below it, and one with a `url` turns into a link to the site.
    return {
        "description": f"# {post.title[:200]}\n\n{html_to_discord(post.content_html)}".strip(),
        "color": _EMBED_COLOR,
        "timestamp": published.isoformat() if published else None,
    }


def announce_post(post: ChangelogPost) -> Announcement:
    """Sends `post` as an embed. Never raises: a Discord outage comes back as "failed" and the caller shows it to the admin."""
    webhook = _webhook()
    if not webhook:
        return Announcement("not_configured")

    try:
        # wait=true makes Discord answer with the created message, whose id is what later edits need.
        resp = requests.post(
            webhook,
            params={"wait": "true"},
            json={"username": "LemonDBD Updates", "embeds": [_embed(post)]},
            impersonate="chrome120",
            timeout=8,
            headers=_HEADERS,
        )
    except Exception:
        logger.exception("[changelog] Discord webhook request failed for post #%s", post.id)
        return Announcement("failed")
    if resp.status_code >= 300:
        logger.error("[changelog] Discord answered HTTP %s for post #%s", resp.status_code, post.id)
        return Announcement("failed")
    try:
        message_id = str(resp.json()["id"])
    except Exception:
        logger.warning("[changelog] Discord sent post #%s but returned no message id; it cannot be edited later", post.id)
        message_id = None
    return Announcement("sent", message_id)


def update_announcement(post: ChangelogPost) -> AnnounceResult:
    """Rewrites the Discord message of an already announced `post` with its current title and text."""
    webhook = _webhook()
    if not webhook:
        return "not_configured"

    try:
        resp = requests.patch(
            f"{webhook}/messages/{post.discord_message_id}",
            json={"embeds": [_embed(post)]},
            impersonate="chrome120",
            timeout=8,
            headers=_HEADERS,
        )
    except Exception:
        logger.exception("[changelog] Discord message update failed for post #%s", post.id)
        return "failed"
    if resp.status_code == 404:
        logger.warning("[changelog] Discord message of post #%s no longer exists", post.id)
        return "missing"
    if resp.status_code >= 300:
        logger.error("[changelog] Discord answered HTTP %s updating post #%s", resp.status_code, post.id)
        return "failed"
    return "sent"
