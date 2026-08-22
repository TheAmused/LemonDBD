# backend/app/services/history/roster.py
from typing import Any, Dict, List

from sqlalchemy import select

from app.core.extensions import db
from app.models import Character, Perk
from app.services.ownership_service import OwnershipService

ROW_SIZE = 5


def build_rows(owned_killer_names: List[str]) -> List[List[str]]:
    return [
        owned_killer_names[i:i + ROW_SIZE]
        for i in range(0, len(owned_killer_names), ROW_SIZE)
    ]


def _release_key(character: Dict[str, Any]):
    release_number = character.get("release_number")
    return release_number if release_number is not None else float("inf")


def get_owned_killer_names_by_release(user_id: int, ownership_service: OwnershipService) -> List[str]:
    owned = [
        c for c in ownership_service.get_user_characters(user_id, role="Killer")
        if c["is_owned"] and not c.get("is_disabled")
    ]
    owned.sort(key=_release_key)
    return [c["name"] for c in owned]


def get_owned_killer_ids_by_release(user_id: int, ownership_service: OwnershipService) -> List[int]:
    """Same release-order filtering as get_owned_killer_names_by_release,
    but keyed by the killer's stable id -- a later rename won't drop it
    from an already-frozen run's pool, and resolving the ids back to
    names preserves this same release order (see resolve_killer_names_by_ids)."""
    owned = [
        c for c in ownership_service.get_user_characters(user_id, role="Killer")
        if c["is_owned"] and not c.get("is_disabled")
    ]
    owned.sort(key=_release_key)
    return [c["id"] for c in owned]


def resolve_killer_names_by_ids(ids: List[int]) -> List[str]:
    """Turns a frozen killer id list back into current names, in the same
    order as ids (release order, if ids came from get_owned_killer_ids_by_release).
    Unknown ids (a killer deleted outright) are dropped."""
    if not ids:
        return []
    rows = db.session.scalars(select(Character).where(Character.id.in_(ids))).all()
    by_id = {c.id: c.name for c in rows}
    return [by_id[i] for i in ids if i in by_id]


def get_general_killer_perk_names() -> List[str]:
    stmt = select(Perk.name).where(
        Perk.category == "Killer",
        (Perk.character_id.is_(None)) | (Perk.is_generic_counterpart.is_(True)),
        Perk.is_disabled.is_(False),
    )
    return list(db.session.scalars(stmt).all())


def get_killer_teachable_perk_names(killer_name: str) -> List[str]:
    character = db.session.scalars(
        select(Character).where(Character.name == killer_name)
    ).first()
    if not character:
        return []
    stmt = select(Perk.name).where(
        Perk.character_id == character.id, Perk.is_teachable.is_(True), Perk.is_disabled.is_(False)
    )
    return list(db.session.scalars(stmt).all())
