# backend/app/models/user.py
from datetime import datetime
from typing import TYPE_CHECKING, Any
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow

if TYPE_CHECKING:
    from app.models.character import Killer, Survivor
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
        String(255), default="default_avatar", nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    verification_code: Mapped[str | None] = mapped_column(
        String(6), nullable=True
    )
    verification_code_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verification_attempts: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    reset_token: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    reset_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    preferred_language: Mapped[str | None] = mapped_column(
        String(5), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    # lazy="select" (the default) on purpose: nothing in the codebase reads
    # user.character_ownerships / user.perk_ownerships directly -- ownership
    # data is fetched separately via direct UserCharacterOwnership /
    # UserPerkOwnership queries (see app/services/ownership/). These
    # relationships exist only so cascade="all, delete-orphan" can clean up
    # on user deletion. eager-loading them (lazy="selectin", plus each row's
    # own lazy="joined" Character/Perk) meant every select(User) anywhere in
    # the app -- every login, every /auth/me check, every registration's
    # duplicate check -- paid for a full join across every owned perk and
    # character for that user on every request, for data nobody used.
    character_ownerships: Mapped[list["UserCharacterOwnership"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    perk_ownerships: Mapped[list["UserPerkOwnership"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    bug_reports: Mapped[list["BugReport"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    showcase: Mapped["UserShowcase | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    def to_dict(self, include_sensitive: bool = False) -> dict[str, Any]:
        data: dict[str, Any] = {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "avatar_url": self.avatar_url,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "onboarding_completed_at": self.onboarding_completed_at.isoformat() if self.onboarding_completed_at else None,
            "preferred_language": self.preferred_language,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_sensitive:
            data["password_hash"] = self.password_hash
        return data


class UserCharacterOwnership(Base):
    """Which characters a user owns.

    `character_id` pointed at one `characters` table. With survivors and
    killers numbered separately it takes one nullable key per table, exactly
    one of them set -- and the uniqueness that stopped a user owning the same
    character twice becomes one partial-safe constraint per side.
    """

    __tablename__ = "user_character_ownerships"
    __table_args__ = (
        UniqueConstraint("user_id", "survivor_id", name="uq_user_survivor_ownership"),
        UniqueConstraint("user_id", "killer_id", name="uq_user_killer_ownership"),
        CheckConstraint(
            "(survivor_id IS NULL) <> (killer_id IS NULL)",
            name="ck_user_character_ownership_one_side",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    survivor_id: Mapped[int | None] = mapped_column(
        ForeignKey("survivors.id", ondelete="CASCADE"), nullable=True, index=True
    )
    killer_id: Mapped[int | None] = mapped_column(
        ForeignKey("killers.id", ondelete="CASCADE"), nullable=True, index=True
    )
    is_owned: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="character_ownerships")
    survivor: Mapped["Survivor | None"] = relationship(lazy="joined")
    killer: Mapped["Killer | None"] = relationship(lazy="joined")

    @property
    def character(self) -> "Survivor | Killer | None":
        """Whichever side is set."""
        return self.survivor or self.killer

    def to_dict(self) -> dict[str, Any]:
        character = self.character
        return {
            "id": self.id,
            "user_id": self.user_id,
            # Scoped to the role: survivor 7 and killer 7 are different rows.
            "character_id": character.id if character else None,
            "character_role": character.role if character else None,
            "survivor_id": self.survivor_id,
            "killer_id": self.killer_id,
            "character_name": character.name if character else None,
            "is_owned": self.is_owned,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class UserPerkOwnership(Base):
    __tablename__ = "user_perk_ownerships"
    __table_args__ = (
        UniqueConstraint("user_id", "perk_id", name="uq_user_perk_ownership"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    perk_id: Mapped[int] = mapped_column(
        ForeignKey("perks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    is_unlocked: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="perk_ownerships")
    perk: Mapped["Perk"] = relationship(lazy="joined")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "perk_id": self.perk_id,
            "perk_name": self.perk.name if self.perk else None,
            "perk_category": self.perk.role if self.perk else None,
            "is_unlocked": self.is_unlocked,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


#: Shown when a user has not picked a main yet. These were the column
#: defaults, back when the main was stored as a name string.
DEFAULT_SURVIVOR_MAIN = "Feng Min"
DEFAULT_KILLER_MAIN = "The Blight"


class UserShowcase(Base):
    __tablename__ = "user_showcases"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    player_title: Mapped[str] = mapped_column(String(100), default="The Camper", nullable=False)
    devotion_level: Mapped[int] = mapped_column(Integer, default=14, nullable=False)
    grade_rank: Mapped[str] = mapped_column(String(50), default="Iridescent I", nullable=False)
    # Was a free-text character name that nothing validated and a rename would
    # have silently orphaned. Each side has exactly one table to point at now.
    survivor_main_id: Mapped[int | None] = mapped_column(
        ForeignKey("survivors.id", ondelete="SET NULL"), nullable=True, index=True
    )
    survivor_main_prestige: Mapped[int] = mapped_column(Integer, default=9, nullable=False)
    survivor_perk_ids: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    killer_main_id: Mapped[int | None] = mapped_column(
        ForeignKey("killers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    killer_main_prestige: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    killer_perk_ids: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="showcase")
    survivor_main: Mapped["Survivor | None"] = relationship(lazy="joined")
    killer_main: Mapped["Killer | None"] = relationship(lazy="joined")

    def to_dict(self) -> dict[str, Any]:
        s_perks = list(self.survivor_perk_ids) if isinstance(self.survivor_perk_ids, list) else []
        while len(s_perks) < 4:
            s_perks.append(None)
        k_perks = list(self.killer_perk_ids) if isinstance(self.killer_perk_ids, list) else []
        while len(k_perks) < 4:
            k_perks.append(None)

        return {
            "player_title": self.player_title,
            "devotion_level": self.devotion_level,
            "grade_rank": self.grade_rank,
            # `character_name` is still on the wire, read through the key
            # instead of stored next to it, so a rename can no longer strand a
            # showcase. `character_id` is new and is what clients should send.
            "survivor_main": {
                "character_id": self.survivor_main_id,
                "character_name": (
                    self.survivor_main.name if self.survivor_main else DEFAULT_SURVIVOR_MAIN
                ),
                "prestige": self.survivor_main_prestige,
                "perk_ids": s_perks[:4],
            },
            "killer_main": {
                "character_id": self.killer_main_id,
                "character_name": (
                    self.killer_main.name if self.killer_main else DEFAULT_KILLER_MAIN
                ),
                "prestige": self.killer_main_prestige,
                "perk_ids": k_perks[:4],
            },
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

