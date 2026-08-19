# backend/app/schemas/equipment.py
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ItemBase(BaseModel):
    name: str = Field(..., max_length=150)
    category: str = Field(default="", max_length=50)
    role: str = Field(default="Survivor", max_length=20)
    description: str = ""
    icon_url: Optional[str] = Field(None, max_length=500)
    icon_local_path: Optional[str] = Field(None, max_length=255)
    rarity: Optional[str] = Field(None, max_length=50)


class ItemResponse(ItemBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class AddonBase(BaseModel):
    name: str = Field(..., max_length=150)
    associated_target: Optional[str] = Field(None, max_length=100)
    category: str = Field(default="", max_length=50)
    description: str = ""
    icon_url: Optional[str] = Field(None, max_length=500)
    icon_local_path: Optional[str] = Field(None, max_length=255)
    rarity: Optional[str] = Field(None, max_length=50)


class AddonResponse(AddonBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

