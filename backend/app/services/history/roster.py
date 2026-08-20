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
    owned = [c for c in ownership_service.get_user_characters(user_id, role="Killer") if c["is_owned"]]
    owned.sort(key=_release_key)
    return [c["name"] for c in owned]


def get_general_killer_perk_names() -> List[str]:
    stmt = select(Perk.name).where(
        Perk.category == "Killer",
        (Perk.character_id.is_(None)) | (Perk.is_generic_counterpart.is_(True)),
    )
    return list(db.session.scalars(stmt).all())


def get_killer_teachable_perk_names(killer_name: str) -> List[str]:
    character = db.session.scalars(
        select(Character).where(Character.name == killer_name)
    ).first()
    if not character:
        return []
    stmt = select(Perk.name).where(
        Perk.character_id == character.id, Perk.is_teachable.is_(True)
    )
    return list(db.session.scalars(stmt).all())
