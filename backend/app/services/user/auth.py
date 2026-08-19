# backend/app/services/user/auth.py
import logging
from typing import Optional, Tuple
from sqlalchemy import or_, select

from app.core.extensions import db
from app.core.security import (
    decode_token,
    generate_token,
    hash_password,
    verify_password,
)
from app.models import User

logger = logging.getLogger(__name__)


def create_user_account(
    username: str,
    email: str,
    password: str,
    role: str = "user",
    avatar_url: str = "default_avatar",
) -> Tuple[Optional[User], Optional[str]]:
    """Validate registration parameters, hash passwords, and persist new User entity."""
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
    )
    db.session.add(new_user)
    db.session.commit()

    logger.info(f"User '{new_user.username}' registered with role '{new_user.role}'.")
    return new_user, None


def authenticate_user_credentials(
    username_or_email: str,
    password: str,
) -> Tuple[Optional[User], Optional[str]]:
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


def retrieve_user_from_jwt(token: str) -> Optional[User]:
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

