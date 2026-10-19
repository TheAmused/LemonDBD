# backend/app/services/ownership/perks.py
from collections.abc import Callable
from typing import Any
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.core.transaction import transaction
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

    with transaction():
        if not record:
            record = UserPerkOwnership(
                user_id=user_id,
                perk_id=perk_id,
                is_unlocked=is_unlocked,
            )
            db.session.add(record)
        else:
            record.is_unlocked = is_unlocked

    return record.to_dict()


def bulk_mutate_perk_ownership(
    user_id: int,
    updates: list[dict[str, Any]],
    summary_fn: Callable[[int | None], dict[str, Any]],
) -> dict[str, Any]:
    """Bulk update perk unlock entries in one transaction, with a fixed number of queries.

    Raises ValueError for a malformed request (not a list of objects, too long). Ids that name no
    perk are skipped (they used to be inserted and hit the foreign key as a 500); the old loop also
    ran two queries per row, ~650 for the full list the ownership screen sends.
    """
    from app.services.ownership.characters import MAX_BULK_UPDATES, positive_id

    if not isinstance(updates, list) or len(updates) > MAX_BULK_UPDATES:
        raise ValueError(f"updates must be a list of at most {MAX_BULK_UPDATES} objects.")
    if not all(isinstance(item, dict) for item in updates):
        raise ValueError("Each update must be an object {perk_id, is_unlocked}.")

    wanted: dict[int, bool] = {}
    for item in updates:
        pid = positive_id(item.get("perk_id"))
        if pid is not None:
            wanted[pid] = bool(item.get("is_unlocked", True))  # the last one wins

    perks = {
        perk.id: perk
        for perk in db.session.scalars(select(Perk).where(Perk.id.in_(list(wanted)))).all()
    } if wanted else {}
    unknown = [pid for pid in wanted if pid not in perks]

    with transaction():
        rows = {
            row.perk_id: row
            for row in db.session.scalars(
                select(UserPerkOwnership).where(
                    UserPerkOwnership.user_id == user_id,
                    UserPerkOwnership.perk_id.in_(list(perks)),
                )
            ).all()
        } if perks else {}
        for pid, perk in perks.items():
            is_unlocked = wanted[pid]
            # A general perk or a generic counterpart is always available.
            if not is_unlocked and (perk.is_generic_counterpart or (perk.survivor_id is None and perk.killer_id is None)):
                is_unlocked = True
            row = rows.get(pid)
            if row is not None:
                row.is_unlocked = is_unlocked
            else:
                db.session.add(UserPerkOwnership(user_id=user_id, perk_id=pid, is_unlocked=is_unlocked))

    result: dict[str, Any] = {
        "user_id": user_id,
        "updated_count": len(perks),
        "summary": summary_fn(user_id),
    }
    if unknown:
        result["skipped_unknown"] = unknown
    return result
