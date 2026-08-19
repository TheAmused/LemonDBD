# backend/app/services/ownership/characters.py
from typing import Any, Callable, Dict, List, Optional
from sqlalchemy import func, select

from app.core.extensions import db
from app.models import Character, UserCharacterOwnership


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

    db.session.commit()
    return record.to_dict()


def bulk_mutate_character_ownership(
    user_id: int,
    updates: List[Dict[str, Any]],
    summary_fn: Callable[[Optional[int]], Dict[str, Any]],
) -> Dict[str, Any]:
    """Bulk update multiple character ownership entries in a single database transaction."""
    updated_count = 0
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

    db.session.commit()
    return {
        "user_id": user_id,
        "updated_count": updated_count,
        "summary": summary_fn(user_id),
    }

