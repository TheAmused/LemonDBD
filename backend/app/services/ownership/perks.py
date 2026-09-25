# backend/app/services/ownership/perks.py
from collections.abc import Callable
from typing import Any
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.models import Perk, UserCharacterOwnership, UserPerkOwnership


def fetch_user_perks(
    user_id: int | None = None, category: str | None = None, lang: str | None = None
) -> list[dict[str, Any]]:
    """Retrieve all perks annotated with unlock status for the given user."""
    stmt = select(Perk).options(joinedload(Perk.survivor), joinedload(Perk.killer))
    if category and category.lower() != "all":
        # `category` was renamed `role`; the query-string name is unchanged.
        stmt = stmt.where(func.lower(Perk.role) == category.lower())
    stmt = stmt.order_by(Perk.name.asc())
    all_perks = db.session.scalars(stmt).all()

    if not user_id:
        result = []
        for p in all_perks:
            d = p.to_dict(lang=lang)
            d["perk_id"] = p.id
            d["character_id"] = p.character_id
            d["is_unlocked"] = True
            d["is_general"] = bool(
                p.survivor_id is None and p.killer_id is None or p.is_generic_counterpart
            )
            d["is_generic_counterpart"] = bool(p.is_generic_counterpart)
            d["is_always_unlocked"] = bool(d["is_general"])
            result.append(d)
        return result

    perk_ownerships = db.session.scalars(
        select(UserPerkOwnership).where(UserPerkOwnership.user_id == user_id)
    ).all()
    perk_explicit_dict = {row.perk_id: row.is_unlocked for row in perk_ownerships}

    char_ownerships = db.session.scalars(
        select(UserCharacterOwnership).where(UserCharacterOwnership.user_id == user_id)
    ).all()
    # Keyed by (role, id): a bare character id names two characters now.
    deactivated_chars = {
        (("survivor", row.survivor_id) if row.survivor_id else ("killer", row.killer_id))
        for row in char_ownerships
        if not row.is_owned
    }

    result = []
    for p in all_perks:
        d = p.to_dict(lang=lang)
        d["perk_id"] = p.id
        d["character_id"] = p.character_id
        owner_key = (
            ("survivor", p.survivor_id) if p.survivor_id
            else ("killer", p.killer_id) if p.killer_id
            else None
        )
        is_general = owner_key is None or p.is_generic_counterpart
        if is_general:
            is_unlocked = True
        elif p.id in perk_explicit_dict:
            is_unlocked = perk_explicit_dict[p.id]
        else:
            is_unlocked = owner_key not in deactivated_chars

        d["is_unlocked"] = bool(is_unlocked)
        d["is_general"] = bool(is_general)
        d["is_generic_counterpart"] = bool(p.is_generic_counterpart)
        d["is_always_unlocked"] = bool(is_general)
        result.append(d)
    return result


def mutate_perk_ownership(user_id: int, perk_id: int, is_unlocked: bool) -> dict[str, Any]:
    """Toggle or set the unlock status of a specific perk for a user."""
    perk = db.session.get(Perk, perk_id)
    if not perk:
        raise ValueError(f"Perk with ID {perk_id} not found.")

    if not is_unlocked and (perk.is_generic_counterpart or (perk.survivor_id is None and perk.killer_id is None)):
        is_unlocked = True

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
    updates: list[dict[str, Any]],
    summary_fn: Callable[[int | None], dict[str, Any]],
) -> dict[str, Any]:
    """Bulk update multiple perk unlock entries in a single database transaction."""
    updated_count = 0
    for item in updates:
        pid = item.get("perk_id")
        if not pid:
            continue
        is_unlocked = bool(item.get("is_unlocked", True))
        perk = db.session.get(Perk, int(pid))
        if not is_unlocked and perk and (perk.is_generic_counterpart or (perk.survivor_id is None and perk.killer_id is None)):
            is_unlocked = True

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
