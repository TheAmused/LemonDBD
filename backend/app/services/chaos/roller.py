# backend/app/services/chaos/roller.py
import random
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models import Character, Perk
from app.services.chaos.constants import ADDON_RARITY_POOL
from app.services.ownership_service import OwnershipService


def get_owned_killer_names(user_id: int, ownership_service: OwnershipService) -> list[str]:
    """Every killer the user owns. Unlike Gauntlet Original, no roster cap."""
    owned = ownership_service.get_user_characters(user_id, role="Killer")
    return [c["name"] for c in owned if c["is_owned"] and not c.get("is_disabled")]


def get_owned_killer_ids(user_id: int, ownership_service: OwnershipService) -> list[int]:
    """Same as get_owned_killer_names, but keyed by the killer's stable id."""
    owned = ownership_service.get_user_characters(user_id, role="Killer")
    return [c["id"] for c in owned if c["is_owned"] and not c.get("is_disabled")]


def get_unlocked_killer_perks(user_id: int, ownership_service: OwnershipService) -> list[dict[str, Any]]:
    """Every unlocked perk in the Killer category."""
    perks = ownership_service.get_user_perks(user_id, category="Killer")
    return [p for p in perks if p["is_unlocked"] and not p.get("is_disabled")]


def get_unlocked_killer_perk_ids(user_id: int, ownership_service: OwnershipService) -> list[int]:
    """Same as get_unlocked_killer_perks, but keyed by the perk's stable id."""
    perks = ownership_service.get_user_perks(user_id, category="Killer")
    return [p["perk_id"] for p in perks if p["is_unlocked"] and not p.get("is_disabled")]


def resolve_perks_by_names(names: list[str]) -> list[dict[str, Any]]:
    """Turns a frozen name list back into full perk dicts (icon, description)."""
    if not names:
        return []
    perks = db.session.scalars(select(Perk).where(Perk.name.in_(names), Perk.category == "Killer")).all()
    by_name = {p.name: p.to_dict() for p in perks}
    return [by_name[n] for n in names if n in by_name]


def resolve_perks_by_ids(ids: list[int]) -> list[dict[str, Any]]:
    """Turns a frozen perk id list back into full perk dicts (icon, description)."""
    if not ids:
        return []
    perks = db.session.scalars(select(Perk).where(Perk.id.in_(ids), Perk.category == "Killer")).all()
    by_id = {p.id: p.to_dict() for p in perks}
    return [by_id[i] for i in ids if i in by_id]


def resolve_perk_names_by_ids(ids: list[int]) -> list[str]:
    """Frozen perk id list -> current names."""
    return [p["name"] for p in resolve_perks_by_ids(ids)]


def resolve_killer_names_by_ids(ids: list[int]) -> list[str]:
    """Turns a frozen killer id list back into current names."""
    if not ids:
        return []
    rows = db.session.scalars(select(Character).where(Character.id.in_(ids))).all()
    by_id = {c.id: c.name for c in rows}
    return [by_id[i] for i in ids if i in by_id]


def draw_chaos_perks(
    unlocked_perks: list[dict[str, Any]],
    used_perk_names: list[str],
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Draws 4 perks one at a time without repeating a perk already in
    used_perk_names. If the eligible pool runs out mid-draw, the whole pool
    becomes eligible again.
    """
    if not unlocked_perks:
        return [], list(used_perk_names)

    used = list(used_perk_names)
    drawn: list[dict[str, Any]] = []

    for _ in range(4):
        eligible = [p for p in unlocked_perks if p["name"] not in used]
        if not eligible:
            used = []
            eligible = list(unlocked_perks)
        pick = random.choice(eligible)
        drawn.append(pick)
        used.append(pick["name"])

    return drawn, used


def draw_addon_rarities() -> list[str]:
    """Two independent picks from ADDON_RARITY_POOL; duplicates are allowed."""
    return [random.choice(ADDON_RARITY_POOL), random.choice(ADDON_RARITY_POOL)]
