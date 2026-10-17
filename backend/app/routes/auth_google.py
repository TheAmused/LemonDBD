# backend/app/routes/auth_google.py
from flask import Blueprint, jsonify, make_response, request

from app.core.account_state import AccountBlockedError
from app.core.limiter import limiter
from app.core.rate_limits import per_minute
from app.core.security import generate_token
from app.routes.auth import ownership_service, session_response
from app.services import site_settings
from app.services.moderation_actions import blocked_response
from app.services.user import google_auth, two_factor

auth_google_bp = Blueprint("auth_google_bp", __name__, url_prefix="/api/v1/auth/google")


@auth_google_bp.route("/config", methods=["GET"])
def google_config():
    resp = make_response(jsonify({
        "enabled": site_settings.google_sign_in_available(),
        "client_id": google_auth.client_id(),
    }), 200)
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return resp


from pydantic import ValidationError

from app.schemas.auth import GoogleSignInDTO
from app.utils.responses import api_error


@auth_google_bp.route("", methods=["POST"])
@limiter.limit(per_minute("rate_auth_per_minute"))
def google_sign_in():
    try:
        dto = GoogleSignInDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Field 'credential' is required", 400, details=err.errors())

    try:
        user, created = google_auth.sign_in(dto.credential)
    except google_auth.GoogleAuthError as err:
        return api_error(err.message, err.status)
    except AccountBlockedError as blocked:
        return blocked_response(blocked.user)

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
        generate_token(user.id, user.role),
        "Account created" if created else "Login successful",
        status=201 if created else 200,
    )

