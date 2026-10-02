# backend/app/core/page_guard.py
"""API half of the per-page kill switch.

The frontend refuses to serve a switched-off page to non-admins, but a page is only a shell around
its API, so the endpoints that belong exclusively to a page are refused here too -- someone who
skips the website and calls the API directly gets the same "page unavailable" answer.

Only endpoints a single page owns are guarded. Shared catalogue data (perks, characters, maps)
feeds several pages and stays reachable; switching those pages off removes the page, not the data.
"""
from flask import jsonify, request

from app.core.security import get_current_user
from app.services import site_settings

# URL prefix -> page id (see PAGE_IDS in app/utils/site_settings_spec.py).
PAGE_API_PREFIXES: tuple[tuple[str, str], ...] = (
    ("/api/v1/tier-lists", "tier-lists"),
    ("/api/v1/smash-or-pass", "smash-or-pass"),
    ("/api/v1/smash", "smash-or-pass"),
    ("/api/v1/minigames", "minigames"),
    ("/api/v1/page-streak", "streaks"),
    ("/api/v1/gauntlet-streak", "streaks"),
    ("/api/v1/chaos-streak", "streaks"),
    ("/api/v1/history-streak", "streaks"),
    ("/api/v1/challenge-completions", "streaks"),
)


def page_for_path(path: str) -> str | None:
    for prefix, page in PAGE_API_PREFIXES:
        if path == prefix or path.startswith(prefix + "/"):
            return page
    return None


def enforce_page_kill_switch():
    """before_request hook: 403 for non-admins on an endpoint of a switched-off page."""
    page = page_for_path(request.path)
    if page is None or request.method == "OPTIONS":
        return None
    if page not in site_settings.disabled_pages():
        return None
    user = get_current_user()
    if user is not None and user.role == "admin":
        return None
    return jsonify({
        "error": "This page is currently unavailable.",
        "code": "page_disabled",
        "page": page,
        "status": 403,
    }), 403
