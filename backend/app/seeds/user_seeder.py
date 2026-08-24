# backend/app/seeds/user_seeder.py
import logging
from sqlalchemy import or_, select
from app.core.extensions import db
from app.core.security import hash_password
from app.models.user import User

logger = logging.getLogger(__name__)


def seed_default_users() -> None:
    """
    Seeds baseline default admin and test user accounts.
    Thread-safe and idempotent to prevent unique constraint crashes under Gunicorn concurrency.
    """
    default_users = [
        {
            "username": "lemon",
            "email": "lemon@lemondbd.com",
            "password": "lemon",
            "role": "admin",
            "avatar_url": "default_avatar",
        },
        {
            "username": "user",
            "email": "survivor@lemondbd.com",
            "password": "user",
            "role": "user",
            "avatar_url": "default_avatar",
        },
    ]

    try:
        for udata in default_users:
            existing = db.session.scalar(
                select(User).where(
                    or_(
                        User.username == udata["username"],
                        User.email == udata["email"],
                    )
                )
            )
            if not existing:
                new_user = User(
                    username=udata["username"],
                    email=udata["email"],
                    password_hash=hash_password(udata["password"]),
                    role=udata["role"],
                    avatar_url=udata["avatar_url"],
                    is_active=True,
                    is_verified=True,
                )
                db.session.add(new_user)
                try:
                    db.session.commit()
                    logger.info(f"Default user seeded: {udata['username']} ({udata['role']})")
                except Exception as commit_err:
                    db.session.rollback()
                    logger.debug(f"Worker concurrency notice seeding user {udata['username']}: {commit_err}")
            else:
                # Ensure the primary user retains admin role
                if existing.username == "lemon" and existing.role != "admin":
                    existing.role = "admin"
                    db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.warning(f"Error during default user seeding: {e}")