# backend/app/models/equipment.py
from typing import Any, Dict, Optional
from sqlalchemy import JSON, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(50), default="")
    role: Mapped[str] = mapped_column(String(20), default="Survivor")
    description: Mapped[str] = mapped_column(Text, default="")
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    rarity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    translations: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )

    def to_dict(self, lang: Optional[str] = None) -> dict:
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
            "category": self.category,
            "role": self.role,
            "description": description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "rarity": self.rarity or "",
            "translations": self.translations or {},
        }


class Addon(Base):
    __tablename__ = "addons"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    associated_target: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    category: Mapped[str] = mapped_column(String(50), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    rarity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    translations: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )

    def to_dict(self, lang: Optional[str] = None) -> dict:
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
            "associated_target": self.associated_target or "",
            "category": self.category,
            "description": description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "rarity": self.rarity or "",
            "translations": self.translations or {},
        }

