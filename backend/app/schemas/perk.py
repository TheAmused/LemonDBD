# backend/app/schemas/perk.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PerkBase(BaseModel):
    name: str = Field(..., max_length=150)
    alternate_name: Optional[str] = Field(None, max_length=150)
    is_generic_counterpart: bool = False
    is_teachable: bool = True
    category: str = Field(default="Survivor", max_length=20)
    description: str = ""
    icon_url: Optional[str] = Field(None, max_length=500)
    icon_local_path: Optional[str] = Field(None, max_length=255)
    character_id: Optional[int] = None


class PerkCreate(PerkBase):
    pass


class PerkResponse(PerkBase):
    id: int
    character: Optional[str] = "General"
    character_real_name: Optional[str] = "General"
    character_avatar_path: Optional[str] = ""

    model_config = ConfigDict(from_attributes=True)


class PerkRuleBase(BaseModel):
    name: str = Field(..., max_length=150)
    is_default: bool = False
    slot1_type: str = "character_own"
    slot2_type: str = "character_own"
    slot3_type: str = "general_role"
    slot4_type: str = "any_role"


class PerkRuleResponse(PerkRuleBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

