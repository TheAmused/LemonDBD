# backend/app/routes/auth.py
import logging
import os
from flask import Blueprint, current_app, g, jsonify, make_response, request, send_from_directory
from pydantic import ValidationError

from app.core.account_state import AccountBlockedError
from app.core.config import demo_accounts_enabled
from app.core.altcha_guard import require_altcha
from app.core.limiter import limiter, validate_honeypot
from app.core.security import (
    generate_token,
    clear_session_cookie,
    get_current_user,
    login_required,
    set_session_cookie,
    widen_legacy_session_cookie,
)
from app.schemas.user import UserCreate, UserResponse
from app.services import site_settings
from app.services.altcha_service import AltchaService
from app.services.user import (
    authenticate_user_credentials,
    clear_user_avatar,
    create_user_account,
    delete_own_account,
    export_filename,
    export_user_data,
    get_avatar_storage_directory,
    modify_user_profile,
    process_and_save_avatar,
    request_password_reset,
    resend_verification_email,
    reset_password_with_token,
    two_factor,
    verify_email_code,
)
from app.services.user.profile import auto_verify_user
from app.services.moderation_actions import acknowledge_warning, blocked_response, pending_warnings
from app.services.ownership_service import OwnershipService
from app.utils.api_i18n import coded_error_response, error_response
from app.utils.downloads import json_download_response
from app.utils.responses import api_error

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/v1/auth")

ownership_service = OwnershipService()


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("10 per minute")
@require_altcha
def register():
    payload = request.get_json(silent=True) or {}

    if not validate_honeypot(payload):
        return api_error("Spam detected.", 400)

    if not site_settings.registration_open():
        return error_response("registration_closed", 403)

    try:
        validated_data = UserCreate.model_validate(payload)
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors())

    user, err = create_user_account(
        login=validated_data.login,
        username=validated_data.username,
        email=validated_data.email,
        password=validated_data.password,
        role=validated_data.role or "user",
    )
    if err:
        return api_error(err, 400)

    ownership_service.seed_default_ownership_for_new_user(user.id)
    token = generate_token(user.id, user.role)
    summary = ownership_service.get_user_ownership_summary(user.id)

    response = make_response(jsonify({
        "status": "success",
        "message": "User registered successfully",
        "token": token,
        "token_type": "Bearer",
        "user": UserResponse.model_validate(user).model_dump(),
        "ownership": summary,
    }), 201)
    return set_session_cookie(response, token)


def session_response(user, token: str, message: str, status: int = 200, extra: dict | None = None):
    """The JSON body (plus session cookie) returned when a sign-in completes."""
    response = make_response(jsonify({
        "status": "success",
        "message": message,
        "token": token,
        "token_type": "Bearer",
        "user": UserResponse.model_validate(user).model_dump(),
        "ownership": ownership_service.get_user_ownership_summary(user.id),
        "moderation": {"warnings": pending_warnings(user.id)},
        **(extra or {}),
    }), status)
    return set_session_cookie(response, token)


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
@require_altcha
def login():
    data = request.get_json(silent=True) or {}
    login_or_email = (
        data.get("login")
        or data.get("username")
        or data.get("email")
        or data.get("login_or_email")
        or data.get("username_or_email")
    )
    password = data.get("password")

    if not login_or_email or not password:
        return api_error("Login/email and password are required.", 400)

    try:
        user, token = authenticate_user_credentials(login_or_email.strip(), password.strip())
    except AccountBlockedError as blocked:
        return blocked_response(blocked.user)
    if not user:
        return api_error("Invalid credentials", 401)

    if two_factor.is_enabled(user.id):
        # Password accepted, but no session yet: the client must finish with POST /auth/login/two-factor.
        return jsonify({
            "status": "two_factor_required",
            "two_factor_token": two_factor.create_challenge(user),
            "methods": ["totp", "recovery"],
        }), 200

    return session_response(user, token or generate_token(user.id, user.role), "Login successful")


