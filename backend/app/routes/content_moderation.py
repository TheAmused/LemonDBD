# backend/app/routes/content_moderation.py
"""Endpoints for user-generated content signing, reporting, and revocation checking."""
import logging
from flask import Blueprint, current_app, g, jsonify, request

from app.core.security import login_required
from app.services.content_moderation_service import (
    check_revocations,
    report_content,
    sign_user_content,
)

logger = logging.getLogger(__name__)

content_moderation_bp = Blueprint("content_moderation", __name__, url_prefix="/api/v1/content")


@content_moderation_bp.post("/sign")
@login_required
def sign_content():
    """Deterministically sign user content payload with HMAC-SHA256."""
    user = g.current_user
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object", "status": 400}), 400

    content_type = data.get("content_type")
    payload = data.get("payload")
    if not content_type or not isinstance(content_type, str) or not isinstance(payload, dict):
        return jsonify({"error": "content_type and dict payload are required", "status": 400}), 400

    secret_key = current_app.config.get("SECRET_KEY")
    if not secret_key:
        return jsonify({"error": "Server misconfigured: missing SECRET_KEY", "status": 500}), 500

    try:
        result = sign_user_content(user, content_type, payload, secret_key)
        return jsonify(result), 200
    except ValueError as err:
        return jsonify({"error": str(err), "status": 400}), 400
    except Exception as err:
        logger.error(f"Error signing content: {err}", exc_info=True)
        return jsonify({"error": "Failed to sign content", "status": 400}), 400


@content_moderation_bp.post("/reports")
@login_required
def submit_report():
    """Submit a report against user-generated content."""
    user = g.current_user
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object", "status": 400}), 400

    secret_key = current_app.config.get("SECRET_KEY")
    if not secret_key:
        return jsonify({"error": "Server misconfigured: missing SECRET_KEY", "status": 500}), 500

    try:
        response_data, status_code = report_content(user, data, secret_key)
        return jsonify(response_data), status_code
    except Exception as err:
        logger.error(f"Error submitting report: {err}", exc_info=True)
        return jsonify({"error": "Failed to submit report", "status": 500}), 500


@content_moderation_bp.post("/revocations/check")
def check_revocations_endpoint():
    """Public endpoint to check if content hashes have been revoked."""
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict) or "hashes" not in data or not isinstance(data["hashes"], list):
        return jsonify({"error": "Invalid request body, 'hashes' list required", "status": 400}), 400

    try:
        revoked_hashes = check_revocations(data["hashes"])
        return jsonify({"revoked_hashes": revoked_hashes}), 200
    except ValueError as err:
        return jsonify({"error": str(err), "status": 400}), 400
