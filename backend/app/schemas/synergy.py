# backend/app/schemas/synergy.py
from __future__ import annotations

from pydantic import BaseModel, Field


class SynergyAnalyzeDTO(BaseModel):
    perks: list[str] = Field(default_factory=list)
    perk_names: list[str] | None = None
    role: str = "survivor"
