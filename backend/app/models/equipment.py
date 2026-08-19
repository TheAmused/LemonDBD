from typing import Optional
from sqlalchemy import String, Text
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

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "role": self.role,
            "description": self.description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "rarity": self.rarity or "",
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

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "associated_target": self.associated_target or "",
            "category": self.category,
            "description": self.description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "rarity": self.rarity or "",
        }

