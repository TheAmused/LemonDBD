# backend/app/schemas/character.py
from pydantic import BaseModel, ConfigDict, Field


class KillerPowerSchema(BaseModel):
    name: str = ""
    description: str = ""
    icon_url: str = ""
    icon_local_path: str = ""
    movement_speed: str = "4.6 m/s (115%)"
    terror_radius: str = "32 m"
    terror_radius_meters: int = 32
    height: str = "Tall"


class CharacterBase(BaseModel):
    name: str = Field(..., max_length=100)
    role: str = Field(..., max_length=20)
    code_prefix: str | None = Field(None, max_length=10)
    portrait_url: str | None = Field(None, max_length=255)
    real_name: str | None = Field(None, max_length=100)
    short_name: str | None = Field(None, max_length=50)
    wiki_slug: str | None = Field(None, max_length=100)
    avatar_local_path: str | None = Field(None, max_length=255)
    release_number: int | None = None
    chapter_name: str | None = Field("Base Game", max_length=150)
    chapter_number: str | None = Field(None, max_length=50)
    dlc_type: str | None = Field("original_chapter", max_length=50)
    is_licensed: bool | None = False
    is_disabled: bool = False
    disabled_reason: str | None = Field(None, max_length=255)
    release_year: int | None = 2016
    release_date: str | None = Field(None, max_length=50)
    dlc_counterparts: str | None = None
    lore: str | None = None

    power_name: str | None = Field(None, max_length=150)
    power_description: str | None = None
    power_icon_url: str | None = Field(None, max_length=500)
    movement_speed: str | None = Field(None, max_length=100)
    terror_radius: str | None = Field(None, max_length=100)
    terror_radius_meters: int | None = None
    height: str | None = Field(None, max_length=50)


class CharacterCreate(CharacterBase):
    pass


class CharacterResponse(BaseModel):
    id: int
    name: str
    role: str
    category: str
    code_prefix: str | None = None
    portrait_url: str | None = None
    real_name: str
    short_name: str
    wiki_slug: str
    avatar_url: str
    avatar_local_path: str
    release_number: int | None = None
    chapter_name: str
    chapter_number: str
    dlc_type: str
    is_licensed: bool
    is_disabled: bool = False
    disabled_reason: str | None = None
    release_year: int
    release_date: str
    dlc_counterparts: list[str] = []
    lore: str
    power: KillerPowerSchema | None = None

    model_config = ConfigDict(from_attributes=True)
