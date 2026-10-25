# backend/app/schemas/user_preference.py
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UserPreferenceIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    effects: bool = True
    sounds: bool = True
    music: bool = True
    nsfw: bool = False
    background_animation: Literal["on", "eco", "off"] = "on"
    chosen_at: int = Field(ge=0)
