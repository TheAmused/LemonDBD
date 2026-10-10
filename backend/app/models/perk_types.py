# backend/app/models/perk_types.py
"""The perk-type vocabulary and the rules a perk's `perk_types` list must obey.

A perk can be several things at once (Deja Vu reads auras *and* speeds up
repairs), so `Perk.perk_types` is an ordered list rather than a single value:

* The first entry is the **primary** type. It is the one Tarot card the perk
  is drawn as and the one shown first wherever a single label is needed.
* Every entry counts for Chaos Mutators (any-of) and for the Classic Perk
  Guesser (set comparison).
* `entity` is the wildcard bucket for "none of the above". It only makes
  sense on its own, so it may not be combined with another type.
* Exhaustion perks and boons exist only on the Survivor side and Scourge Hook
  perks only on the Killer side, so those types are checked against the role.

The rules are written once, here, as pydantic types. `app.schemas.perk` uses
them for request/response validation, the import path validates each seed row
through the same schema, and `Perk.perk_types` re-runs the shape rules on
every assignment -- so a malformed list cannot reach the database from any of
those directions.

This lives next to the models (not in `app.schemas`) for the same reason
`CHANGELOG_TAGS` does: the models need the vocabulary, and importing the
schemas package from a model module would be circular.
"""
from typing import Annotated, Literal, get_args

from pydantic import AfterValidator, Field, TypeAdapter

PerkType = Literal[
    "hex", "boon", "sacrifice", "exhaustion", "obsession",
    "aura", "generator", "healing", "chase", "stealth", "entity", "hooks",
]
PERK_TYPES: tuple[str, ...] = get_args(PerkType)

#: The wildcard bucket, and what a perk with no stated type is treated as.
WILDCARD_PERK_TYPE = "entity"
DEFAULT_PERK_TYPES: tuple[str, ...] = (WILDCARD_PERK_TYPE,)

#: A perk may carry up to three types. More than that stops describing what the
#: perk is mainly for and makes every curse match half the pool.
MAX_PERK_TYPES = 3

#: Types that only exist on one side of the game.
ROLE_ONLY_PERK_TYPES: dict[str, str] = {
    "exhaustion": "Survivor",
    "boon": "Survivor",
    "hooks": "Killer",
}


def _check_shape(types: list[str]) -> list[str]:
    duplicated = sorted({t for t in types if types.count(t) > 1})
    if duplicated:
        raise ValueError(f"perk_types must not repeat a type (repeated: {', '.join(duplicated)})")
    if WILDCARD_PERK_TYPE in types and len(types) > 1:
        raise ValueError(f"'{WILDCARD_PERK_TYPE}' is the catch-all type and cannot be combined with another type")
    return types


#: A non-empty, duplicate-free list of valid types, `entity` only alone.
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
