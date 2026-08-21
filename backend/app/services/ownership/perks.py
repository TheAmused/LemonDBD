# backend/app/services/ownership/perks.py
from typing import Any, Callable, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.models import Perk, UserCharacterOwnership, UserPerkOwnership


def fetch_user_perks(user_id: Optional[int] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve all perks annotated with unlock status for the given user."""
    stmt = select(Perk).options(joinedload(Perk.character))
    if category and category.lower() != "all":
        stmt = stmt.where(func.lower(Perk.category) == category.lower())
    stmt = stmt.order_by(Perk.name.asc())
    all_perks = db.session.scalars(stmt).all()

    if not user_id:
        result = []
        for p in all_perks:
            d = p.to_dict()
            d["perk_id"] = p.id
            d["character_id"] = p.character_id
            d["is_unlocked"] = True
            d["is_general"] = bool(p.character_id is None or p.is_generic_counterpart)
            result.append(d)
        return result

    perk_ownerships = db.session.scalars(
        select(UserPerkOwnership).where(UserPerkOwnership.user_id == user_id)
    ).all()
    perk_explicit_dict = {row.perk_id: row.is_unlocked for row in perk_ownerships}

    char_ownerships = db.session.scalars(
        select(UserCharacterOwnership).where(UserCharacterOwnership.user_id == user_id)
    ).all()
    deactivated_char_ids = {row.character_id for row in char_ownerships if not row.is_owned}

    result = []
    for p in all_perks:
        d = p.to_dict()
        d["perk_id"] = p.id
        d["character_id"] = p.character_id
        is_general = p.character_id is None or p.is_generic_counterpart
        if is_general:
            is_unlocked = True
        elif p.id in perk_explicit_dict:
            is_unlocked = perk_explicit_dict[p.id]
        else:
            is_unlocked = (p.character_id not in deactivated_char_ids) if p.character_id else True

        d["is_unlocked"] = bool(is_unlocked)
        d["is_general"] = bool(is_general)
        result.append(d)
    return result


def mutate_perk_ownership(user_id: int, perk_id: int, is_unlocked: bool) -> Dict[str, Any]:
    """Toggle or set the unlock status of a specific perk for a user."""
    perk = db.session.get(Perk, perk_id)
    if not perk:
        raise ValueError(f"Perk with ID {perk_id} not found.")

    record = db.session.scalars(
        select(UserPerkOwnership).where(
            UserPerkOwnership.user_id == user_id,
            UserPerkOwnership.perk_id == perk_id,
        )
    ).first()

    if not record:
        record = UserPerkOwnership(
            user_id=user_id,
            perk_id=perk_id,
            is_unlocked=is_unlocked,
        )
        db.session.add(record)
    else:
        record.is_unlocked = is_unlocked

    db.session.commit()
    return record.to_dict()


def bulk_mutate_perk_ownership(
    user_id: int,
    updates: List[Dict[str, Any]],
    summary_fn: Callable[[Optional[int]], Dict[str, Any]],
) -> Dict[str, Any]:
    """Bulk update multiple perk unlock entries in a single database transaction."""
    updated_count = 0
    for item in updates:
        pid = item.get("perk_id")
        if not pid:
            continue
        is_unlocked = bool(item.get("is_unlocked", True))
        record = db.session.scalars(
            select(UserPerkOwnership).where(
                UserPerkOwnership.user_id == user_id,
                UserPerkOwnership.perk_id == int(pid),
            )
        ).first()

        if not record:
            record = UserPerkOwnership(
                user_id=user_id,
                perk_id=int(pid),
                is_unlocked=is_unlocked,
            )
            db.session.add(record)
        else:
            record.is_unlocked = is_unlocked
        updated_count += 1

    db.session.commit()
    return {
        "user_id": user_id,
        "updated_count": updated_count,
        "summary": summary_fn(user_id),
    }

