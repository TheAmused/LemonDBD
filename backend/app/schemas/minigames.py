# backend/app/schemas/minigames.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DraftSessionBase(BaseModel):
    room_code: str
    phase: str = "bans"
    banned_perks: list[str] = []
    picked_survivor_perks: list[str] = []
    picked_killer_perks: list[str] = []


class DraftSessionResponse(DraftSessionBase):
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class GuesserStatBase(BaseModel):
    guesser_type: str
    current_streak: int = 0
    best_streak: int = 0
    total_guesses: int = 0
    correct_guesses: int = 0


class GuesserStatResponse(GuesserStatBase):
    id: int
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
