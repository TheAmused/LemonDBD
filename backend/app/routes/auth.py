import logging
from flask import Blueprint, request, jsonify, g
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
        return jsonify({"user": None, "authenticated": False}), 200

    summary = ownership_service.get_user_ownership_summary(user.id)
    return jsonify({
        "authenticated": True,
        "user": user.to_dict(),
        "ownership": summary,
    }), 200


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
