# backend/app/models/equipment.py
from typing import Any
from sqlalchemy import JSON, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="", nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="Survivor", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rarity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    translations: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        canonical_name = self.name
        name = canonical_name
        description = self.description
        if lang and self.translations and lang in self.translations:
            trans = self.translations.get(lang) or {}
            if isinstance(trans, dict):
                name = trans.get("name") or name
                description = trans.get("description") or description

        return {
            "id": self.id,
            "name": name,
            "raw_name": canonical_name,
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
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    associated_target: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(50), default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rarity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    translations: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        canonical_name = self.name
        name = canonical_name
        description = self.description
        if lang and self.translations and lang in self.translations:
            trans = self.translations.get(lang) or {}
            if isinstance(trans, dict):
                name = trans.get("name") or name
                description = trans.get("description") or description

        return {
            "id": self.id,
            "name": name,
            "raw_name": canonical_name,
            "associated_target": self.associated_target or "",
            "category": self.category,
            "description": description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "rarity": self.rarity or "",
            "translations": self.translations or {},
        }


class Offering(Base):
    __tablename__ = "offerings"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="Offering", nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="All", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rarity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    translations: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        canonical_name = self.name
        name = canonical_name
        description = self.description
        if lang and self.translations and lang in self.translations:
            trans = self.translations.get(lang) or {}
            if isinstance(trans, dict):
                name = trans.get("name") or name
                description = trans.get("description") or description

        return {
            "id": self.id,
            "name": name,
            "raw_name": canonical_name,
            "category": self.category,
            "role": self.role,
            "description": description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "rarity": self.rarity or "",
            "translations": self.translations or {},
        }
