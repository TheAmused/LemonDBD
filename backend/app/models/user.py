# backend/app/models/user.py
from datetime import datetime
from typing import TYPE_CHECKING, Any, cast
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
from app.models.base import ColumnDictMixin, column_dict, utcnow

if TYPE_CHECKING:
    from app.models.character import Killer, Survivor
    from app.models.community import BugReport
    from app.models.perk import Perk
    from app.models.two_factor import UserRecoveryCode, UserTwoFactor


class User(Base, ColumnDictMixin):
    __tablename__ = "users"
    __table_args__ = (
        # A permanent ban and a running suspension are mutually exclusive copies of the sanctions
        # (see services/moderation_actions.recompute_user_state).
        CheckConstraint(
            "is_active OR suspended_until IS NULL", name="ck_users_ban_excludes_suspension"
        ),
    )

    _api_exclude = frozenset({
        "password_hash",
        "verification_code",
        "verification_code_expires_at",
        "verification_attempts",
        "reset_token",
        "reset_token_expires_at",
        "token_version",
        "google_sub",
    })

    id: Mapped[int] = mapped_column(primary_key=True)
    login: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(
        String(120), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_sub: Mapped[str | None] = mapped_column(
        String(64), unique=True, index=True, nullable=True
    )
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    avatar_url: Mapped[str] = mapped_column(
        String(255), default="default_avatar", nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    # End of the longest active suspension (None: not suspended). Past values are stale, not live:
    # read it through app.core.account_state, never directly.
    suspended_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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
    # Bumped whenever the credentials change (password change / reset): every session token
    # carries the version it was issued under and is refused once it no longer matches.
    token_version: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
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
    # Reports outlive the account (FK is SET NULL); delete_own_account anonymizes them.
    bug_reports: Mapped[list["BugReport"]] = relationship(
        back_populates="user", cascade="save-update, merge"
    )
    showcase: Mapped["UserShowcase | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    # Optional 2FA (app/models/two_factor.py): lazy-loaded, only touched by the 2FA service and
    # by cascade on deletion.
    two_factor: Mapped["UserTwoFactor | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    recovery_codes: Mapped[list["UserRecoveryCode"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def two_factor_enabled(self) -> bool:
        try:
            from app.services.user.two_factor import is_enabled

            return is_enabled(self.id) if self.id is not None else False
        except Exception:
            return False

    @property
    def has_password(self) -> bool:
        return bool(self.password_hash)

    @property
    def google_linked(self) -> bool:
        return self.google_sub is not None

    def to_dict(self, include_sensitive: bool = False) -> dict[str, Any]:
        data = cast(dict[str, Any], column_dict(self, self._api_exclude))
        data["has_password"] = self.has_password
        data["google_linked"] = self.google_linked
        if include_sensitive:
            data["password_hash"] = self.password_hash
        return data


class UserCharacterOwnership(Base, ColumnDictMixin):
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
        data = super().to_dict()
        character = self.character
        data["character_id"] = character.id if character else None
        data["character_role"] = character.role if character else None
        data["character_name"] = character.name if character else None
        data.pop("created_at", None)
        return data


class UserPerkOwnership(Base, ColumnDictMixin):
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
        data = super().to_dict()
        data["perk_name"] = self.perk.name if self.perk else None
        data["perk_category"] = self.perk.role if self.perk else None
        data.pop("created_at", None)
        return data


#: Shown when a user has not picked a main yet. These were the column
#: defaults, back when the main was stored as a name string.
DEFAULT_SURVIVOR_MAIN = "Feng Min"
DEFAULT_KILLER_MAIN = "The Blight"

#: The choices the profile page offers. Mirrors `PLAYER_TITLES` and `GRADE_EMBLEMS` in
#: frontend/src/types/userShowcase.ts (a unit test keeps the two in step); anything else is ignored.
SHOWCASE_PLAYER_TITLES: tuple[str, ...] = ("Survivor", "Killer")
SHOWCASE_GRADE_RANKS: tuple[str, ...] = (
    "Iridescent I", "Iridescent II", "Gold I", "Silver I", "Bronze I", "Ash I", "Ash IV",
)
#: One set of defaults for the model, the read fallback and the client (`DEFAULT_SHOWCASE_STATE`).
SHOWCASE_DEFAULT_TITLE = "Survivor"
SHOWCASE_DEFAULT_GRADE = "Ash IV"
SHOWCASE_DEFAULT_DEVOTION = 0
SHOWCASE_DEFAULT_PRESTIGE = 0
SHOWCASE_MAX_DEVOTION = 99
SHOWCASE_MAX_PRESTIGE = 100


class UserShowcase(Base):
    __tablename__ = "user_showcases"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    player_title: Mapped[str] = mapped_column(String(100), default=SHOWCASE_DEFAULT_TITLE, nullable=False)
    devotion_level: Mapped[int] = mapped_column(Integer, default=SHOWCASE_DEFAULT_DEVOTION, nullable=False)
    grade_rank: Mapped[str] = mapped_column(String(50), default=SHOWCASE_DEFAULT_GRADE, nullable=False)
    # Was a free-text character name that nothing validated and a rename would
    # have silently orphaned. Each side has exactly one table to point at now.
    survivor_main_id: Mapped[int | None] = mapped_column(
        ForeignKey("survivors.id", ondelete="SET NULL"), nullable=True, index=True
    )
    survivor_main_prestige: Mapped[int] = mapped_column(Integer, default=SHOWCASE_DEFAULT_PRESTIGE, nullable=False)
    survivor_perk_ids: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    killer_main_id: Mapped[int | None] = mapped_column(
        ForeignKey("killers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    killer_main_prestige: Mapped[int] = mapped_column(Integer, default=SHOWCASE_DEFAULT_PRESTIGE, nullable=False)
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

