# backend/app/services/id_please/roster.py
"""The player's live roster as "ID, Please" counts it, and the translation between database ids and positions.

A *position* is an index into a side's sorted list of owned characters (or unlocked perks): the "ID" the player
sees, counted from 0. Nothing here is stored on a run: the lists are read on every request, so a change to the
player's characters or perks takes effect at once. A match in progress is stored as database ids and mapped to
positions through the lists as they are now.

Who counts as owned follows `fetch_user_characters` and `fetch_user_perks` (what the player sees on the
character and perk pages), but only ids are read, and sorted by id instead of by name.
"""
import json
import zlib
from hashlib import blake2b
from bisect import bisect_left
from dataclasses import dataclass

from sqlalchemy import select

from app.core.extensions import db
from app.models import Killer, Perk, Survivor, UserCharacterOwnership, UserPerkOwnership
from app.services.id_please.chain import Sizes
from app.services.id_please.constants import SIDES

_ROLE = {"killer": "Killer", "survivor": "Survivor"}
_CHARACTER_MODEL = {"killer": Killer, "survivor": Survivor}


@dataclass(frozen=True)
class Roster:
    """Sorted database ids of what the player owns, per side."""

    killer_ids: tuple[int, ...]
    survivor_ids: tuple[int, ...]
    killer_perk_ids: tuple[int, ...]
    survivor_perk_ids: tuple[int, ...]
    #: Hardcore+: the hidden shuffle of the perk order the chain counts in (0 = the plain, sorted order).
    perk_seed: int = 0

    def characters(self, side: str) -> tuple[int, ...]:
        return self.killer_ids if side == "killer" else self.survivor_ids

    def perks(self, side: str) -> tuple[int, ...]:
        return self.killer_perk_ids if side == "killer" else self.survivor_perk_ids

    def perk_order(self, side: str) -> tuple[int, ...]:
        """The perks in the order the chain counts them: sorted by id, or shuffled by the run's seed."""
        return shuffled(self.perks(side), self.perk_seed)

    def perk_positions(self, side: str, db_ids) -> list[int]:
        """Chain position of each perk id. A perk no longer unlocked takes the place of its nearest higher id."""
        owned = self.perks(side)
        if not self.perk_seed:
            return to_positions(db_ids, owned)
        place = {perk_id: index for index, perk_id in enumerate(self.perk_order(side))}
        return [place[owned[position]] for position in to_positions(db_ids, owned)]

    @property
    def sizes(self) -> Sizes:
        return Sizes(len(self.killer_ids), len(self.killer_perk_ids), len(self.survivor_ids), len(self.survivor_perk_ids))

    @property
    def fingerprint(self) -> str:
        """Sizes plus a checksum of every id: only ever compared, to tell that the roster changed. It plays
        no part in the chain."""
        digest = zlib.crc32(json.dumps([self.killer_ids, self.survivor_ids, self.killer_perk_ids, self.survivor_perk_ids]).encode())
        s = self.sizes
        return f"{s.killer_characters}/{s.killer_perks}/{s.survivor_characters}/{s.survivor_perks}:{digest:08x}"


def shuffled(ids: tuple[int, ...], seed: int) -> tuple[int, ...]:
    """`ids` in the order a seed gives them: every id gets a hash of the seed and itself, and the list is sorted by it.
    Seed 0 leaves the order alone."""
    if not seed:
        return ids
    return tuple(sorted(ids, key=lambda i: blake2b(f"{seed}:{i}".encode(), digest_size=8).digest()))


def to_positions(db_ids, owned) -> list[int]:
    """Position of each id in `owned` (sorted). An id no longer owned lands on its nearest higher neighbour,
    or on the last entry, so a changed roster never breaks the arithmetic. `owned` must not be empty."""
    if not owned:
        raise ValueError("The roster is empty")
    return [min(bisect_left(owned, i), len(owned) - 1) for i in db_ids]


def to_ids(positions, owned) -> list[int]:
    return [owned[p] for p in positions]


def _owned_characters(user_id: int, side: str) -> tuple[int, ...]:
    model = _CHARACTER_MODEL[side]
    column = UserCharacterOwnership.killer_id if side == "killer" else UserCharacterOwnership.survivor_id
    disowned = set(db.session.scalars(
        select(column).where(UserCharacterOwnership.user_id == user_id, column.is_not(None), UserCharacterOwnership.is_owned.is_(False))
    ))
    ids = db.session.scalars(select(model.id).where(model.is_disabled.is_(False)).order_by(model.id))
    return tuple(i for i in ids if i not in disowned)


def _is_general(perk_owner: int | None, generic_counterpart: bool) -> bool:
    return perk_owner is None or generic_counterpart


def _unlocked_perks(user_id: int, side: str) -> tuple[int, ...]:
    owner = Perk.killer_id if side == "killer" else Perk.survivor_id
    rows = db.session.execute(
        select(Perk.id, owner, Perk.is_generic_counterpart).where(Perk.role == _ROLE[side], Perk.is_disabled.is_(False)).order_by(Perk.id)
    ).all()
    explicit = {
        perk_id: unlocked
        for perk_id, unlocked in db.session.execute(
            select(UserPerkOwnership.perk_id, UserPerkOwnership.is_unlocked).where(UserPerkOwnership.user_id == user_id)
        )
    }
    column = UserCharacterOwnership.killer_id if side == "killer" else UserCharacterOwnership.survivor_id
    disowned = set(db.session.scalars(
        select(column).where(UserCharacterOwnership.user_id == user_id, column.is_not(None), UserCharacterOwnership.is_owned.is_(False))
    ))
    unlocked: list[int] = []
    for perk_id, perk_owner, generic in rows:
        if _is_general(perk_owner, generic) or (explicit[perk_id] if perk_id in explicit else perk_owner not in disowned):
            unlocked.append(perk_id)
    return tuple(unlocked)


def load_roster(user_id: int, perk_seed: int = 0) -> Roster:
    """The four sorted id lists as they are right now; `perk_seed` is the run's Hardcore+ shuffle."""
    return Roster(
        perk_seed=perk_seed,
        killer_ids=_owned_characters(user_id, "killer"),
        survivor_ids=_owned_characters(user_id, "survivor"),
        killer_perk_ids=_unlocked_perks(user_id, "killer"),
        survivor_perk_ids=_unlocked_perks(user_id, "survivor"),
    )


def always_on_perk_counts() -> dict[str, int]:
    """Perks every account has: no owner, or the generic counterpart of a licensed perk (not disabled)."""
    counts: dict[str, int] = {}
    for side in SIDES:
        owner = Perk.killer_id if side == "killer" else Perk.survivor_id
        rows = db.session.execute(
            select(owner, Perk.is_generic_counterpart).where(Perk.role == _ROLE[side], Perk.is_disabled.is_(False))
        ).all()
        counts[side] = sum(1 for perk_owner, generic in rows if _is_general(perk_owner, generic))
    return counts
