# backend/app/services/id_please/engine.py
"""Turns stored loadouts (database ids) into chain matches (positions) and back, against the live roster.
In Hardcore+ the perk positions are counted in a shuffled order (`Roster.perk_seed`), the characters' never are.

A loadout is `{"number", "side", "character_id", "perk_ids"}`: ids, never positions, so it stays what the
player was shown whatever happens to their roster afterwards.
"""
from typing import Any

from app.services.id_please.chain import (
    LOADOUT_PERKS,
    Match,
    first_match,
    next_match,
    next_match_plus,
    next_match_plus_solo,
    next_match_solo,
)
from app.services.id_please.constants import is_solo
from app.services.id_please.roster import Roster, to_ids, to_positions

type Loadout = dict[str, Any]
type Used = dict[str, list[int]]


def empty_used() -> Used:
    return {"killer": [], "survivor": []}


def validate_opening(perk_positions: object, perk_count: int) -> list[int]:
    """The four chosen positions, or ValueError."""
    if not isinstance(perk_positions, (list, tuple)) or len(perk_positions) != LOADOUT_PERKS:
        raise ValueError(f"Choose exactly {LOADOUT_PERKS} perks")
    positions = list(perk_positions)
    if any(isinstance(p, bool) or not isinstance(p, int) for p in positions):
        raise ValueError("Perk positions must be whole numbers")
    if len(set(positions)) != LOADOUT_PERKS:
        raise ValueError("Choose four different perks")
    if any(p < 0 or p >= perk_count for p in positions):
        raise ValueError("A chosen perk is not in your unlocked perks")
    return sorted(positions)


def to_loadout(match: Match, roster: Roster) -> Loadout:
    return {
        "number": match.number,
        "side": match.side,
        "character_id": roster.characters(match.side)[match.character],
        "perk_ids": to_ids(match.perks, roster.perk_order(match.side)),
    }


def to_match(loadout: Loadout, roster: Roster) -> Match:
    side = loadout["side"]
    (character,) = to_positions([loadout["character_id"]], roster.characters(side))
    perks = tuple(sorted(roster.perk_positions(side, loadout["perk_ids"])))
    return Match(loadout["number"], side, character, perks)


def opening(side: str, perk_positions: list[int], roster: Roster) -> Loadout:
    """Match 1: the sum of the chosen positions picks the character."""
    return to_loadout(first_match(side, perk_positions, roster.sizes), roster)


def next_side(lane: str, side: str) -> str:
    """The mixed lane swaps sides every match; the single-side lanes stay."""
    return side if is_solo(lane) else ("survivor" if side == "killer" else "killer")


def following(
    lane: str, difficulty: str, current: Loadout, before: Loadout | None, used: Used, roster: Roster, *, memory: bool
) -> tuple[Loadout, Used]:
    """The match after `current` and the memory to store with it.

    With `memory` on, a character already played is never chosen again. In the mixed lane the memory is per side and
    starts a new round once a side's characters have all been played; in a single-side lane the caller turns it off
    at that moment (the badge is earned), so a full memory is only ever a mixed-lane round ending.
    """
    previous = to_match(current, roster)
    side = next_side(lane, previous.side)
    characters = roster.characters(side)
    played: list[int] = []
    if memory:
        owned_now = set(characters)
        played = [i for i in used.get(side, []) if i in owned_now]
        if len(played) >= len(characters):
            played = []                                               # every character played: a new round
    positions = frozenset(to_positions(played, characters)) if played else frozenset()

    solo, plus = is_solo(lane), difficulty == "hardcore_plus"
    if plus:
        two_back = to_match(before, roster) if before else None
        match = (next_match_plus_solo if solo else next_match_plus)(previous, two_back, positions, roster.sizes)
    else:
        match = (next_match_solo if solo else next_match)(previous, roster.sizes, positions)
    loadout = to_loadout(match, roster)
    if not memory:
        return loadout, empty_used()
    return loadout, {**used, side: [*played, loadout["character_id"]]}


def start_used(side: str, character_id: int) -> Used:
    """Memory at match 1: only the opening's character is played."""
    used = empty_used()
    used[side].append(character_id)
    return used


def unplayed(side: str, used: Used, roster: Roster) -> int:
    """How many of the player's characters on `side` the memory has not seen yet."""
    return len(set(roster.characters(side)) - set(used.get(side, [])))
