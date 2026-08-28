# backend/app/services/user/admin.py
import logging
from typing import Any
from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.models import (
    Character,
    Perk,
    User,
    UserCharacterOwnership,
    UserPerkOwnership,
)
from app.services.streak_stats import fetch_challenge_completion_counts
from app.services.user.avatar import (
    get_avatar_storage_directory,
    remove_stale_avatar_file,
)

logger = logging.getLogger(__name__)


def list_all_users_paginated(
    search: str | None = None,
    role: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict[str, Any]:
    """Retrieve paginated user records annotated with owned count metrics."""
    stmt = select(User)

    if role and role.lower() in ["admin", "user"]:
        stmt = stmt.where(User.role == role.lower())

    if search and search.strip():
        pat = f"%{search.strip().lower()}%"
        stmt = stmt.where(or_(User.username.ilike(pat), User.email.ilike(pat)))

    total = db.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(User.id.asc()).offset((page - 1) * per_page).limit(per_page)
    users = db.session.scalars(stmt).all()

    user_list = []
    for u in users:
        d = u.to_dict()
        owned_chars = (
            db.session.scalar(
                select(func.count(UserCharacterOwnership.id)).where(
                    UserCharacterOwnership.user_id == u.id,
                    UserCharacterOwnership.is_owned.is_(True),
                )
            )
            or 0
        )
        unlocked_perks = (
            db.session.scalar(
                select(func.count(UserPerkOwnership.id)).where(
                    UserPerkOwnership.user_id == u.id,
                    UserPerkOwnership.is_unlocked.is_(True),
                )
            )
            or 0
        )
        d["owned_characters_count"] = owned_chars
        d["unlocked_perks_count"] = unlocked_perks
        user_list.append(d)

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "users": user_list,
    }


def admin_modify_user(
    user_id: int,
    role: str | None = None,
    is_active: bool | None = None,
) -> tuple[User | None, str | None]:
    """Administrative update for role assignment and active account status."""
    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    if role and role.lower() in ["admin", "user"]:
        user.role = role.lower()
    if is_active is not None:
        user.is_active = is_active

    db.session.commit()
    return user, None


def admin_remove_user(user_id: int) -> bool:
    """Administrative deletion of user account and stored media."""
    user = db.session.get(User, user_id)
    if not user:
        return False
    avatar_dir = get_avatar_storage_directory()
    remove_stale_avatar_file(user.avatar_url, avatar_dir)
    db.session.delete(user)
    db.session.commit()
    return True


def fetch_admin_metrics() -> dict[str, Any]:
    """Retrieve system totals for users, characters, and perks."""
    total_users = db.session.scalar(select(func.count(User.id))) or 0
    active_users = (
        db.session.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    )
    admin_count = (
        db.session.scalar(select(func.count(User.id)).where(User.role == "admin")) or 0
    )

    total_characters = db.session.scalar(select(func.count(Character.id))) or 0
    survivors_count = (
        db.session.scalar(
            select(func.count(Character.id)).where(Character.role == "Survivor")
        )
        or 0
    )
    killers_count = (
        db.session.scalar(
            select(func.count(Character.id)).where(Character.role == "Killer")
        )
        or 0
    )
    total_perks = db.session.scalar(select(func.count(Perk.id))) or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "admin_count": admin_count,
        "total_characters": total_characters,
        "survivors_count": survivors_count,
        "killers_count": killers_count,
        "total_perks": total_perks,
        "challenge_completions": fetch_challenge_completion_counts(),
    }


def seed_default_admin_if_empty() -> None:
    """Invoke baseline admin seeders."""
    try:
        from app.seeds.user_seeder import seed_default_users

        seed_default_users()
    except Exception as e:
        logger.debug(f"Error executing user seeder: {e}")
