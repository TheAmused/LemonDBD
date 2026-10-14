# backend/app/routes/auth_two_factor.py
"""Optional two-factor sign-in endpoints (see app/services/user/two_factor.py)."""
from flask import Blueprint, g, jsonify, make_response, request
from pydantic import ValidationError

from app.core.limiter import limiter
from app.core.security import SESSION_COOKIE_NAME, login_required, set_session_cookie
from app.routes.auth import session_response, user_service
from app.schemas.auth import (
    TwoFactorConfirmDTO,
    TwoFactorDisableDTO,
    TwoFactorLoginDTO,
    TwoFactorRecoveryCodesDTO,
    TwoFactorSetupDTO,
)
from app.services.user import two_factor
from app.utils.api_i18n import coded_error_response
from app.utils.responses import api_error

auth_two_factor_bp = Blueprint("auth_two_factor_bp", __name__, url_prefix="/api/v1/auth")


def _no_store(response):
    """Secrets and recovery codes must never be cached by a browser or a proxy."""
    response.headers["Cache-Control"] = "no-store"
    return response


def _with_fresh_session(payload: dict):
    """Enabling or disabling 2FA bumps token_version; keep the active session signed in."""
    token = user_service.generate_auth_token(g.current_user)
    response = _no_store(make_response(jsonify({**payload, "token": token}), 200))
    if SESSION_COOKIE_NAME in request.cookies:
        set_session_cookie(response, token)
    return response


@auth_two_factor_bp.route("/login/two-factor", methods=["POST"])
@limiter.limit("10 per minute")
def login_two_factor():
    """Second step of a sign-in: the challenge from POST /auth/login plus a code."""
    try:
        dto = TwoFactorLoginDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors())

    try:
        user, method = two_factor.complete_login(dto.two_factor_token, dto.code)
    except two_factor.TwoFactorError as err:
        return coded_error_response(err)
    return session_response(
        user,
        user_service.generate_auth_token(user),
        "Login successful",
        extra={
            "two_factor_method": method,
            "recovery_codes_remaining": two_factor.status(user)["recovery_codes_remaining"],
        },
    )


@auth_two_factor_bp.route("/two-factor", methods=["GET"])
@login_required
def two_factor_status():
    return _no_store(jsonify(two_factor.status(g.current_user)))


@auth_two_factor_bp.route("/two-factor/setup", methods=["POST"])
@limiter.limit("10 per minute")
@login_required
def two_factor_setup():
    try:
        dto = TwoFactorSetupDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors())

    try:
        result = two_factor.begin_setup(g.current_user, dto.password)
    except two_factor.TwoFactorError as err:
        return coded_error_response(err)
    return _no_store(jsonify(result))


@auth_two_factor_bp.route("/two-factor/enable", methods=["POST"])
@limiter.limit("10 per minute")
@login_required
def two_factor_enable():
    try:
        dto = TwoFactorConfirmDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors())

    try:
        codes = two_factor.confirm_setup(g.current_user, dto.code)
    except two_factor.TwoFactorError as err:
        return coded_error_response(err)
    return _with_fresh_session({"status": "success", "recovery_codes": codes})


@auth_two_factor_bp.route("/two-factor/disable", methods=["POST"])
@limiter.limit("10 per minute")
@login_required
def two_factor_disable():
    try:
        dto = TwoFactorDisableDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors())

    try:
        two_factor.disable(g.current_user, dto.password, dto.code)
    except two_factor.TwoFactorError as err:
        return coded_error_response(err)
    return _with_fresh_session({"status": "success"})


@auth_two_factor_bp.route("/two-factor/recovery-codes", methods=["POST"])
@limiter.limit("10 per minute")
@login_required
def two_factor_recovery_codes():
    try:
        dto = TwoFactorRecoveryCodesDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors())

    try:
        codes = two_factor.regenerate_recovery_codes(g.current_user, dto.password, dto.code)
    except two_factor.TwoFactorError as err:
        return coded_error_response(err)
    return _no_store(jsonify({"status": "success", "recovery_codes": codes}))

