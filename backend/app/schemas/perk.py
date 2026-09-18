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
"""
from typing import Any, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

ROLE_PATTERN = r"^(Survivor|Killer)$"


class PerkBase(BaseModel):
    """Write shape for a row of `perks`."""

    name: str = Field(..., max_length=150)
    role: str = Field("Survivor", pattern=ROLE_PATTERN)
    alternate_name: str | None = Field(None, max_length=150)
    is_generic_counterpart: bool = False
    is_teachable: bool = True
    is_disabled: bool = False
    disabled_reason: str | None = Field(None, max_length=255)
    description: str = ""
    icon_url: str | None = Field(None, max_length=500)
    icon_local_path: str | None = Field(None, max_length=255)
    translations: dict[str, Any] | None = None
    #: Chaos Wheel curse bucket. One of: exhaustion, gen_slowdown, hex, boon,
    #: chase, aura_reading, altruism_healing, handicap, meme, general.
    #: Nullable; a missing value is treated as "general" by consumers.
    perk_type: str | None = Field(None, max_length=30)
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


class PerkResponse(BaseModel):
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
    perk_type: str = "general"
    translations: dict[str, Any] = {}
    is_disabled: bool = False
    disabled_reason: str | None = None

    model_config = ConfigDict(from_attributes=True)
