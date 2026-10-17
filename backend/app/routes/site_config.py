# backend/app/routes/site_config.py
"""Public site configuration: the few admin settings every visitor's browser needs.

Only what `site_settings.public_config()` builds from its explicit list is served here: the notice
banner (text only while it is active), outbound links, feature flags and a few limits. Secrets and
every other setting stay private.
"""
from flask import Blueprint, jsonify

from app.core.limiter import limiter
from app.services import site_settings

site_config_bp = Blueprint("site_config_bp", __name__, url_prefix="/api/v1/site-config")


@site_config_bp.route("", methods=["GET"])
@limiter.limit("120 per minute")
def get_site_config():
    response = jsonify(site_settings.public_config())
    # Short-lived on purpose: a banner or a closed sign-up should reach visitors within about a minute.
    response.headers["Cache-Control"] = "public, max-age=30"
    return response, 200
