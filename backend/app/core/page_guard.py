# backend/app/core/page_guard.py
"""API half of the per-page kill switch.

The frontend refuses to serve a switched-off page to non-admins, but a page is only a shell around
its API, so the endpoints that belong to a single page are refused here too: someone who skips the
website and calls the API directly gets the same "page unavailable" answer.

A blueprint joins a page when it is registered with `register_page_blueprint(app, bp, page="...")`.
Shared catalogue data (perks, characters, maps) feeds several pages, so those blueprints stay
unattached: switching a page off removes the page, not the data.
"""
from flask import Blueprint, Flask, current_app, jsonify, request

from app.core.security import get_current_user
from app.services import site_settings
from app.utils.site_settings_spec import is_page_id

_EXTENSION_KEY = "page_blueprints"


def register_page_blueprint(app: Flask, blueprint: Blueprint, *, page: str, **options) -> None:
    """Register `blueprint` (as `register_blueprint` would) and attach it to a kill-switch page."""
    if not is_page_id(page):
        raise ValueError(f"Invalid page id '{page}'.")
    app.register_blueprint(blueprint, **options)
    registered_name = options.get("name") or blueprint.name
    app.extensions.setdefault(_EXTENSION_KEY, {})[registered_name] = page


def page_for_blueprint(app: Flask, blueprint_name: str | None) -> str | None:
    if not blueprint_name:
        return None
    return app.extensions.get(_EXTENSION_KEY, {}).get(blueprint_name)


def enforce_page_kill_switch():
    """before_request hook: 403 for non-admins on an endpoint of a switched-off page."""
    page = page_for_blueprint(current_app, request.blueprint)
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
