# backend/app/services/ownership/characters.py
from collections.abc import Callable
from typing import Any
from sqlalchemy import func, or_, select

from app.core.db_retry import retry_on_transient_db_error
from app.core.extensions import db
from app.models import Character, UserCharacterOwnership

FREE_CHARACTER_SLUGS: set[str] = {
    "The_Trapper", "The_Wraith", "The_Hillbilly", "The_Nurse", "The_Huntress",
    "Dwight_Fairfield", "Meg_Thomas", "Claudette_Morel", "Jake_Park",
    "Nea_Karlsson", "Bill_Overbeck", "David_King",
}


def fetch_user_characters(user_id: int | None = None, role: str | None = None) -> list[dict[str, Any]]:
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


def mutate_character_ownership(user_id: int, character_id: int, is_owned: bool) -> dict[str, Any]:
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
    updates: list[dict[str, Any]],
    summary_fn: Callable[[int | None], dict[str, Any]],
) -> dict[str, Any]:
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


@retry_on_transient_db_error()
def seed_default_character_ownership(user_id: int) -> int:
    """Lock every character except FREE_CHARACTER_SLUGS for a new account.

    Retried on a transient connection drop/pool-timeout: safe because this
    is a get-or-create per character followed by one commit, so re-running
    it after a dropped connection either creates the rows cleanly or finds
    them already there and just re-applies the same is_owned value -- never
    a duplicate.
    """
    locked_ids = db.session.scalars(
        select(Character.id).where(
            or_(
                Character.wiki_slug.is_(None),
                Character.wiki_slug.notin_(FREE_CHARACTER_SLUGS),
            )
        )
    ).all()
    if not locked_ids:
        return 0

    updates = [{"character_id": cid, "is_owned": False} for cid in locked_ids]
    bulk_mutate_character_ownership(user_id, updates, lambda _uid: {})
    return len(locked_ids)
