# backend/app/routes/site_config.py
"""Public site configuration: the few admin settings every visitor's browser needs.

Only what `site_settings.public_config()` builds from its explicit list is served here: the notice
banner (text only while it is active), outbound links, feature flags and a few limits. Secrets and
every other setting stay private.
"""
from flask import Blueprint, jsonify

from app.core.limiter import limiter
from app.services import site_settings
from app.services.maintenance_mode import current_state, visitor_may_pass

site_config_bp = Blueprint("site_config_bp", __name__, url_prefix="/api/v1/site-config")


@site_config_bp.route("", methods=["GET"])
@limiter.limit("120 per minute")
def get_site_config():
    response = jsonify(site_settings.public_config())
    # Short-lived on purpose: a banner or a closed sign-up should reach visitors within about a minute.
    response.headers["Cache-Control"] = "public, max-age=30"
    return response, 200


@site_config_bp.route("/maintenance", methods=["GET"])
@limiter.limit("120 per minute")
def get_maintenance_status():
    """Is the site closed, and is it closed for the caller? The Next.js proxy and the maintenance page ask.

    ``blocked`` depends on who asks (their address and session), so the answer is never cached.
    """
    state = current_state()
    response = jsonify({**state.as_dict(), "active": state.active, "blocked": state.active and not visitor_may_pass()})
    response.headers["Cache-Control"] = "no-store"
    return response, 200
