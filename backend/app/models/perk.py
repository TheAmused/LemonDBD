# backend/app/models/perk.py
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.core.extensions import Base
from app.models.perk_types import DEFAULT_PERK_TYPES, validate_perk_types

if TYPE_CHECKING:
    from app.models.character import Killer, Survivor


class Perk(Base):
    """A perk, optionally taught by a character.

    This was already the one properly normalized relation in the static
    content: `character_id` is a real foreign key, all 294 character perks
    resolve, and the remaining 27 are general perks with a NULL owner. The only
    changes here are a CHECK on `category` and an index that supports the
    "this character's three perks" lookup directly. Perks have no `slug`:
    nothing references a perk row by name, and `user_perk_ownership` already
    points at `perks.id`.

    `alternate_name` / `is_generic_counterpart` stay as they are. Nine perks
    carry a second name used when the licensed character who teaches them is
    not owned (Decisive Strike / Will to Live). That is one perk with two
    labels, not two perks, so a column is the right shape.
    """

    __tablename__ = "perks"
    __table_args__ = (
        CheckConstraint("role IN ('Survivor', 'Killer')", name="ck_perks_role"),
        # A perk belongs to one character at most, and that character is on the
        # side its role names. Both halves are enforced, so a killer perk can
        # never acquire a survivor owner.
        CheckConstraint(
            "(survivor_id IS NULL OR killer_id IS NULL) AND "
            "(role = 'Survivor' OR survivor_id IS NULL) AND "
            "(role = 'Killer' OR killer_id IS NULL)",
            name="ck_perks_single_owner_matches_role",
        ),
        Index("ix_perks_survivor_role", "survivor_id", "role"),
        Index("ix_perks_killer_role", "killer_id", "role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    alternate_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    is_generic_counterpart: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_teachable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    #: "Survivor" or "Killer". Not derivable from the owner columns: 27 general
    #: perks have no character at all and still belong to a side.
    role: Mapped[str] = mapped_column(String(20), default="Survivor", nullable=False, index=True)
    is_disabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    disabled_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    translations: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )
    #: What the perk is for -- the single source of truth for Chaos Mutator
    #: weighting, the Tarot Deck card assignment and the Classic Perk Guesser.
    #: An ordered list of 1-3 of: hex, boon, sacrifice, exhaustion, obsession,
    #: aura, generator, healing, chase, stealth, entity, hooks. The first entry
    #: is the primary type (the Tarot card); `entity` is the catch-all and only
    #: appears alone. The rules are the pydantic ones in `app.models.perk_types`.
    #: A JSON array cannot carry a portable CHECK on its elements (SQLite and
    #: Postgres spell the JSON functions differently), so they are enforced on
    #: assignment below and by `app.schemas.perk.PerkBase` on the way in.
    perk_types: Mapped[list[str]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        default=lambda: list(DEFAULT_PERK_TYPES),
        nullable=False,
    )

    # One nullable key per table, at most one set, matching `role`. The 27
    # general perks leave both NULL.
    survivor_id: Mapped[int | None] = mapped_column(
        ForeignKey("survivors.id", ondelete="SET NULL"), nullable=True, index=True
    )
    killer_id: Mapped[int | None] = mapped_column(
        ForeignKey("killers.id", ondelete="SET NULL"), nullable=True, index=True
    )

    survivor: Mapped["Survivor | None"] = relationship(back_populates="perks")
    killer: Mapped["Killer | None"] = relationship(back_populates="perks")

    @validates("perk_types")
    def _validate_perk_types(self, _key: str, value: object) -> list[str]:
        return validate_perk_types(value)

    @property
    def resolved_perk_types(self) -> list[str]:
        """`perk_types` as a fresh list; a perk not flushed yet reads as `['entity']`."""
        return list(self.perk_types or DEFAULT_PERK_TYPES)

    @property
    def primary_perk_type(self) -> str:
        """The first entry of `perk_types` -- the Tarot card this perk is drawn as."""
        return self.resolved_perk_types[0]

    @property
    def character(self) -> "Survivor | Killer | None":
        """Whichever owner is set. Read-only; assign `survivor` or `killer`."""
        return self.survivor or self.killer

    @property
    def character_id(self) -> int | None:
        """The owner's id *within its role's table*.

        Ambiguous on its own now -- survivor 7 and killer 7 both exist -- so
        `to_dict` emits it next to `role`, and callers key on the pair.
        """
        owner = self.character
        return owner.id if owner else None

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        owner = self.character
        char_name = "General"
        char_real = "General"
        char_avatar = ""
        if owner:
            char_name = owner.localized(lang, "name", owner.name)
            char_real = owner.real_name or char_name
            char_avatar = owner.avatar_local_path or ""

        name = self.name
        description = self.description
        if lang and self.translations and lang in self.translations:
            trans = self.translations.get(lang) or {}
            if isinstance(trans, dict):
                name = trans.get("name") or name
                description = trans.get("description") or description

        return {
            "id": self.id,
            "name": name,
            "alternate_name": self.alternate_name or "",
            "is_generic_counterpart": self.is_generic_counterpart,
            "is_teachable": self.is_teachable,
            "category": self.role,
            "role": self.role,
            "character": char_name,
            "character_real_name": char_real,
            "character_avatar_path": char_avatar or "",
            "character_id": self.character_id,
            "survivor_id": self.survivor_id,
            "killer_id": self.killer_id,
            "description": description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "perk_types": self.resolved_perk_types,
            "translations": self.translations or {},
            "is_disabled": self.is_disabled,
            "disabled_reason": self.disabled_reason,
        }
