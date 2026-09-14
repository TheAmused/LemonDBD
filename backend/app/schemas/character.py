# backend/app/schemas/character.py
"""Pydantic DTOs for `app.models.character`: two independent tables, no shared
`Character` schema and no `role` write field.

`survivors` and `killers` are their own tables with their own id spaces (see
the module docstring on `app.models.character`), so this mirrors that split
rather than papering over it with a polymorphic schema. There is nothing to
write for `role` on either side -- it is a class constant on the model, not a
column, and the response classes below default it exactly the way
`_CharacterMixin._base_dict()` does.

`*Response` mirrors `Survivor.to_dict()` / `Killer.to_dict()` field-for-field,
derived keys included (`code_prefix`, `release_number`, `dlc_counterparts`,
`chapter_name`, `dlc_type`, `is_licensed`, `release_year`, `release_date`),
so a caller can validate against the real API shape without reading the
model. They are built from `to_dict()`'s output (`Response(**obj.to_dict())`),
not `from_attributes` off the ORM row directly -- `code_prefix`,
`dlc_counterparts` and the rest are `@property`s on the model, not columns,
and `chapter_name`/`dlc_type`/`is_licensed` come from the related `Chapter`,
not from `Survivor`/`Killer` itself.
"""
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

#: Mirrors `app.models.character.KILLER_HEIGHTS`.
KILLER_HEIGHT_PATTERN = r"^(Short|Average|Tall)$"


class SurvivorBase(BaseModel):
    """Write shape for a row of `survivors`."""

    name: str = Field(..., max_length=100)
    chapter_id: int
    portrait_url: str | None = Field(None, max_length=255)
    real_name: str | None = Field(None, max_length=100)
    avatar_local_path: str | None = Field(None, max_length=255)
    is_disabled: bool = False
    disabled_reason: str | None = Field(None, max_length=255)
    lore: str | None = None
    translations: dict[str, Any] | None = None


class SurvivorResponse(BaseModel):
    """Mirrors `Survivor.to_dict()`."""

    id: int
    name: str
    role: str = "Survivor"
    category: str = "Survivor"
    code_prefix: str
    portrait_url: str | None = None
    real_name: str
    avatar_url: str = ""
    avatar_local_path: str = ""
    release_number: int
    chapter_id: int
    chapter_name: str = "Base Game"
    dlc_type: str = "Chapter DLC"
    is_licensed: bool = False
    is_disabled: bool = False
    disabled_reason: str | None = None
    release_year: int | None = None
    release_date: str = ""
    dlc_counterparts: list[str] = []
    lore: str = ""
    translations: dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)


class KillerPowerResponse(BaseModel):
    """Mirrors `Killer.power_dict()`, the nested `power` object `Killer.to_dict()`
    embeds. Every default here matches the model's own fallback, used only
    when a killer somehow has no `movement_speed_ms`/`terror_radius`/`height`
    set (none currently do -- `power_name` is NOT NULL, but the other three
    power columns are still nullable)."""

    name: str
    description: str = ""
    icon_url: str = ""
    icon_local_path: str = ""
    movement_speed: str = "4.6 m/s (115%)"
    terror_radius: str = "32 m"
    terror_radius_meters: int = 32
    height: str = "Tall"

    model_config = ConfigDict(from_attributes=True)


class KillerBase(BaseModel):
    """Write shape for a row of `killers`.

    `power_name` is NOT NULL on the model -- every one of the 44 killers has a
    power, no survivor ever did -- so it is required here too, not defaulted.
    `movement_speed_ms`/`terror_radius_meters` reuse the table's own CHECK
    bounds (`> 0` / `>= 0`) as field constraints, so a bad write fails at the
    schema instead of the database.
    """

    name: str = Field(..., max_length=100)
    chapter_id: int
    power_name: str = Field(..., max_length=150)
    power_description: str = ""
    power_icon_url: str | None = Field(None, max_length=500)
    power_icon_local_path: str | None = Field(None, max_length=255)
    movement_speed_ms: float | None = Field(None, gt=0)
    terror_radius: str | None = Field(None, max_length=150)
    terror_radius_meters: int | None = Field(None, ge=0)
    height: str | None = Field(None, pattern=KILLER_HEIGHT_PATTERN)
    portrait_url: str | None = Field(None, max_length=255)
    real_name: str | None = Field(None, max_length=100)
    avatar_local_path: str | None = Field(None, max_length=255)
    is_disabled: bool = False
    disabled_reason: str | None = Field(None, max_length=255)
    lore: str | None = None
    translations: dict[str, Any] | None = None


class KillerResponse(BaseModel):
    """Mirrors `Killer.to_dict()`: the mixin fields plus the nested `power`."""

    id: int
    name: str
    role: str = "Killer"
    category: str = "Killer"
    code_prefix: str
    portrait_url: str | None = None
    real_name: str
    avatar_url: str = ""
    avatar_local_path: str = ""
    release_number: int
    chapter_id: int
    chapter_name: str = "Base Game"
    dlc_type: str = "Chapter DLC"
    is_licensed: bool = False
    is_disabled: bool = False
    disabled_reason: str | None = None
    release_year: int | None = None
    release_date: str = ""
    dlc_counterparts: list[str] = []
    lore: str = ""
    translations: dict[str, Any] = {}
    power: KillerPowerResponse

    model_config = ConfigDict(from_attributes=True)
