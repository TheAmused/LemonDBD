# backend/app/schemas/user_preference.py
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.user_preference import DEFAULT_BACKGROUND_ANIMATION


class UserPreferenceIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    effects: bool = True
    sounds: bool = True
    music: bool = True
    nsfw: bool = False
    background_animation: Literal["on", "eco", "off"] = DEFAULT_BACKGROUND_ANIMATION
    gifs: bool | None = None  # absent from older clients: keep what the account has saved
    chosen_at: int = Field(strict=True, ge=0)
