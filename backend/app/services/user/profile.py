from typing import Any
from sqlalchemy import select

from app.core.extensions import db
from app.core.security import hash_password
from app.models import Killer, Survivor, User, UserShowcase
from app.models.base import utcnow


def _resolve_main_id(model: type, character_name: str) -> int | None:
    """A showcase main named by string, resolved to that table's key.

    Clients that predate the split still send `character_name`. Names are
    unique across survivors and killers, so the lookup is unambiguous -- but it
    is scoped to the right table anyway, so a survivor's name cannot set the
    killer main.
    """
    name = (character_name or "").strip()
    if not name:
        return None
    row = db.session.scalars(select(model).where(model.name == name)).first()
    return row.id if row else None


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


def mark_onboarding_complete(user_id: int) -> tuple[User | None, str | None]:
    """Stamp the character-ownership onboarding wizard as done for a user."""
    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    user.onboarding_completed_at = utcnow()
    db.session.commit()
    return user, None


def set_preferred_language(user_id: int, language: str) -> tuple[User | None, str | None]:
    """Set a user's preferred site language, chosen from the onboarding
    wizard's language step (or any future settings UI)."""
    from app.services.translations.translation_service import SUPPORTED_LOCALES

    if language not in SUPPORTED_LOCALES:
        return None, f"Unsupported language '{language}'."

    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    user.preferred_language = language
    db.session.commit()
    return user, None


def get_user_showcase(user_id: int) -> dict[str, Any] | None:
    """Retrieve player showcase record or return defaults without mutating database on GET."""
    user = db.session.get(User, user_id)
    if not user:
        return None

    showcase = db.session.scalars(
        select(UserShowcase).where(UserShowcase.user_id == user_id)
    ).first()

    if showcase:
        return showcase.to_dict()

    # Pure read fallback: default representation without DB write
    return {
        "player_title": "The Camper",
        "devotion_level": 0,
        "grade_rank": "Ash IV",
        "survivor_main": {
            "character_name": "Feng Min",
            "prestige": 1,
            "perk_ids": [None, None, None, None],
        },
        "killer_main": {
            "character_name": "The Blight",
            "prestige": 1,
            "perk_ids": [None, None, None, None],
        },
        "updated_at": None,
    }


def get_or_create_user_showcase(user_id: int) -> UserShowcase | None:
    """Retrieve or initialize player showcase record in database."""
    user = db.session.get(User, user_id)
    if not user:
        return None

    showcase = db.session.scalars(
        select(UserShowcase).where(UserShowcase.user_id == user_id)
    ).first()

    if not showcase:
        showcase = UserShowcase(
            user_id=user_id,
            player_title="The Camper",
            devotion_level=0,
            grade_rank="Ash IV",
            # No main until the user picks one. The display name the old
            # column defaulted to is served by `to_dict` from
            # DEFAULT_SURVIVOR_MAIN instead of being written into every row.
            survivor_main_id=None,
            survivor_main_prestige=1,
            survivor_perk_ids=[None, None, None, None],
            killer_main_id=None,
            killer_main_prestige=1,
            killer_perk_ids=[None, None, None, None],
        )
        db.session.add(showcase)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            showcase = db.session.scalars(
                select(UserShowcase).where(UserShowcase.user_id == user_id)
            ).first()

    return showcase


def update_user_showcase(
    user_id: int, data: dict[str, Any]
) -> tuple[dict[str, Any] | None, str | None]:
    """Update custom player showcase attributes in database."""
    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    showcase = db.session.scalars(
        select(UserShowcase).where(UserShowcase.user_id == user_id)
    ).first()

    if not showcase:
        showcase = UserShowcase(user_id=user_id)
        db.session.add(showcase)

    if "player_title" in data and isinstance(data["player_title"], str):
        showcase.player_title = data["player_title"].strip()[:100]

    if "devotion_level" in data and isinstance(data["devotion_level"], (int, float)):
        showcase.devotion_level = max(1, min(99, int(data["devotion_level"])))

    if "grade_rank" in data and isinstance(data["grade_rank"], str):
        showcase.grade_rank = data["grade_rank"].strip()[:50]

    if "survivor_main" in data and isinstance(data["survivor_main"], dict):
        sm = data["survivor_main"]
        # A key, not a copied name: renaming a character used to strand every
        # showcase that had picked them.
        if "character_id" in sm and str(sm["character_id"]).isdigit():
            showcase.survivor_main_id = int(sm["character_id"])
        elif "character_name" in sm and isinstance(sm["character_name"], str):
            showcase.survivor_main_id = _resolve_main_id(Survivor, sm["character_name"])
        if "prestige" in sm and isinstance(sm["prestige"], (int, float)):
            showcase.survivor_main_prestige = max(1, min(100, int(sm["prestige"])))
        if "perk_ids" in sm and isinstance(sm["perk_ids"], list):
            s_perks = [
                int(p) if p is not None and str(p).isdigit() else None
                for p in sm["perk_ids"][:4]
            ]
            while len(s_perks) < 4:
                s_perks.append(None)
            showcase.survivor_perk_ids = s_perks

    if "killer_main" in data and isinstance(data["killer_main"], dict):
        km = data["killer_main"]
        if "character_id" in km and str(km["character_id"]).isdigit():
            showcase.killer_main_id = int(km["character_id"])
        elif "character_name" in km and isinstance(km["character_name"], str):
            showcase.killer_main_id = _resolve_main_id(Killer, km["character_name"])
        if "prestige" in km and isinstance(km["prestige"], (int, float)):
            showcase.killer_main_prestige = max(1, min(100, int(km["prestige"])))
        if "perk_ids" in km and isinstance(km["perk_ids"], list):
            k_perks = [
                int(p) if p is not None and str(p).isdigit() else None
                for p in km["perk_ids"][:4]
            ]
            while len(k_perks) < 4:
                k_perks.append(None)
            showcase.killer_perk_ids = k_perks

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return None, f"Database error: {str(exc)}"

    return showcase.to_dict(), None

