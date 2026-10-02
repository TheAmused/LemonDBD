# backend/app/routes/site_pages.py
"""Public view of the per-page kill switches (read by the Next proxy and the sidebar)."""
from flask import Blueprint, jsonify

from app.core.security import get_current_user
from app.services import site_settings
from app.utils.site_settings_spec import PAGE_IDS

site_pages_bp = Blueprint("site_pages", __name__, url_prefix="/api/v1/site")


@site_pages_bp.route("/pages", methods=["GET"])
def page_status():
    """``{"disabled": [...], "viewer_is_admin": bool}`` -- never cached: a switch must bite at once."""
    user = get_current_user()
    response = jsonify({
        "enabled": site_settings.kill_switches_enabled(),
        "pages": list(PAGE_IDS),
        "disabled": site_settings.disabled_pages(),
        "viewer_is_admin": bool(user is not None and user.role == "admin"),
    })
    response.headers["Cache-Control"] = "no-store"
    return response, 200
