# backend/app/models/perk.py
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional
from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow

if TYPE_CHECKING:
    from app.models.character import Character


class Perk(Base):
    __tablename__ = "perks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    alternate_name: Mapped[Optional[str]] = mapped_column(
        String(150), nullable=True
    )
    is_generic_counterpart: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    is_teachable: Mapped[bool] = mapped_column(Boolean, default=True)
    category: Mapped[str] = mapped_column(String(20), default="Survivor")
    is_disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    disabled_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    translations: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )

    character_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("characters.id", ondelete="SET NULL"), nullable=True
    )
    character: Mapped[Optional["Character"]] = relationship(
        back_populates="perks"
    )

    def to_dict(self, lang: Optional[str] = None) -> dict:
        char_name = "General"
        char_real = "General"
        char_avatar = ""
        if self.character:
            c_dict = self.character.to_dict(lang=lang)
            char_name = c_dict.get("name") or self.character.name
            char_real = c_dict.get("real_name") or self.character.real_name or char_name
            char_avatar = self.character.avatar_local_path or ""

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
            "category": self.category,
            "character": char_name,
            "character_real_name": char_real,
            "character_avatar_path": char_avatar or "",
            "character_id": self.character_id,
            "description": description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "translations": self.translations or {},
            "is_disabled": self.is_disabled,
            "disabled_reason": self.disabled_reason,
        }


class PerkRule(Base):
    __tablename__ = "perk_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    slot1_type: Mapped[str] = mapped_column(
        String(50), default="character_own"
    )
    slot2_type: Mapped[str] = mapped_column(
        String(50), default="character_own"
    )
    slot3_type: Mapped[str] = mapped_column(
        String(50), default="general_role"
    )
    slot4_type: Mapped[str] = mapped_column(String(50), default="any_role")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "is_default": self.is_default,
            "slot1_type": self.slot1_type,
            "slot2_type": self.slot2_type,
            "slot3_type": self.slot3_type,
            "slot4_type": self.slot4_type,
            "created_at": self.created_at.isoformat()
            if self.created_at
            else None,
        }

