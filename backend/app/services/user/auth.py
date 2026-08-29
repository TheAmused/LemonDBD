# backend/app/services/user/auth.py
import logging
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy import or_, select

from app.core.db_retry import retry_on_transient_db_error
from app.core.extensions import db
from app.core.security import (
    decode_token,
    generate_token,
    hash_password,
    verify_password,
)
from app.models import User
from app.services.mail_service import send_password_reset_email, send_verification_email

logger = logging.getLogger(__name__)

VERIFICATION_CODE_LIFETIME = timedelta(hours=24)
RESET_TOKEN_LIFETIME = timedelta(hours=1)
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_VERIFICATION_ATTEMPTS = 5


def _generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


@retry_on_transient_db_error()
def create_user_account(
    username: str,
    email: str,
    password: str,
    role: str = "user",
    avatar_url: str = "default_avatar",
) -> tuple[User | None, str | None]:
    """Validate registration parameters, hash passwords, and persist new User entity.

    Retries on a transient connection drop/pool-timeout (see db_retry.py):
    safe here because the only write is the final db.session.commit() of
    new_user, and a dropped connection means that commit did not reach the
    server -- a retry either creates the account cleanly, or (in the rare
    case the drop happened after the server received but before we saw the
    ack) hits the username/email uniqueness check above and returns the
    normal "already taken" error instead of a 500. Either outcome is
    correct; neither double-creates an account.
    """
    clean_username = (username or "").strip()
    clean_email = (email or "").strip().lower()

    if not clean_username or len(clean_username) < 3:
        return None, "Username must be at least 3 characters long."
    if not clean_email or "@" not in clean_email:
        return None, "A valid email address is required."
    if not password or len(password) < 6:
        return None, "Password must be at least 6 characters long."

    existing_username = db.session.scalars(
        select(User).where(User.username.ilike(clean_username))
    ).first()
    if existing_username:
        return None, "Username is already taken."

    existing_email = db.session.scalars(
        select(User).where(User.email.ilike(clean_email))
    ).first()
    if existing_email:
        return None, "Email address is already registered."

    role_clean = role.lower() if role in ["admin", "user"] else "user"
    pw_hash = hash_password(password)

    new_user = User(
        username=clean_username,
        email=clean_email,
        password_hash=pw_hash,
        role=role_clean,
        avatar_url=avatar_url or "default_avatar",
        is_active=True,
        is_verified=False,
        verification_code=_generate_verification_code(),
        verification_code_expires_at=datetime.now(timezone.utc) + VERIFICATION_CODE_LIFETIME,
        verification_attempts=0,
    )
    db.session.add(new_user)
    db.session.commit()

    logger.info(f"User '{new_user.username}' registered with role '{new_user.role}'.")
    send_verification_email(new_user)
    return new_user, None


def verify_email_code(email: str, code: str) -> tuple[User | None, str | None]:
    """Consume a verification code and mark the matching user as verified."""
    clean_email = (email or "").strip().lower()
    clean_code = (code or "").strip()
    if not clean_email or not clean_code:
        return None, "Email and verification code are required."

    user = db.session.scalars(
        select(User).where(User.email.ilike(clean_email))
    ).first()
    if not user or not user.verification_code:
        return None, "Invalid or already used verification code."

    expires_at = user.verification_code_expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at < datetime.now(timezone.utc):
        return None, "This verification code has expired. Please request a new one."

    if user.verification_code != clean_code:
        user.verification_attempts += 1
        if user.verification_attempts >= MAX_VERIFICATION_ATTEMPTS:
            user.verification_code = None
            user.verification_code_expires_at = None
            user.verification_attempts = 0
            db.session.commit()
            return None, "Too many incorrect attempts. Please request a new code."
        db.session.commit()
        return None, "Invalid or already used verification code."

    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires_at = None
    user.verification_attempts = 0
    db.session.commit()

    logger.info(f"User '{user.username}' verified their email.")
    return user, None


def resend_verification_email(email: str) -> tuple[bool, str | None]:
    """Regenerate and resend a verification code if the account isn't verified yet."""
    clean_email = (email or "").strip().lower()
    if not clean_email:
        return True, None

    user = db.session.scalars(
        select(User).where(User.email.ilike(clean_email))
    ).first()
    if not user or user.is_verified:
        return True, None

    if user.verification_code_expires_at:
        expires_at = user.verification_code_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        last_sent_at = expires_at - VERIFICATION_CODE_LIFETIME
        elapsed = datetime.now(timezone.utc) - last_sent_at
        if elapsed < RESEND_COOLDOWN:
            wait_seconds = int((RESEND_COOLDOWN - elapsed).total_seconds()) + 1
            return False, f"Please wait {wait_seconds}s before requesting another code."

    user.verification_code = _generate_verification_code()
    user.verification_code_expires_at = datetime.now(timezone.utc) + VERIFICATION_CODE_LIFETIME
    user.verification_attempts = 0
    db.session.commit()
    send_verification_email(user)
    return True, None


def request_password_reset(email: str) -> tuple[bool, str | None]:
    """Generate a reset token and email it, if an account with this email exists."""
    clean_email = (email or "").strip().lower()
    if not clean_email:
        return True, None

    user = db.session.scalars(
        select(User).where(User.email.ilike(clean_email))
    ).first()
    if not user:
        return True, None

    if user.reset_token_expires_at:
        expires_at = user.reset_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        last_sent_at = expires_at - RESET_TOKEN_LIFETIME
        elapsed = datetime.now(timezone.utc) - last_sent_at
        if elapsed < RESEND_COOLDOWN:
            wait_seconds = int((RESEND_COOLDOWN - elapsed).total_seconds()) + 1
            return False, f"Please wait {wait_seconds}s before requesting another reset email."

    user.reset_token = secrets.token_urlsafe(32)
    user.reset_token_expires_at = datetime.now(timezone.utc) + RESET_TOKEN_LIFETIME
    db.session.commit()
    send_password_reset_email(user)
    return True, None


def reset_password_with_token(token: str, new_password: str) -> tuple[User | None, str | None]:
    """Consume a reset token and set a new password for the matching user."""
    clean_token = (token or "").strip()
    if not clean_token:
        return None, "Reset token is required."
    if not new_password or len(new_password) < 6:
        return None, "Password must be at least 6 characters long."

    user = db.session.scalars(
        select(User).where(User.reset_token == clean_token)
    ).first()
    if not user:
        return None, "Invalid or already used reset link."

    expires_at = user.reset_token_expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at < datetime.now(timezone.utc):
        return None, "This reset link has expired. Please request a new one."

    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    db.session.commit()

    logger.info(f"User '{user.username}' reset their password.")
    return user, None


@retry_on_transient_db_error()
def authenticate_user_credentials(
    username_or_email: str,
    password: str,
) -> tuple[User | None, str | None]:
    """Verify username/email and password against stored database hash."""
    clean_id = (username_or_email or "").strip()
    if not clean_id or not password:
        return None, None

    user = db.session.scalars(
        select(User).where(
            or_(
                User.username.ilike(clean_id),
                User.email.ilike(clean_id.lower()),
            )
        )
    ).first()

    if not user or not user.is_active:
        return None, None

    if verify_password(password, user.password_hash):
        token = generate_token(user.id, user.role)
        return user, token

    return None, None


def retrieve_user_from_jwt(token: str) -> User | None:
    """Decode incoming JWT and fetch corresponding active User entity."""
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        return None
    try:
        user_id = int(payload["sub"])
        user = db.session.get(User, user_id)
        if user and user.is_active:
            return user
    except (ValueError, TypeError):
        return None
    return None
