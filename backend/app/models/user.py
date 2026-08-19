# backend/app/models/user.py
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow

if TYPE_CHECKING:
    from app.models.character import Character
    from app.models.community import BugReport
    from app.models.perk import Perk


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(120), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    avatar_url: Mapped[str] = mapped_column(
        String(255), default="default_avatar"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    character_ownerships: Mapped[List["UserCharacterOwnership"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    perk_ownerships: Mapped[List["UserPerkOwnership"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    bug_reports: Mapped[List["BugReport"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def to_dict(self, include_sensitive: bool = False) -> dict:
        data = {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "avatar_url": self.avatar_url,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat()
            if self.created_at
            else None,
            "updated_at": self.updated_at.isoformat()
            if self.updated_at
            else None,
        }
        if include_sensitive:
            data["password_hash"] = self.password_hash
        return data


class UserCharacterOwnership(Base):
    __tablename__ = "user_character_ownerships"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "character_id", name="uq_user_character_ownership"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    character_id: Mapped[int] = mapped_column(
        ForeignKey("characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_owned: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    user: Mapped["User"] = relationship(back_populates="character_ownerships")
    character: Mapped["Character"] = relationship()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "character_id": self.character_id,
            "character_name": self.character.name if self.character else None,
            "character_role": self.character.role if self.character else None,
            "is_owned": self.is_owned,
            "updated_at": self.updated_at.isoformat()
            if self.updated_at
            else None,
        }


class UserPerkOwnership(Base):
    __tablename__ = "user_perk_ownerships"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "perk_id", name="uq_user_perk_ownership"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    perk_id: Mapped[int] = mapped_column(
        ForeignKey("perks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    is_unlocked: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    user: Mapped["User"] = relationship(back_populates="perk_ownerships")
    perk: Mapped["Perk"] = relationship()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "perk_id": self.perk_id,
            "perk_name": self.perk.name if self.perk else None,
            "perk_category": self.perk.category if self.perk else None,
            "is_unlocked": self.is_unlocked,
            "updated_at": self.updated_at.isoformat()
            if self.updated_at
            else None,
        }

