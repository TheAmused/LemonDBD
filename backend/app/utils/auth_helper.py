import functools
from flask import request, jsonify, g
from app.services.user_service import UserService

user_service = UserService()


def get_current_user():
    """Extract user from Authorization Bearer token or query param."""
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1].strip()
    elif request.args.get("token"):
        token = request.args.get("token").strip()

    if not token:
        return None

    return user_service.verify_token(token)


def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required", "status": 401}), 401
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required", "status": 401}), 401
        if user.role != "admin":
            return jsonify({"error": "Admin access required", "status": 403}), 403
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function
