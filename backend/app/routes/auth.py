# backend/app/routes/auth.py
import logging
import os
from flask import Blueprint, current_app, g, jsonify, make_response, request, send_from_directory
from pydantic import ValidationError

from app.core.security import get_current_user, login_required
from app.schemas.user import UserCreate, UserResponse
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/v1/auth")

user_service = UserService()
ownership_service = OwnershipService()


@auth_bp.route("/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True) or {}
    
    # 1. Validate payload structure using Pydantic
    try:
        validated_data = UserCreate.model_validate(payload)
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.errors(), "status": 400}), 400

    # 2. Register user
    user, err = user_service.register_user(
        username=validated_data.username,
        email=validated_data.email,
        password=validated_data.password,
        role=validated_data.role or "user",
    )
    if err:
        return jsonify({"error": err, "status": 400}), 400

    # 3. Generate token & get ownership summary
    token = user_service.generate_auth_token(user)
    summary = ownership_service.get_user_ownership_summary(user.id)

    return jsonify({
        "status": "success",
        "message": "User registered successfully",
        "token": token,
        "token_type": "Bearer",
        "user": UserResponse.model_validate(user).model_dump(),
        "ownership": summary,
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username_or_email = data.get("username") or data.get("email") or data.get("username_or_email")
    password = data.get("password")

    if not username_or_email or not password:
        return jsonify({"error": "Username/email and password are required.", "status": 400}), 400

    user, token = user_service.authenticate(username_or_email.strip(), password.strip())
    if not user or not token:
        return jsonify({"error": "Invalid credentials or account disabled.", "status": 401}), 401

    summary = ownership_service.get_user_ownership_summary(user.id)

    return jsonify({
        "status": "success",
        "message": "Login successful",
        "token": token,
        "token_type": "Bearer",
        "user": UserResponse.model_validate(user).model_dump(),
        "ownership": summary,
    }), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"status": "success", "message": "Logged out successfully"}), 200


@auth_bp.route("/me", methods=["GET"])
def get_current_user_profile():
    user = get_current_user()
    if not user:
        resp = make_response(jsonify({"user": None, "authenticated": False}))
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return resp, 200

    summary = ownership_service.get_user_ownership_summary(user.id)
    resp = make_response(jsonify({
        "authenticated": True,
        "user": UserResponse.model_validate(user).model_dump(),
        "ownership": summary,
    }))
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return resp, 200


@auth_bp.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    user = g.current_user
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    avatar_url = data.get("avatar_url")
    new_password = data.get("new_password")

    updated_user, err = user_service.update_user_profile(
        user_id=user.id,
        email=email,
        avatar_url=avatar_url,
        new_password=new_password,
    )
    if err:
        return jsonify({"error": err, "status": 400}), 400

    return jsonify({
        "status": "success",
        "message": "Profile updated successfully",
        "user": UserResponse.model_validate(updated_user).model_dump(),
    }), 200


@auth_bp.route("/avatar", methods=["POST"])
@login_required
def upload_avatar():
    user = g.current_user
    file = request.files.get("avatar") or request.files.get("file")
    if not file:
        return jsonify({"error": "No avatar file provided ('avatar' or 'file').", "status": 400}), 400

    updated_user, err = user_service.save_user_avatar(user.id, file)
    if err:
        return jsonify({"error": err, "status": 400}), 400

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
    updated_user, err = user_service.delete_user_avatar(user.id)
    if err:
        return jsonify({"error": err, "status": 400}), 400

    return jsonify({
        "status": "success",
        "message": "Avatar reset to default.",
        "avatar_url": updated_user.avatar_url,
        "user": UserResponse.model_validate(updated_user).model_dump(),
    }), 200


@auth_bp.route("/avatar/file/<path:filename>", methods=["GET"])
def get_avatar_file(filename):
    clean_filename = os.path.basename(filename)
    primary_dir = user_service._get_avatar_dir()
    
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
        return jsonify({"error": f"Avatar image '{clean_filename}' not found on server."}), 404

    mimetype = "image/webp" if clean_filename.lower().endswith(".webp") else None
    return send_from_directory(target_dir, clean_filename, mimetype=mimetype, max_age=86400 * 30)