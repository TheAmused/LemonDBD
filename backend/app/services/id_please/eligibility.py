# backend/app/services/id_please/eligibility.py
"""Which difficulties an account may play in a lane, judged on the live roster."""
from typing import TypedDict

from app.services.id_please.constants import DIFFICULTIES, MIN_PERKS, PERKS_PER_CHARACTER, SIDES, min_characters
from app.services.id_please.roster import Roster, always_on_perk_counts


class Need(TypedDict):
    have: int
    need: int


class SideEligibility(TypedDict):
    characters: Need
    perks: Need


class Eligibility(TypedDict):
    met: bool
    killer: SideEligibility
    survivor: SideEligibility


def perks_needed(lane: str, difficulty: str, side: str, always_on: dict[str, int]) -> int:
    """Hardcore and Hardcore+ ask for the always-open perks plus the three each required character teaches.
    A side the lane never plays asks for nothing."""
    characters = min_characters(lane, difficulty, side)
    if characters == 0:
        return 0
    if difficulty == "milestones":
        return MIN_PERKS
    return always_on[side] + PERKS_PER_CHARACTER * characters


def evaluate_difficulty(lane: str, difficulty: str, roster: Roster, always_on: dict[str, int]) -> Eligibility:
    sides: dict[str, SideEligibility] = {}
    for side in SIDES:
        sides[side] = {
            "characters": {"have": len(roster.characters(side)), "need": min_characters(lane, difficulty, side)},
            "perks": {"have": len(roster.perks(side)), "need": perks_needed(lane, difficulty, side, always_on)},
        }
    met = all(
        sides[side]["characters"]["have"] >= sides[side]["characters"]["need"]
        and sides[side]["perks"]["have"] >= sides[side]["perks"]["need"]
        for side in SIDES
    )
    return {"met": met, "killer": sides["killer"], "survivor": sides["survivor"]}


def evaluate(lane: str, roster: Roster, always_on: dict[str, int] | None = None) -> dict[str, Eligibility]:
    """Every difficulty's requirements against the roster."""
    counts = always_on if always_on is not None else always_on_perk_counts()
    return {difficulty: evaluate_difficulty(lane, difficulty, roster, counts) for difficulty in DIFFICULTIES}
