# backend/app/routes/privacy.py
from flask import Blueprint, current_app, jsonify

from app.services import site_settings
from app.utils.privacy_info import build_privacy_info

privacy_bp = Blueprint("privacy", __name__, url_prefix="/api/v1/privacy-info")


@privacy_bp.route("", methods=["GET"])
@privacy_bp.route("/", methods=["GET"])
def get_privacy_info():
    """Public: the configured values the Privacy Policy page quotes (contact, lifetimes, mail provider)."""
    cfg = current_app.config
    info = build_privacy_info(
        contact_email=site_settings.contact_email(),
        mail_server=cfg.get("MAIL_SERVER") or "",
        verification_lifetime=site_settings.verification_lifetime(),
        reset_lifetime=site_settings.reset_lifetime(),
        session_lifetime=site_settings.session_lifetime(),
        streak_prune_days=site_settings.streak_prune_days(),
    )
    response = jsonify(info)
    response.headers["Cache-Control"] = "public, max-age=300"
    return response, 200
