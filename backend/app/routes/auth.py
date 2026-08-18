import logging
import os
from flask import Blueprint, request, jsonify, g, make_response, send_from_directory, current_app
from app.services.user_service import UserService
from app.services.ownership_service import OwnershipService
from app.utils.auth_helper import login_required, get_current_user

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/v1/auth")

user_service = UserService()
ownership_service = OwnershipService()


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "user")

    user, err = user_service.register_user(
        username=username,
        email=email,
        password=password,
        role=role,
    )
    if err:
        return jsonify({"error": err, "status": 400}), 400

    token = user_service.generate_token(user.id)
    summary = ownership_service.get_user_ownership_summary(user.id)

    return jsonify({
        "status": "success",
        "message": "User registered successfully",
        "token": token,
        "user": user.to_dict(),
        "ownership": summary,
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username_or_email = data.get("username") or data.get("email") or data.get("username_or_email")
    password = data.get("password")

    if not username_or_email or not password:
        return jsonify({"error": "Username/email and password are required.", "status": 400}), 400

    user, token = user_service.authenticate(username_or_email, password)
    if not user:
        return jsonify({"error": "Invalid credentials or account disabled.", "status": 401}), 401

    summary = ownership_service.get_user_ownership_summary(user.id)

    return jsonify({
        "status": "success",
        "message": "Login successful",
        "token": token,
        "user": user.to_dict(),
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
        "user": user.to_dict(),
        "ownership": summary,
    }))
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return resp, 200


@auth_bp.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    user = g.current_user
    data = request.get_json() or {}
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
        "user": updated_user.to_dict(),
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
        "user": updated_user.to_dict(),
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
        "user": updated_user.to_dict(),
    }), 200


@auth_bp.route("/avatar/file/<path:filename>", methods=["GET"])
def get_avatar_file(filename):
    """
    Publicly serve user avatars with explicit image/webp MIME type.
    Searches primary and alternative static folders inside the container.
    """
    clean_filename = os.path.basename(filename)
    primary_dir = user_service._get_avatar_dir()
    
    # Candidate directory locations inside the container
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