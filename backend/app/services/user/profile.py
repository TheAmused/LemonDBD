# backend/app/services/user/profile.py
from sqlalchemy import select

from app.core.extensions import db
from app.core.security import hash_password
from app.models import User


def fetch_user_by_id(user_id: int) -> User | None:
    """Retrieve user entity by primary key."""
    return db.session.get(User, user_id)


def modify_user_profile(
    user_id: int,
    email: str | None = None,
    avatar_url: str | None = None,
    new_password: str | None = None,
) -> tuple[User | None, str | None]:
    """Update profile attributes including email address, avatar, or password."""
    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    if email:
        clean_email = email.strip().lower()
        if clean_email != user.email:
            existing = db.session.scalars(
                select(User).where(User.email.ilike(clean_email), User.id != user_id)
            ).first()
            if existing:
                return None, "Email address is already in use."
            user.email = clean_email

    if avatar_url:
        user.avatar_url = avatar_url.strip()

    if new_password:
        if len(new_password) < 6:
            return None, "New password must be at least 6 characters long."
        user.password_hash = hash_password(new_password)

    db.session.commit()
    return user, None
