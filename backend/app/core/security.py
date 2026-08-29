# backend/app/core/security.py
import functools
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
from flask import current_app, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash
from app.core.extensions import db
from app.models.user import User

logger = logging.getLogger(__name__)

DEFAULT_JWT_ALGORITHM = "HS256"
DEFAULT_SECRET_KEY = "dbd-lemon-secret-key-2026"
DEFAULT_EXPIRATION = timedelta(hours=24)


def hash_password(password: str) -> str:
    """Hash a plaintext password for secure database storage."""
    return generate_password_hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a stored password hash."""
    if not password or not password_hash:
        return False
    try:
        return check_password_hash(password_hash, password)
    except (ValueError, TypeError) as exc:
        # A hash produced by an older/incompatible hashing scheme (e.g. a
        # pre-refactor default account seeded before the password hashing
        # method changed) isn't a 500-worthy server error -- it just means
        # this credential can't be verified. Treat it as "wrong password".
        logger.warning(f"Password hash is unreadable/unsupported: {exc}")
        return False


def generate_token(user_id: int, role: str = "user", extra_claims: dict[str, Any] | None = None) -> str:
    """Generate a signed JWT for an authenticated user with fallback configuration."""
    now = datetime.now(timezone.utc)

    if current_app:
        expires_delta = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES") or DEFAULT_EXPIRATION
        secret_key = current_app.config.get("JWT_SECRET_KEY") or current_app.config.get("SECRET_KEY") or DEFAULT_SECRET_KEY
        algorithm = current_app.config.get("JWT_ALGORITHM") or DEFAULT_JWT_ALGORITHM
    else:
        expires_delta = DEFAULT_EXPIRATION
        secret_key = DEFAULT_SECRET_KEY
        algorithm = DEFAULT_JWT_ALGORITHM

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + expires_delta,
    }

    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, secret_key, algorithm=algorithm)


def decode_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT string with resilient algorithm and key configuration."""
    if not token:
        return None

    if current_app:
        secret_key = current_app.config.get("JWT_SECRET_KEY") or current_app.config.get("SECRET_KEY") or DEFAULT_SECRET_KEY
        algorithm = current_app.config.get("JWT_ALGORITHM") or DEFAULT_JWT_ALGORITHM
    else:
        secret_key = DEFAULT_SECRET_KEY
        algorithm = DEFAULT_JWT_ALGORITHM

    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("JWT validation failed: Token has expired.")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"JWT validation failed: {e}")
        return None
    except Exception as e:
        logger.warning(f"Unexpected error during JWT validation: {e}")
        return None


def get_current_user() -> User | None:
    """Extract and verify the current user from the Authorization Bearer header or query string."""
    auth_header = request.headers.get("Authorization")
    token: str | None = None

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    elif request.args.get("token"):
        token = request.args.get("token", "").strip()

    if not token:
        return None

    payload = decode_token(token)
    if not payload or "sub" not in payload:
        return None

    try:
        user_id = int(payload["sub"])
        user = db.session.get(User, user_id)
        if user and user.is_active:
            return user
    except Exception as err:
        logger.warning(f"Error fetching user from decoded token: {err}")
        return None

    return None


def login_required(f):
    """Decorator ensuring the request contains a valid JWT for an active user."""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required", "status": 401}), 401
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """Decorator ensuring the request contains a valid JWT for an active admin user."""
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