@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    code = data.get("code")
    user, err = verify_email_code(email, code)
    if err:
        return jsonify({"status": "error", "message": err}), 400

    return jsonify({
        "status": "success",
        "message": "Email verified successfully.",
        "user": UserResponse.model_validate(user).model_dump(),
    }), 200


@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    if not email:
        return api_error("Email is required.", 400)

    ok, err = resend_verification_email(email)
    if not ok:
        return api_error(err, 429)

    return jsonify({
        "status": "success",
        "message": "If that account exists and isn't verified yet, a new verification email has been sent.",
    }), 200


@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("5 per minute")
@require_altcha
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    if not email:
        return api_error("Email is required.", 400)

    ok, err = request_password_reset(email)
    if not ok:
        return api_error(err, 429)

    return jsonify({
        "status": "success",
        "message": "If that email is registered, a password reset link has been sent.",
    }), 200


@auth_bp.route("/reset-password", methods=["POST"])
@limiter.limit("5 per minute")
def reset_password():
    data = request.get_json(silent=True) or {}
    token = data.get("token")
    new_password = data.get("new_password")

    user, err = reset_password_with_token(token, new_password)
    if err:
        return api_error(err, 400)

    return jsonify({"status": "success", "message": "Password reset successfully."}), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    response = make_response(jsonify({"status": "success", "message": "Logged out successfully"}), 200)
    return clear_session_cookie(response)


@auth_bp.route("/me", methods=["GET"])
def get_current_user_profile():
    user = get_current_user()
    if not user:
        resp = make_response(jsonify({"user": None, "authenticated": False}))
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return resp, 200

    require_verification = current_app.config.get("REQUIRE_EMAIL_VERIFICATION", True)
    if not require_verification and not user.is_verified:
        auto_verify_user(user)


    summary = ownership_service.get_user_ownership_summary(user.id)
    resp = make_response(jsonify({
        "authenticated": True,
        "user": UserResponse.model_validate(user).model_dump(),
        "ownership": summary,
        "moderation": {"warnings": pending_warnings(user.id)},
    }))
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return widen_legacy_session_cookie(resp), 200


@auth_bp.route("/sanctions/<int:sanction_id>/acknowledge", methods=["POST"])
@limiter.limit("30 per minute")
@login_required
def acknowledge_sanction(sanction_id: int):
    """The signed-in account holder confirms they have read one of their warnings."""
    if not acknowledge_warning(g.current_user, sanction_id):
        return api_error("Warning not found", 404)
    return jsonify({"status": "success"}), 200


@auth_bp.route("/profile", methods=["PUT"])
@limiter.limit("20 per minute")
@login_required
def update_profile():
    user = g.current_user
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    avatar_url = data.get("avatar_url")
    new_password = data.get("new_password")
    current_password = data.get("current_password")

    try:
        updated_user, err = modify_user_profile(
            user_id=user.id,
            email=email,
            avatar_url=avatar_url,
            new_password=new_password,
            current_password=str(current_password) if current_password else None,
            two_factor_code=data.get("two_factor_code"),
            username=data.get("username"),
        )
    except two_factor.TwoFactorError as err:
        return coded_error_response(err)
    if err:
        status = 403 if err == "Incorrect password." else 400
        return api_error(err, status)

    body: dict = {
        "status": "success",
        "message": "Profile updated successfully",
        "user": UserResponse.model_validate(updated_user).model_dump(),
    }
    if not new_password:
        return jsonify(body), 200

    # The password changed, so every older session was just signed out: hand this one a fresh token.
    token = generate_token(updated_user.id, updated_user.role)
    body["token"] = token
    body["token_type"] = "Bearer"
    return set_session_cookie(make_response(jsonify(body), 200), token)


@auth_bp.route("/avatar", methods=["POST"])
@login_required
def upload_avatar():
    user = g.current_user
    file = request.files.get("avatar") or request.files.get("file")
    if not file:
        return error_response("no_avatar_file", 400)

    updated_user, err = process_and_save_avatar(user.id, file)
    if err:
        return api_error(err, 400)

    return jsonify({
        "status": "success",
        "message": "Avatar uploaded, cropped, and converted to WebP successfully.",
        "avatar_url": updated_user.avatar_url,
        "user": UserResponse.model_validate(updated_user).model_dump(),
    }), 200


