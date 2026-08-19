from typing import List, Optional
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
    code_prefix: Optional[str] = Field(None, max_length=10)
    portrait_url: Optional[str] = Field(None, max_length=255)
    real_name: Optional[str] = Field(None, max_length=100)
    short_name: Optional[str] = Field(None, max_length=50)
    wiki_slug: Optional[str] = Field(None, max_length=100)
    avatar_local_path: Optional[str] = Field(None, max_length=255)
    release_number: Optional[int] = None
    chapter_name: Optional[str] = Field("Base Game", max_length=150)
    chapter_number: Optional[str] = Field(None, max_length=50)
    dlc_type: Optional[str] = Field("original_chapter", max_length=50)
    is_licensed: Optional[bool] = False
    release_year: Optional[int] = 2016
    release_date: Optional[str] = Field(None, max_length=50)
    dlc_counterparts: Optional[str] = None
    lore: Optional[str] = None

    # Killer specifics
    power_name: Optional[str] = Field(None, max_length=150)
    power_description: Optional[str] = None
    power_icon_url: Optional[str] = Field(None, max_length=500)
    movement_speed: Optional[str] = Field(None, max_length=100)
    terror_radius: Optional[str] = Field(None, max_length=100)
    terror_radius_meters: Optional[int] = None
    height: Optional[str] = Field(None, max_length=50)


class CharacterCreate(CharacterBase):
    pass


class CharacterResponse(BaseModel):
    id: int
    name: str
    role: str
    category: str
    code_prefix: Optional[str] = None
    portrait_url: Optional[str] = None
    real_name: str
    short_name: str
    wiki_slug: str
    avatar_url: str
    avatar_local_path: str
    release_number: Optional[int] = None
    chapter_name: str
    chapter_number: str
    dlc_type: str
    is_licensed: bool
    release_year: int
    release_date: str
    dlc_counterparts: List[str] = []
    lore: str
    power: Optional[KillerPowerSchema] = None

    model_config = ConfigDict(from_attributes=True)

