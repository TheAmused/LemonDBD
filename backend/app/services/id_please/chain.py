# backend/app/services/id_please/chain.py
"""The match chain of "ID, Please": pure arithmetic on positions, no database and no randomness.

Positions are indexes into a side's *current* sorted lists (characters or perks); `roster.py` translates
database ids to and from them. The same opening on the same roster always gives the same chain.
"""
from dataclasses import dataclass
from math import gcd

LOADOUT_PERKS = 4
OTHER = {"killer": "survivor", "survivor": "killer"}


@dataclass(frozen=True)
class Sizes:
    killer_characters: int
    killer_perks: int
    survivor_characters: int
    survivor_perks: int

    def characters(self, side: str) -> int:
        return self.killer_characters if side == "killer" else self.survivor_characters

    def perks(self, side: str) -> int:
        return self.killer_perks if side == "killer" else self.survivor_perks


@dataclass(frozen=True)
class Match:
    number: int                 # 1-based; after a win it is also the streak
    side: str
    character: int              # position in the side's current character list
    perks: tuple[int, ...]      # 4 distinct positions in the side's current perk list, ascending


def fit(values, size: int) -> list[int]:
    """Put values into 0..size-1 with `mod size`; a clash moves up by one. Always 4 distinct results."""
    taken: list[int] = []
    for value in values:
        value %= size
        while value in taken:
            value = (value + 1) % size
        taken.append(value)
    return sorted(taken)


def first_match(side: str, perks, sizes: Sizes) -> Match:
    return Match(1, side, sum(perks) % sizes.characters(side), tuple(sorted(perks)))


def free_character(character: int, used, count: int, key: int) -> int:
    """`character` unless it was already played; then the next free one, walking the list in steps that depend on the
    match (`key`) rather than by one. A step of one makes the second half of a long run a stretch of consecutive
    characters (14 to 20% of the pairs), which is a pattern the player could read. The step is coprime with `count`,
    so every free character is reachable. When all are played the memory has nothing to say."""
    if character not in used or len(used) >= count:
        return character
    step = key % (count - 1) + 1 if count > 1 else 1
    while gcd(step, count) != 1:
        step = step % (count - 1) + 1
    while character in used:
        character = (character + step) % count
    return character


def shifted(previous: Match, size: int) -> list[int]:
    """Match 2 on the same side: the four IDs come back moved up by one step set by the last character. The step is
    1 to size-1, never 0, so the IDs always change."""
    step = previous.character % (size - 1) + 1
    return fit([p + step for p in previous.perks], size)


def _basic(previous: Match, side: str, sizes: Sizes, used, solo: bool) -> Match:
    s = previous.number                            # wins so far in this attempt
    size, characters = sizes.perks(side), sizes.characters(side)
    if s == 1:                                     # match 2: the mirror on the other side, or the shift on this one
        perks = shifted(previous, size) if solo else fit(sorted(previous.perks), size)
        character = sum(perks) % characters
        key = sum(perks) + s
    else:
        mirror = fit(sorted(previous.perks), size)
        total, last = sum(mirror), previous.character
        raw = [mirror[j] * (s + 2) + total + j * (last + 1) + s * s for j in range(LOADOUT_PERKS)]
        perks = fit(raw, size)
        whole = sum(perks)
        character = whole * (s + 1) + last + total
        if solo:
            # Perks and characters of one side share their parity through `mod`, which made even character positions
            # 2.4 times as common as odd ones at 54 survivors; this term breaks that link. The mixed lane swaps
            # sides every match, so it never had the problem and keeps its formula.
            character += whole * total // size
        character %= characters
        key = whole + s
    return Match(s + 1, side, free_character(character, used, characters, key), tuple(perks))


def _plus(previous: Match, before: Match | None, used, side: str, sizes: Sizes, solo: bool) -> Match:
    s = previous.number
    size, characters = sizes.perks(side), sizes.characters(side)
    if s == 1 or before is None:                 # match 2, as in the other difficulties
        perks = shifted(previous, size) if solo else fit(sorted(previous.perks), size)
        character = sum(perks) % characters
    else:
        mirror = fit(sorted(previous.perks), size)
        u, cu = before.perks, before.character   # loadout and character two back (the same side as the new match)
        total, last = sum(mirror), previous.character
        raw = []
        for j in range(LOADOUT_PERKS):
            a, b = mirror[(j + 1) % 4], mirror[(j + 2) % 4]
            raw.append(mirror[j] * (s + 2) + a * b + u[(j + s) % 4] * (s + 3) + s ** 3
                       + total + j * (last + 1) + cu * (j + 2))
        perks = fit(raw, size)
        character = (sum(perks) * (s + 1) + total * (cu + 1) + last * s + sum(u) + s * s) % characters
    if len(used) >= characters:
        used = frozenset()
    return Match(s + 1, side, free_character(character, used, characters, sum(perks) + s), tuple(perks))


# --- Mixed lane (the side changes every match) ---------------------------------------------------
def next_match(previous: Match, sizes: Sizes, used=frozenset()) -> Match:
    """Milestones and Hardcore. `used` holds the positions already played on the new side (Hardcore's memory)."""
    return _basic(previous, OTHER[previous.side], sizes, used, solo=False)


def next_match_plus(previous: Match, before: Match | None, used, sizes: Sizes) -> Match:
    """`before` is the match two back (same side as the new one), None while there is none yet;
    `used` holds the positions of characters already played on the new side in this round."""
    return _plus(previous, before, used, OTHER[previous.side], sizes, solo=False)


# --- Single-side lanes ---------------------------------------------------------------------------
def next_match_solo(previous: Match, sizes: Sizes, used=frozenset()) -> Match:
    """Milestones and Hardcore on one side. `used` holds the positions played so far in this attempt."""
    return _basic(previous, previous.side, sizes, used, solo=True)


def next_match_plus_solo(previous: Match, before: Match | None, used, sizes: Sizes) -> Match:
    return _plus(previous, before, used, previous.side, sizes, solo=True)
