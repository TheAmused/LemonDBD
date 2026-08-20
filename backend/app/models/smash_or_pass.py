# backend/app/models/smash_or_pass.py
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base
from app.models.base import utcnow


class SmashPassStat(Base):
    __tablename__ = "smash_pass_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    character_slug: Mapped[str] = mapped_column(String(100), index=True)
    character_name: Mapped[str] = mapped_column(String(150), index=True)
    role: Mapped[str] = mapped_column(String(20), default="Survivor")  # "Killer" | "Survivor"
    gender: Mapped[str] = mapped_column(String(20), default="female")  # "female" | "male" | "monster_other"
    edition: Mapped[str] = mapped_column(String(50), default="canon", index=True)  # "canon" | "hooked_on_you" | "legendary_cosplay" | "custom"
    smash_count: Mapped[int] = mapped_column(Integer, default=0)
    pass_count: Mapped[int] = mapped_column(Integer, default=0)
    super_smash_count: Mapped[int] = mapped_column(Integer, default=0)
    total_votes: Mapped[int] = mapped_column(Integer, default=0)
    smash_rate: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    def calculate_rate(self) -> float:
        total = self.smash_count + self.pass_count + self.super_smash_count
        self.total_votes = total
        if total == 0:
            self.smash_rate = 0.0
        else:
            positive_votes = self.smash_count + self.super_smash_count
            self.smash_rate = round((positive_votes / total) * 100.0, 1)
        return self.smash_rate

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "character_slug": self.character_slug,
            "character_name": self.character_name,
            "role": self.role,
            "gender": self.gender,
            "edition": self.edition,
            "smash_count": self.smash_count,
            "pass_count": self.pass_count,
            "super_smash_count": self.super_smash_count,
            "total_votes": self.total_votes,
            "smash_rate": self.smash_rate,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class SmashPassVote(Base):
    __tablename__ = "smash_pass_votes"

    id: Mapped[int] = mapped_column(primary_key=True)
    character_slug: Mapped[str] = mapped_column(String(100), index=True)
    vote_type: Mapped[str] = mapped_column(String(20))  # "smash" | "pass" | "super_smash"
    edition: Mapped[str] = mapped_column(String(50), default="canon", index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "character_slug": self.character_slug,
            "vote_type": self.vote_type,
            "edition": self.edition,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
