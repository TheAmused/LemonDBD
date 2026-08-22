# backend/app/models/character.py
import json
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import JSON, Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base

if TYPE_CHECKING:
    from app.models.perk import Perk


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(20))
    code_prefix: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True
    )
    portrait_url: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    real_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    short_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    wiki_slug: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    avatar_local_path: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    release_number: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    chapter_name: Mapped[Optional[str]] = mapped_column(
        String(150), nullable=True
    )
    chapter_number: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    dlc_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_licensed: Mapped[Optional[bool]] = mapped_column(
        Boolean, default=False, nullable=True
    )
    is_disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    disabled_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    release_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    release_date: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    dlc_counterparts: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lore: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    power_name: Mapped[Optional[str]] = mapped_column(
        String(150), nullable=True
    )
    power_description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    power_icon_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    movement_speed: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    terror_radius: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    terror_radius_meters: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    height: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    translations: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )

    perks: Mapped[List["Perk"]] = relationship(
        back_populates="character", cascade="all, delete-orphan"
    )

    __mapper_args__ = {
        "polymorphic_on": "role",
        "polymorphic_identity": "Character",
    }

    def to_dict(self, lang: Optional[str] = None) -> dict:
        counterparts = []
        if self.dlc_counterparts:
            try:
                if self.dlc_counterparts.strip().startswith("["):
                    counterparts = json.loads(self.dlc_counterparts)
                else:
                    counterparts = [
                        x.strip()
                        for x in self.dlc_counterparts.split(",")
                        if x.strip()
                    ]
            except Exception:
                counterparts = []

        name = self.name
        lore = self.lore or ""
        chapter_name = self.chapter_name or "Base Game"
        power_name = self.power_name or ""
        power_desc = self.power_description or ""

        if lang and self.translations and lang in self.translations:
            trans = self.translations.get(lang) or {}
            if isinstance(trans, dict):
                name = trans.get("name") or name
                lore = trans.get("lore") or lore
                chapter_name = trans.get("chapter_name") or chapter_name
                power_name = trans.get("power_name") or power_name
                power_desc = trans.get("power_description") or power_desc

        data = {
            "id": self.id,
            "name": name,
            "role": self.role,
            "category": self.role,
            "code_prefix": self.code_prefix,
            "portrait_url": self.portrait_url,
            "real_name": self.real_name or self.name,
            "short_name": self.short_name or self.name.lower().replace(" ", "_"),
            "wiki_slug": self.wiki_slug or self.name.lower().replace(" ", "_"),
            "avatar_url": self.portrait_url or "",
            "avatar_local_path": self.avatar_local_path or "",
            "release_number": self.release_number,
            "chapter_name": chapter_name,
            "chapter_number": self.chapter_number or "",
            "dlc_type": self.dlc_type or "original_chapter",
            "is_licensed": bool(self.is_licensed),
            "is_disabled": bool(self.is_disabled),
            "disabled_reason": self.disabled_reason,
            "release_year": self.release_year or 2016,
            "release_date": self.release_date or "",
            "dlc_counterparts": counterparts,
            "lore": lore,
            "translations": self.translations or {},
        }

        if self.role == "Killer" or self.power_name:
            p_clean = (
                self.power_name.lower()
                .replace(" ", "_")
                .replace("'", "")
                .replace("-", "_")
                if self.power_name
                else ""
            )
            data["power"] = {
                "name": power_name,
                "description": power_desc,
                "icon_url": self.power_icon_url or "",
                "icon_local_path": f"icons/powers/{p_clean}.png"
                if p_clean
                else "",
                "movement_speed": self.movement_speed or "4.6 m/s (115%)",
                "terror_radius": self.terror_radius or "32 m",
                "terror_radius_meters": self.terror_radius_meters or 32,
                "height": self.height or "Tall",
            }
        return data


class Survivor(Character):
    __mapper_args__ = {
        "polymorphic_identity": "Survivor",
    }


class Killer(Character):
    __mapper_args__ = {
        "polymorphic_identity": "Killer",
    }

