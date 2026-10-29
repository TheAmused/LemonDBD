# backend/app/services/id_please/views.py
"""What the player sees of a loadout: names, icons and the "ID" (position in their current list)."""
from bisect import bisect_left
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models import Killer, Perk, Survivor
from app.models.slug import url_slug
from app.services.id_please.engine import Loadout
from app.services.id_please.roster import Roster

_CHARACTER_MODEL = {"killer": Killer, "survivor": Survivor}


def character_views(side: str, ids: list[int] | tuple[int, ...]) -> dict[int, dict[str, Any]]:
    if not ids:
        return {}
    model = _CHARACTER_MODEL[side]
    rows = db.session.execute(
        select(model.id, model.name, model.portrait_url, model.avatar_local_path).where(model.id.in_(ids))
    ).all()
    return {
        cid: {"id": cid, "name": name, "slug": url_slug(name), "avatar_url": portrait or "", "avatar_local_path": local or ""}
        for cid, name, portrait, local in rows
    }


def perk_views(ids: list[int] | tuple[int, ...]) -> dict[int, dict[str, Any]]:
    if not ids:
        return {}
    rows = db.session.execute(select(Perk.id, Perk.name, Perk.icon_url, Perk.icon_local_path).where(Perk.id.in_(ids))).all()
    return {pid: {"id": pid, "name": name, "icon_url": url or "", "icon_local_path": local or ""} for pid, name, url, local in rows}


def _position(owned: tuple[int, ...], item_id: int) -> int | None:
    """Where `item_id` stands in the live list, or None when it is no longer there."""
    index = bisect_left(owned, item_id)
    return index if index < len(owned) and owned[index] == item_id else None


def match_view(loadout: Loadout, roster: Roster) -> dict[str, Any] | None:
    """The match in play for the board: who to play, with which perks, and the IDs that led there."""
    if not loadout:
        return None
    side = loadout["side"]
    character = character_views(side, [loadout["character_id"]]).get(loadout["character_id"], {"id": loadout["character_id"], "name": ""})
    perks = perk_views(loadout["perk_ids"])
    return {
        "number": loadout["number"],
        "side": side,
        "character": {**character, "position": _position(roster.characters(side), loadout["character_id"])},
        "perks": [
            {**perks.get(pid, {"id": pid, "name": ""}), "position": _position(roster.perks(side), pid)}
            for pid in loadout["perk_ids"]
        ],
    }


def roster_listing(side: str, roster: Roster) -> dict[str, Any]:
    """Every owned character and unlocked perk of a side with its ID, for the picker and the calculator."""
    characters = character_views(side, roster.characters(side))
    perks = perk_views(roster.perks(side))
    return {
        "side": side,
        "characters": [{**characters[cid], "position": i} for i, cid in enumerate(roster.characters(side)) if cid in characters],
        "perks": [{**perks[pid], "position": i} for i, pid in enumerate(roster.perks(side)) if pid in perks],
    }
