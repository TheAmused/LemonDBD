# backend/app/routes/auth_google.py
from flask import Blueprint, jsonify, make_response, request

from app.core.limiter import limiter
from app.routes.auth import ownership_service, session_response, user_service
from app.services.user import google_auth, two_factor

auth_google_bp = Blueprint("auth_google_bp", __name__, url_prefix="/api/v1/auth/google")


@auth_google_bp.route("/config", methods=["GET"])
def google_config():
    resp = make_response(jsonify({
        "enabled": google_auth.is_configured(),
        "client_id": google_auth.client_id(),
    }), 200)
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return resp


@auth_google_bp.route("", methods=["POST"])
@limiter.limit("10 per minute")
def google_sign_in():
    credential = (request.get_json(silent=True) or {}).get("credential")
    try:
        user, created = google_auth.sign_in(credential)
    except google_auth.GoogleAuthError as err:
        return jsonify({"error": err.message, "status": err.status}), err.status

    if created:
        ownership_service.seed_default_ownership_for_new_user(user.id)

    if two_factor.is_enabled(user.id):
        return jsonify({
            "status": "two_factor_required",
            "two_factor_token": two_factor.create_challenge(user),
            "methods": ["totp", "recovery"],
        }), 200

    return session_response(
        user,
        user_service.generate_auth_token(user),
        "Account created" if created else "Login successful",
        status=201 if created else 200,
    )
