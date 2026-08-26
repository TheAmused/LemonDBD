# backend/app/services/ownership/characters.py
from typing import Any, Callable, Dict, List, Optional
from sqlalchemy import func, select

from app.core.extensions import db
from app.models import Character, UserCharacterOwnership

# Killers included with the base game / free to play, per Dead by Daylight's
# actual roster. Everyone else ships as a paid DLC killer, so new accounts
# start with them locked instead of the previous "everything unlocked" default.
FREE_KILLER_NAMES = {
    "The Trapper",
    "The Wraith",
    "The Hillbilly",
    "The Nurse",
    "The Huntress",
}


def fetch_user_characters(user_id: Optional[int] = None, role: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve all characters annotated with the user's ownership flag."""
    stmt = select(Character)
    if role and role.lower() != "all":
        stmt = stmt.where(func.lower(Character.role) == role.lower())
    stmt = stmt.order_by(Character.name.asc())
    all_chars = db.session.scalars(stmt).all()

    if not user_id:
        result = []
        for c in all_chars:
            d = c.to_dict()
            d["is_owned"] = True
            result.append(d)
        return result

    owned_rows = db.session.scalars(
        select(UserCharacterOwnership).where(UserCharacterOwnership.user_id == user_id)
    ).all()
    owned_dict = {row.character_id: row.is_owned for row in owned_rows}

    result = []
    for c in all_chars:
        d = c.to_dict()
        d["is_owned"] = owned_dict.get(c.id, True)
        result.append(d)
    return result


def mutate_character_ownership(user_id: int, character_id: int, is_owned: bool) -> Dict[str, Any]:
    """Toggle or assign ownership of a specific character for a user."""
    char = db.session.get(Character, character_id)
    if not char:
        raise ValueError(f"Character with ID {character_id} not found.")

    record = db.session.scalars(
        select(UserCharacterOwnership).where(
            UserCharacterOwnership.user_id == user_id,
            UserCharacterOwnership.character_id == character_id,
        )
    ).first()

    if not record:
        record = UserCharacterOwnership(
            user_id=user_id,
            character_id=character_id,
            is_owned=is_owned,
        )
        db.session.add(record)
    else:
        record.is_owned = is_owned

    # Cascade to character's teachable perks
    from app.models import Perk, UserPerkOwnership
    teachable_perks = db.session.scalars(
        select(Perk).where(Perk.character_id == character_id)
    ).all()

    cascade_count = len(teachable_perks)
    for perk in teachable_perks:
        p_rec = db.session.scalars(
            select(UserPerkOwnership).where(
                UserPerkOwnership.user_id == user_id,
                UserPerkOwnership.perk_id == perk.id,
            )
        ).first()
        if not p_rec:
            p_rec = UserPerkOwnership(
                user_id=user_id,
                perk_id=perk.id,
                is_unlocked=is_owned,
            )
            db.session.add(p_rec)
        else:
            p_rec.is_unlocked = is_owned

    db.session.commit()
    res = record.to_dict()
    if is_owned:
        res["auto_unlocked_teachable_perks_count"] = cascade_count
    else:
        res["auto_locked_teachable_perks_count"] = cascade_count
    return res


def bulk_mutate_character_ownership(
    user_id: int,
    updates: List[Dict[str, Any]],
    summary_fn: Callable[[Optional[int]], Dict[str, Any]],
) -> Dict[str, Any]:
    """Bulk update multiple character ownership entries in a single database transaction."""
    from app.models import Perk, UserPerkOwnership
    updated_count = 0
    auto_unlocked_perks_count = 0
    auto_locked_perks_count = 0
    for item in updates:
        cid = item.get("character_id")
        if not cid:
            continue
        is_owned = bool(item.get("is_owned", True))
        record = db.session.scalars(
            select(UserCharacterOwnership).where(
                UserCharacterOwnership.user_id == user_id,
                UserCharacterOwnership.character_id == int(cid),
            )
        ).first()

        if not record:
            record = UserCharacterOwnership(
                user_id=user_id,
                character_id=int(cid),
                is_owned=is_owned,
            )
            db.session.add(record)
        else:
            record.is_owned = is_owned
        updated_count += 1

        teachable_perks = db.session.scalars(
            select(Perk).where(Perk.character_id == int(cid))
        ).all()
        for perk in teachable_perks:
            p_rec = db.session.scalars(
                select(UserPerkOwnership).where(
                    UserPerkOwnership.user_id == user_id,
                    UserPerkOwnership.perk_id == perk.id,
                )
            ).first()
            if not p_rec:
                p_rec = UserPerkOwnership(
                    user_id=user_id,
                    perk_id=perk.id,
                    is_unlocked=is_owned,
                )
                db.session.add(p_rec)
            else:
                p_rec.is_unlocked = is_owned

            if is_owned:
                auto_unlocked_perks_count += 1
            else:
                auto_locked_perks_count += 1

    db.session.commit()
    return {
        "user_id": user_id,
        "updated_count": updated_count,
        "characters_updated_count": updated_count,
        "auto_unlocked_perks_count": auto_unlocked_perks_count,
        "auto_locked_perks_count": auto_locked_perks_count,
        "summary": summary_fn(user_id),
    }


def seed_default_character_ownership(user_id: int) -> int:
    """Lock every paid-DLC killer for a freshly registered account.

    Characters default to owned when no ownership row exists, so a brand new
    user otherwise starts with the entire roster unlocked. This runs once at
    registration to explicitly lock non-free killers (and cascades to their
    teachable perks via mutate_character_ownership), leaving survivors and
    the free killers untouched.
    """
    paid_killer_ids = db.session.scalars(
        select(Character.id).where(
            func.lower(Character.role) == "killer",
            Character.name.notin_(FREE_KILLER_NAMES),
        )
    ).all()

    for character_id in paid_killer_ids:
        mutate_character_ownership(user_id, character_id, False)

    return len(paid_killer_ids)

