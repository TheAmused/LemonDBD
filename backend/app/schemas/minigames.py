from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class GeneratorSettingBase(BaseModel):
    role: str = "Survivor"
    gen_mode: str = "instant"
    no_repeat_perks: bool = True
    total_pages: int = 12
    perks_per_page: int = 15
    last_page_perks: int = 8
    spin_duration_sec: float = 3.0


class GeneratorSettingResponse(GeneratorSettingBase):
    id: int
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GeneratorDrawnPerkBase(BaseModel):
    role: str
    perk_name: str


class GeneratorDrawnPerkResponse(GeneratorDrawnPerkBase):
    id: int
    drawn_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DraftSessionBase(BaseModel):
    room_code: str
    phase: str = "bans"
    banned_perks: List[str] = []
    picked_survivor_perks: List[str] = []
    picked_killer_perks: List[str] = []


class DraftSessionResponse(DraftSessionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GuesserStatBase(BaseModel):
    guesser_type: str
    current_streak: int = 0
    best_streak: int = 0
    total_guesses: int = 0
    correct_guesses: int = 0


class GuesserStatResponse(GuesserStatBase):
    id: int
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

