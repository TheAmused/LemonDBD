# backend/app/core/security.py
import functools
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
from flask import current_app, g, jsonify, request
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash
from app.core.extensions import db
from app.models.user import User

logger = logging.getLogger(__name__)

DEFAULT_JWT_ALGORITHM = "HS256"
DEFAULT_SECRET_KEY = "dbd-lemon-secret-key-2026"
DEFAULT_EXPIRATION = timedelta(hours=24)

# The browser session lives in an HttpOnly cookie (JavaScript can never read it, so an XSS bug
# cannot steal it). `Authorization: Bearer` stays supported for API clients and tests.
SESSION_COOKIE_NAME = "lemondbd_session"
_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


def _cookie_secure() -> bool:
    configured = str(current_app.config.get("SESSION_COOKIE_SECURE_MODE", "auto")).lower()
    if configured in ("true", "1", "yes"):
        return True
    if configured in ("false", "0", "no"):
        return False
    return request.is_secure or request.headers.get("X-Forwarded-Proto", "").lower() == "https"


# The session cookie is valid for the whole site, not just /api: the Next.js proxy has to see it on
# page requests to tell admins from everyone else (admin-only pages). It is HttpOnly + SameSite=Lax,
# so scripts still can't read it and other sites can't send it. Until this was widened the cookie
# was scoped to /api; that legacy cookie is removed whenever a new one is written.
SESSION_COOKIE_PATH = "/"
_LEGACY_SESSION_COOKIE_PATH = "/api"


def _write_session_cookie(response, token: str, max_age: int):
    response.delete_cookie(SESSION_COOKIE_NAME, path=_LEGACY_SESSION_COOKIE_PATH, samesite="Lax")
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        max_age=max_age,
        httponly=True,
        secure=_cookie_secure(),
        samesite="Lax",
        path=SESSION_COOKIE_PATH,
    )
    return response


def set_session_cookie(response, token: str):
    """Attach the login cookie (HttpOnly, SameSite=Lax, Secure over HTTPS) to `response`."""
    max_age = int(DEFAULT_EXPIRATION.total_seconds())
    try:
        from app.services.site_settings import session_lifetime

        max_age = int(session_lifetime().total_seconds())
    except Exception:
        pass
    return _write_session_cookie(response, token, max_age)


def widen_legacy_session_cookie(response):
    """Re-issue an existing session cookie with the site-wide path, keeping its remaining lifetime.

    Sessions started before the cookie was widened only exist at /api; calling this on /auth/me
    (which every page load hits) upgrades them without signing anyone out or extending the session.
    """
    if request.headers.get("Authorization"):
        return response
    token = request.cookies.get(SESSION_COOKIE_NAME, "").strip()
    payload = decode_token(token) if token else None
    exp = payload.get("exp") if payload else None
    if not isinstance(exp, (int, float)):
        return response
    remaining = int(exp - datetime.now(timezone.utc).timestamp())
    if remaining <= 0:
        return response
    return _write_session_cookie(response, token, remaining)


def clear_session_cookie(response):
    for path in (SESSION_COOKIE_PATH, _LEGACY_SESSION_COOKIE_PATH):
        response.delete_cookie(SESSION_COOKIE_NAME, path=path, samesite="Lax")
    return response


def _allowed_request_origin(origin: str) -> bool:
    """Same host as the request, or one of the configured CORS origins."""
    from urllib.parse import urlsplit

    host = (urlsplit(origin).netloc or "").lower()
    request_hosts = {request.host.lower(), request.headers.get("X-Forwarded-Host", "").lower()}
    if host and host in request_hosts:
        return True
    configured = str(current_app.config.get("CORS_ORIGINS", "*"))
    return configured != "*" and origin.rstrip("/") in {o.strip().rstrip("/") for o in configured.split(",")}


def enforce_cookie_csrf_protection():
    """before_request: block cross-site writes that ride on the session cookie.

    SameSite=Lax already stops most of them; this also covers same-site siblings. Requests
    authenticated with an explicit Authorization header are not CSRF-able and pass through.
    """
    if request.method in _SAFE_METHODS or SESSION_COOKIE_NAME not in request.cookies:
        return None
    if request.headers.get("Authorization"):
        return None
    origin = request.headers.get("Origin")
    if not origin:
        referer = request.headers.get("Referer", "")
        if referer:
            from urllib.parse import urlsplit

            parts = urlsplit(referer)
            origin = f"{parts.scheme}://{parts.netloc}" if parts.netloc else None
    if origin and not _allowed_request_origin(origin):
        return jsonify({"error": "Cross-site request blocked.", "status": 403}), 403
    if not origin and request.headers.get("Sec-Fetch-Site", "same-origin") == "cross-site":
        return jsonify({"error": "Cross-site request blocked.", "status": 403}), 403
    return None


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


ACCESS_TOKEN_TYPE = "access"


def _current_token_version(user_id: int) -> int:
    """The account's credential version right now (0 when it cannot be read)."""
    try:
        version = db.session.scalar(select(User.token_version).where(User.id == user_id))
    except Exception as err:  # no app context / table not migrated yet
        logger.debug(f"Could not read token_version for user {user_id}: {err}")
        return 0
    return int(version or 0)


def token_matches_user(payload: dict[str, Any], user: User) -> bool:
    """True when a decoded JWT is a session token that is still valid for this account.

    Only ``typ == "access"`` tokens (or legacy tokens with no ``typ``) open a session, so a
    short-lived token minted for some other purpose can never be used as one. The ``ver`` claim
    must equal the account's current ``token_version``; a password change bumps it, which signs
    out every session issued before. Legacy tokens without ``ver`` count as version 0.
    """
    if payload.get("typ", ACCESS_TOKEN_TYPE) != ACCESS_TOKEN_TYPE:
        return False
    try:
        token_version = int(payload.get("ver", 0))
    except (TypeError, ValueError):
        return False
    return token_version == int(user.token_version or 0)


def generate_token(
    user_id: int,
    role: str = "user",
    extra_claims: dict[str, Any] | None = None,
    token_version: int | None = None,
    token_type: str = ACCESS_TOKEN_TYPE,
) -> str:
    """Generate a signed JWT for an authenticated user with fallback configuration.

    ``token_type`` (``typ``) says what the token may be used for and ``token_version`` (``ver``)
    which generation of the account's credentials it belongs to; left unset, the account's
    current version is looked up.
    """
    now = datetime.now(timezone.utc)

    if current_app:
        expires_delta = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES") or DEFAULT_EXPIRATION
        try:  # admin-editable session length (falls back to the config value above)
            from app.services.site_settings import session_lifetime

            expires_delta = session_lifetime()
        except Exception:
            pass
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
        "typ": token_type,
        "ver": token_version if token_version is not None else _current_token_version(user_id),
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
    """Extract and verify the current user from the Authorization Bearer header, the session cookie or the query string."""
    auth_header = request.headers.get("Authorization")
    token: str | None = None

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    elif request.cookies.get(SESSION_COOKIE_NAME):
        token = request.cookies.get(SESSION_COOKIE_NAME, "").strip()
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
        if user and user.is_active and token_matches_user(payload, user):
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
