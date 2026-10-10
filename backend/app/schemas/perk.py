# backend/app/schemas/perk.py
"""Pydantic DTO for `app.models.perk.Perk`.

Two things changed under this schema and both are enforced here, not just in
the database: `category` was renamed to `role` (the model still emits
`category` in `to_dict()` as an alias, so `PerkResponse` keeps both), and a
perk's owner is now one of two nullable foreign keys (`survivor_id`,
`killer_id`) instead of a single `character_id` pointed at one shared table.
`PerkBase.check_single_owner_matches_role` mirrors the table's
`ck_perks_single_owner_matches_role` CHECK constraint at the schema layer: at
most one of `survivor_id`/`killer_id` may be set, and whichever is set must
agree with `role`.

`perk_type` (one string) was replaced by `perk_types`, an ordered list whose
first entry is the primary type. The vocabulary and the shape rules live in
`app.models.perk_types`; `PerkTypeSpec` below adds the one rule that needs the
perk's role (exhaustion/boon are Survivor-only, hooks Killer-only) and is shared
by the write shape, the response shape and the seed importer, so there is a
single definition of a valid perk-type list.
"""
from typing import Any, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.perk_types import (
    DEFAULT_PERK_TYPES,
    PerkTypes,
    check_perk_types_match_role,
)

ROLE_PATTERN = r"^(Survivor|Killer)$"


class PerkTypeSpec(BaseModel):
    """A perk's `role` and `perk_types`, and the rules that tie them together.

    Rejects the retired `perk_type` key outright instead of ignoring it: a
    client still sending it would otherwise have its value silently replaced by
    the `['entity']` default.
    """

    role: str = Field("Survivor", pattern=ROLE_PATTERN)
    #: Ordered, 1-3 entries, no repeats, `entity` only alone; `[0]` is the
    #: primary type (the Tarot card). Omitted means the catch-all `['entity']`.
    perk_types: PerkTypes = Field(default_factory=lambda: list(DEFAULT_PERK_TYPES))

    @model_validator(mode="before")
    @classmethod
    def reject_retired_perk_type(cls, data: Any) -> Any:
        if isinstance(data, dict) and "perk_type" in data:
            raise ValueError("`perk_type` was replaced by `perk_types`, an ordered list (first entry = primary type)")
        return data

    @model_validator(mode="after")
    def check_perk_types_match_role(self) -> Self:
        check_perk_types_match_role(self.perk_types, self.role)
        return self


class PerkBase(PerkTypeSpec):
    """Write shape for a row of `perks`."""

    name: str = Field(..., max_length=150)
    alternate_name: str | None = Field(None, max_length=150)
    is_generic_counterpart: bool = False
    is_teachable: bool = True
    is_disabled: bool = False
    disabled_reason: str | None = Field(None, max_length=255)
    description: str = ""
    icon_url: str | None = Field(None, max_length=500)
    icon_local_path: str | None = Field(None, max_length=255)
    translations: dict[str, Any] | None = None
    #: At most one set, and only on the side `role` names. 27 general perks
    #: (no character taught them) leave both NULL.
    survivor_id: int | None = None
    killer_id: int | None = None

    @model_validator(mode="after")
    def check_single_owner_matches_role(self) -> Self:
        if self.survivor_id is not None and self.killer_id is not None:
            raise ValueError("a perk can have at most one owner (survivor_id or killer_id), not both")
        if self.survivor_id is not None and self.role != "Survivor":
            raise ValueError("survivor_id can only be set when role is 'Survivor'")
        if self.killer_id is not None and self.role != "Killer":
            raise ValueError("killer_id can only be set when role is 'Killer'")
        return self


class PerkResponse(PerkTypeSpec):
    """Mirrors `Perk.to_dict()`.

    `character_id` is the owner's id *within its role's table* -- ambiguous on
    its own now that survivor 7 and killer 7 both exist -- so it is kept next
    to `survivor_id`/`killer_id`, which disambiguate it, rather than dropped.
    """

    id: int
    name: str
    alternate_name: str = ""
    is_generic_counterpart: bool = False
    is_teachable: bool = True
    category: str
    #: Looser than the write shape's Survivor|Killer pattern: a response only
    #: reports the stored value, it does not gate it.
    role: str
    character: str = "General"
    character_real_name: str = "General"
    character_avatar_path: str = ""
    character_id: int | None = None
    survivor_id: int | None = None
    killer_id: int | None = None
    description: str = ""
    icon_url: str = ""
    icon_local_path: str = ""
    translations: dict[str, Any] = {}
    is_disabled: bool = False
    disabled_reason: str | None = None

    model_config = ConfigDict(from_attributes=True)
