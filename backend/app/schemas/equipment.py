# backend/app/schemas/equipment.py
from pydantic import BaseModel, ConfigDict, Field


class ItemBase(BaseModel):
    name: str = Field(..., max_length=150)
    category: str = Field(default="", max_length=50)
    role: str = Field(default="Survivor", max_length=20)
    description: str = ""
    icon_url: str | None = Field(None, max_length=500)
    icon_local_path: str | None = Field(None, max_length=255)
    rarity: str | None = Field(None, max_length=50)


class ItemResponse(ItemBase):
    id: int
    raw_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AddonBase(BaseModel):
    name: str = Field(..., max_length=150)
    associated_target: str | None = Field(None, max_length=100)
    category: str = Field(default="", max_length=50)
    description: str = ""
    icon_url: str | None = Field(None, max_length=500)
    icon_local_path: str | None = Field(None, max_length=255)
    rarity: str | None = Field(None, max_length=50)


class AddonResponse(AddonBase):
    id: int
    raw_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class OfferingBase(BaseModel):
    name: str = Field(..., max_length=150)
    category: str = Field(default="Offering", max_length=50)
    role: str = Field(default="All", max_length=20)
    description: str = ""
    icon_url: str | None = Field(None, max_length=500)
    icon_local_path: str | None = Field(None, max_length=255)
    rarity: str | None = Field(None, max_length=50)


class OfferingResponse(OfferingBase):
    id: int
    raw_name: str | None = None

    model_config = ConfigDict(from_attributes=True)
