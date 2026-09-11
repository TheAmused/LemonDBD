# backend/app/schemas/perk.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PerkBase(BaseModel):
    name: str = Field(..., max_length=150)
    alternate_name: str | None = Field(None, max_length=150)
    is_generic_counterpart: bool = False
    is_teachable: bool = True
    category: str = Field(default="Survivor", max_length=20)
    description: str = ""
    icon_url: str | None = Field(None, max_length=500)
    icon_local_path: str | None = Field(None, max_length=255)
    character_id: int | None = None
    is_disabled: bool = False
    disabled_reason: str | None = Field(None, max_length=255)


class PerkCreate(PerkBase):
    pass


class PerkResponse(PerkBase):
    id: int
    character: str | None = "General"
    character_real_name: str | None = "General"
    character_avatar_path: str | None = ""

    model_config = ConfigDict(from_attributes=True)