@auth_bp.route("/avatar", methods=["DELETE"])
@login_required
def delete_avatar():
    user = g.current_user
    updated_user, err = clear_user_avatar(user.id)
    if err:
        return api_error(err, 400)

    return jsonify({
        "status": "success",
        "message": "Avatar reset to default.",
        "avatar_url": updated_user.avatar_url,
        "user": UserResponse.model_validate(updated_user).model_dump(),
    }), 200


@auth_bp.route("/account/export", methods=["GET"])
@limiter.limit("10 per hour")
@login_required
def export_account_data():
    """Download everything the server holds about the signed-in account as JSON."""
    user_id = g.current_user.id
    data = export_user_data(user_id, requested_by="self")
    if data is None:
        return api_error("Account not found.", 404)
    return json_download_response(data, export_filename(user_id, "self"))


@auth_bp.route("/account", methods=["DELETE"])
@limiter.limit("5 per minute")
@login_required
def delete_account():
    """Permanently delete the signed-in account (requires the current password)."""
    data = request.get_json(silent=True) or {}
    try:
        ok, err = delete_own_account(
            g.current_user.id,
            str(data.get("password") or ""),
            data.get("two_factor_code"),
            data.get("google_credential"),
        )
    except two_factor.TwoFactorError as err:
        return coded_error_response(err)
    if not ok:
        status = 403 if err == "Incorrect password." else 400
        return api_error(err, status)
    response = make_response(jsonify({"status": "success", "message": "Account deleted."}), 200)
    return clear_session_cookie(response)


@auth_bp.route("/avatar/file/<path:filename>", methods=["GET"])
def get_avatar_file(filename: str):
    clean_filename = os.path.basename(filename)
    primary_dir = get_avatar_storage_directory()
    
    candidate_dirs = [
        primary_dir,
        os.path.abspath(os.path.join(current_app.root_path, "static", "uploads", "avatars")),
        os.path.abspath(os.path.join(os.getcwd(), "app", "static", "uploads", "avatars")),
        os.path.abspath(os.path.join(os.getcwd(), "static", "uploads", "avatars")),
    ]

    target_dir = None
    for d in candidate_dirs:
        if os.path.isfile(os.path.join(d, clean_filename)):
            target_dir = d
            break

    if not target_dir:
        return api_error(f"Avatar image '{clean_filename}' not found on server.", 404)

    mimetype = "image/webp" if clean_filename.lower().endswith(".webp") else None
    return send_from_directory(target_dir, clean_filename, mimetype=mimetype, max_age=86400 * 30)


@auth_bp.route("/altcha-challenge", methods=["GET"])
def get_altcha_challenge():
    secret_key = current_app.config.get("SECRET_KEY") or ""
    challenge = AltchaService.create_challenge(secret_key=secret_key)
    resp = make_response(jsonify(challenge), 200)
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return resp


@auth_bp.route("/demo-accounts", methods=["GET"])
def get_demo_accounts():
    """Development only: the demo logins the sign-in modal offers as quick-fill buttons.

    Outside FLASK_ENV=development the list is empty, so a production build never
    shows (or even receives) these credentials.
    """
    accounts: list[dict[str, str]] = []
    if demo_accounts_enabled():
        from app.seeds.user_seeder import DEMO_ACCOUNTS

        accounts = [
            {
                "role": "admin" if account["role"] == "admin" else "player",
                "login": account["login"],
                "password": account["password"],
                # "warned" / "suspended" / "banned" for the moderation-state accounts, else "active".
                "state": account.get("state", "active"),
            }
            for account in DEMO_ACCOUNTS
        ]
    resp = make_response(jsonify({"enabled": bool(accounts), "accounts": accounts}), 200)
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return resp
