# backend/app/services/gauntlet/roller.py
import random
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models import Killer, Perk, Survivor
from app.schemas.gauntlet import GauntletLoadout, GauntletPlayerLoadout, TierInfo
from app.services.gauntlet.constants import (
    ORIGINAL_KILLER_ROSTER_LIMIT,
    ORIGINAL_SURVIVOR_ROSTER_LIMIT,
    DEFAULT_GAME_MODE,
    get_players_per_character,
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


def resolve_character_names_by_ids(ids: list[int], role: str | None = None) -> list[str]:
    """Frozen id list -> current names.

    Gauntlet runs cover both roles, and an id alone no longer names one
    character: survivor 7 and killer 7 both exist. `role` says which table to
    read; without it both are searched and the survivor wins a tie, which is
    what a run recorded before the split would have meant, since survivors held
    the low ids in the single table.
    """
    if not ids:
        return []
    key = (role or "").strip().rstrip("s").lower()
    models = {"survivor": (Survivor,), "killer": (Killer,)}.get(key, (Survivor, Killer))

    by_id: dict[int, str] = {}
    for model in reversed(models):
        for row in db.session.scalars(select(model).where(model.id.in_(ids))).all():
            by_id[row.id] = row.name
    return [by_id[i] for i in ids if i in by_id]


def get_character_teachable_perks(character_name: str) -> list[dict[str, Any]]:
    """The perks one character teaches, found by name.

    Names are unique across both tables -- no survivor shares one with a killer
    -- so the name alone still identifies a character. Which side it is on
    decides which key the perk carries.
    """
    for model, owner_column in ((Survivor, Perk.survivor_id), (Killer, Perk.killer_id)):
        character = db.session.scalars(
            select(model).where(model.name == character_name)
        ).first()
        if not character:
            continue
        perks = db.session.scalars(
            select(Perk)
            .where(
                owner_column == character.id,
                Perk.is_teachable.is_(True),
                Perk.is_disabled.is_(False),
            )
            .order_by(Perk.name.asc())
        ).all()
        return [p.to_dict() for p in perks]
    return []


def pick_initial_target(user_id: int, role: str, ownership_service: OwnershipService) -> str:
    names = get_owned_character_names(user_id, role, ownership_service)
    if names:
        return random.choice(names)
    return "Meg Thomas" if role == "survivor" else "The Trapper"


def pick_initial_targets(user_id: int, role: str, ownership_service: OwnershipService, count: int) -> list[str]:
    """`count` different owned characters; fewer only when the roster has fewer."""
    names = get_owned_character_names(user_id, role, ownership_service)
    if len(names) >= count:
        return random.sample(names, count)
    return names or ["Meg Thomas" if role == "survivor" else "The Trapper"]


def build_loadout(target_char: str, tier_info: TierInfo) -> GauntletLoadout:
    character_perks = get_character_teachable_perks(target_char)
    loadout: GauntletLoadout = {
        "character": target_char,
        "character_perks": character_perks,
        "tier_info": tier_info,
    }
    if tier_info["random_perk_count"]:
        loadout["random_perks"] = random.sample(
            character_perks, min(tier_info["random_perk_count"], len(character_perks))
        )
    return loadout


def roll_gauntlet_target(
    role: str,
    current_streak: int,
    completed_characters: list[str],
    owned_characters: list[str],
    target_character: str | None = None,
    game_mode: str = DEFAULT_GAME_MODE,
) -> tuple[str, GauntletLoadout, TierInfo]:
    tier_info = get_tier_info(current_streak, role, game_mode)

    remaining = [c for c in owned_characters if c not in completed_characters]
    if not remaining:
        remaining = owned_characters if owned_characters else [
            "Meg Thomas" if role == "survivor" else "The Trapper"
        ]

    target_char = target_character if target_character else random.choice(remaining)

    return target_char, build_loadout(target_char, tier_info), tier_info


def build_team_loadout(names: list[str], tier_info: TierInfo, players_per_character: int = 1) -> GauntletLoadout:
    built = [build_loadout(name, tier_info) for name in names]
    players: list[GauntletPlayerLoadout] = [
        {key: value for key, value in loadout.items() if key != "tier_info"} for loadout in built
    ]
    team: GauntletLoadout = {**built[0], "players": players}
    if players_per_character > 1:
        team["players_per_character"] = players_per_character
    return team


def roll_gauntlet_team(
    role: str,
    current_streak: int,
    completed_characters: list[str],
    owned_characters: list[str],
    game_mode: str,
    count: int,
) -> tuple[list[str], GauntletLoadout, TierInfo]:
    """`count` characters for one match, drawn only from unbeaten ones while any remain.

    An odd-sized roster means the last one left can't be paired with another
    unbeaten character, so it fills the rest of the slots itself rather than
    reaching into the beaten pool early.
    """
    tier_info = get_tier_info(current_streak, role, game_mode)

    remaining = [c for c in owned_characters if c not in completed_characters]
    pool = remaining or owned_characters or ["Meg Thomas" if role == "survivor" else "The Trapper"]

    names = random.sample(pool, min(count, len(pool)))
    if len(names) < count:
        names += random.choices(pool, k=count - len(names))

    return names, build_team_loadout(names, tier_info, get_players_per_character(game_mode)), tier_info
