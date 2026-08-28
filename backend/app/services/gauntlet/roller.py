# backend/app/services/gauntlet/roller.py
import random
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models import Character, Perk
from app.services.gauntlet.constants import (
    ORIGINAL_KILLER_ROSTER_LIMIT,
    ORIGINAL_SURVIVOR_ROSTER_LIMIT,
    get_tier_info,
)
from app.services.ownership_service import OwnershipService


def get_owned_character_names(user_id: int, role: str, ownership_service: OwnershipService) -> list[str]:
    db_role = "Killer" if role == "killer" else "Survivor"
    owned = ownership_service.get_user_characters(user_id, role=db_role)
    limit = ORIGINAL_KILLER_ROSTER_LIMIT if role == "killer" else ORIGINAL_SURVIVOR_ROSTER_LIMIT
    owned = [
        c for c in owned
        if c.get("release_number") is None or c["release_number"] <= limit
    ]
    return [c["name"] for c in owned if c["is_owned"] and not c.get("is_disabled")]


def get_owned_character_ids(user_id: int, role: str, ownership_service: OwnershipService) -> list[int]:
    db_role = "Killer" if role == "killer" else "Survivor"
    owned = ownership_service.get_user_characters(user_id, role=db_role)
    limit = ORIGINAL_KILLER_ROSTER_LIMIT if role == "killer" else ORIGINAL_SURVIVOR_ROSTER_LIMIT
    owned = [
        c for c in owned
        if c.get("release_number") is None or c["release_number"] <= limit
    ]
    return [c["id"] for c in owned if c["is_owned"] and not c.get("is_disabled")]


def resolve_character_names_by_ids(ids: list[int]) -> list[str]:
    if not ids:
        return []
    rows = db.session.scalars(select(Character).where(Character.id.in_(ids))).all()
    by_id = {c.id: c.name for c in rows}
    return [by_id[i] for i in ids if i in by_id]


def get_character_teachable_perks(character_name: str) -> list[dict[str, Any]]:
    perks = db.session.scalars(
        select(Perk)
        .join(Character, Perk.character_id == Character.id)
        .where(Character.name == character_name, Perk.is_teachable.is_(True), Perk.is_disabled.is_(False))
        .order_by(Perk.name.asc())
    ).all()
    return [p.to_dict() for p in perks]


def pick_initial_target(user_id: int, role: str, ownership_service: OwnershipService) -> str:
    names = get_owned_character_names(user_id, role, ownership_service)
    if names:
        return random.choice(names)
    return "Meg Thomas" if role == "survivor" else "The Trapper"


def roll_gauntlet_target(
    role: str,
    current_streak: int,
    completed_characters: list[str],
    owned_characters: list[str],
    target_character: str | None = None,
) -> tuple[str, dict[str, Any], dict[str, Any]]:
    tier_info = get_tier_info(current_streak, role)

    remaining = [c for c in owned_characters if c not in completed_characters]
    if not remaining:
        remaining = owned_characters if owned_characters else [
            "Meg Thomas" if role == "survivor" else "The Trapper"
        ]

    target_char = target_character if target_character else random.choice(remaining)

    loadout = {
        "character": target_char,
        "character_perks": get_character_teachable_perks(target_char),
        "tier_info": tier_info,
    }

    return target_char, loadout, tier_info
