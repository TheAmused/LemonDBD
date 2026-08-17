import logging
from werkzeug.security import generate_password_hash
from sqlalchemy import select
from app.extensions import db
from app.models import User

logger = logging.getLogger(__name__)

DEFAULT_USERS = [
    {
        "username": "lemon",
        "email": "lemon@lemondbd.com",
        "password": "lemon",
        "role": "admin",
        "avatar_url": "avatar_admin",
    },
    {
        "username": "user",
        "email": "user@lemondbd.com",
        "password": "user",
        "role": "user",
        "avatar_url": "avatar_survivor",
    },
]


def seed_default_users() -> None:
    """
    Automatic seeder that ensures default users exist:
    - Admin: lemon / lemon
    - Test User: user / user
    """
    try:
        for u_data in DEFAULT_USERS:
            existing = db.session.scalars(
                select(User).where(
                    (User.username.ilike(u_data["username"])) | 
                    (User.email.ilike(u_data["email"]))
                )
            ).first()

            if not existing:
                user = User(
                    username=u_data["username"],
                    email=u_data["email"],
                    password_hash=generate_password_hash(u_data["password"]),
                    role=u_data["role"],
                    avatar_url=u_data.get("avatar_url", "default_avatar"),
                    is_active=True,
                )
                db.session.add(user)
                logger.info(f"Seeded default user '{u_data['username']}' with role '{u_data['role']}'.")
            else:
                # Ensure correct password hash & role if already present
                existing.role = u_data["role"]
                existing.password_hash = generate_password_hash(u_data["password"])
                existing.is_active = True
                logger.debug(f"Default user '{u_data['username']}' verified and updated.")

        db.session.commit()
        logger.info("Default users seeding completed successfully.")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to seed default users: {e}")


if __name__ == "__main__":
    from app import create_app
    app = create_app()
    with app.app_context():
        seed_default_users()
