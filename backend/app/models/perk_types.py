# backend/app/models/perk_types.py
"""The perk-type vocabulary and the rules a perk's `perk_types` list must obey.

Every type names a *moment of use* (when and why a perk matters), so a player
can tell where a perk belongs without reading it.

A perk can be several things at once (Deja Vu reads auras *and* speeds up
repairs), so `Perk.perk_types` is an ordered list rather than a single value:

* The first entry is the **primary** type. It is the one Tarot card the perk
  is drawn as and the one shown first wherever a single label is needed.
* Every entry counts for Chaos Mutators (any-of) and for the Classic Perk
  Guesser (set comparison).
* `entity` is the type for perks that *block* things (the Entity visually
  covers the blocked element). It combines with other types like any other.
* Exhaustion, sacrifice and item perks exist only on the Survivor side, so
  those types are checked against the role.
* `totem` covers Hex totems (Killer) and Boon totems (Survivor) alike; the
  Tarot card for it differs by role.

The rules are written once, here, as pydantic types. `app.schemas.perk` uses
them for request/response validation, the import path validates each seed row
through the same schema, and `Perk.perk_types` re-runs the shape rules on
every assignment -- so a malformed list cannot reach the database from any of
those directions.

This lives next to the models (not in `app.schemas`): the models need the
vocabulary, and importing the schemas package from a model module would be
circular.
"""
from typing import Annotated, Literal, get_args

from pydantic import AfterValidator, Field, TypeAdapter

PerkType = Literal[
    "generator", "healing", "chase", "stealth", "tracking", "exhaustion",
    "sacrifice", "obsession", "totem", "hooks", "downed", "items", "endgame",
    "entity",
]
PERK_TYPES: tuple[str, ...] = get_args(PerkType)

#: What a perk with no stated type is treated as: unclassified data (an old
#: backup, a row not flushed yet) reads as `entity`.
DEFAULT_PERK_TYPES: tuple[str, ...] = ("entity",)

#: Types renamed or merged by the category redesign. Old backups and seed files
#: still carry them, so imports read them through `upgrade_legacy_perk_types`.
LEGACY_PERK_TYPE_RENAMES: dict[str, str] = {"aura": "tracking", "hex": "totem", "boon": "totem"}

#: A perk may carry up to three types. More than that stops describing what the
#: perk is mainly for and makes every curse match half the pool.
MAX_PERK_TYPES = 3

#: Types that only exist on one side of the game.
ROLE_ONLY_PERK_TYPES: dict[str, str] = {
    "exhaustion": "Survivor",
    "sacrifice": "Survivor",
    "items": "Survivor",
}


def _check_shape(types: list[str]) -> list[str]:
    duplicated = sorted({t for t in types if types.count(t) > 1})
    if duplicated:
        raise ValueError(f"perk_types must not repeat a type (repeated: {', '.join(duplicated)})")
    return types


#: A non-empty, duplicate-free list of valid types.
PerkTypes = Annotated[
    list[PerkType],
    Field(min_length=1, max_length=MAX_PERK_TYPES),
    AfterValidator(_check_shape),
]

_PERK_TYPES_ADAPTER: TypeAdapter[list[str]] = TypeAdapter(PerkTypes)


def validate_perk_types(value: object) -> list[str]:
    """Validate a list on its own (no role) and return it as a fresh list.

    Raises `pydantic.ValidationError`, which is a `ValueError`.
    """
    return list(_PERK_TYPES_ADAPTER.validate_python(value))


def check_perk_types_match_role(perk_types: list[str], role: str) -> None:
    """Raise `ValueError` if a type in the list does not exist on `role`'s side."""
    for perk_type in perk_types:
        required_role = ROLE_ONLY_PERK_TYPES.get(perk_type)
        if required_role is not None and required_role != role:
            raise ValueError(
                f"perk type '{perk_type}' only exists on {required_role} perks, but this perk's role is '{role}'"
            )


def upgrade_legacy_perk_types(types: object) -> object:
    """Rewrite renamed types (`aura`, `hex`, `boon`) to their current names.

    A list that is not a list of strings is returned untouched, so validation
    still reports it. Order is kept. A repeat the rename itself creates (a perk
    that was both a hex and a boon) is dropped; a repeat the list already had
    stays, so validation still reports it.
    """
    if not isinstance(types, list) or not all(isinstance(t, str) for t in types):
        return types
    upgraded: list[str] = []
    for t in types:
        current = LEGACY_PERK_TYPE_RENAMES.get(t, t)
        if not (t in LEGACY_PERK_TYPE_RENAMES and current in upgraded):
            upgraded.append(current)
    return upgraded
