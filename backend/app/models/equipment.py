# backend/app/models/equipment.py
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship

from app.core.extensions import Base

if TYPE_CHECKING:
    from app.models.character import Killer
    from app.models.map import Realm

#: Every rarity that appears across items, add-ons and offerings. The scraper
#: leaked four raw Unreal enum values into `addons.rarity`
#: (`EItemRarity::Common`, `EItemRarity::Rare`, `EItemRarity::SpecialEvent`);
#: they are folded into their display equivalents and a CHECK constraint now
#: stops the next scrape from reintroducing them.
RARITIES = ("Common", "Uncommon", "Rare", "Very Rare", "Ultra Rare", "Special", "Event")

_RARITY_SQL = "('Common', 'Uncommon', 'Rare', 'Very Rare', 'Ultra Rare', 'Special', 'Event')"

#: Roles an offering can be used by.
OFFERING_ROLES = ("Survivor", "Killer", "All")


class ItemCategory(Base):
    """A class of survivor item -- Flashlight, Med-Kit, Toolbox, Key, Map, ...

    This table is what makes `addons.associated_target` tractable. That column
    mixed two unrelated kinds of reference in one string: 44 of its 52 distinct
    values were killer names ("The Trapper"), and the rest were item classes,
    spelled in the plural ("Flashlights") while `items.category` spelled the
    same class in the singular ("Flashlight"). Nothing could join them.

    `name` is the singular form the item table used; `addon_target_label` is the
    plural form the add-on table used. Both are kept so the existing API
    responses are byte-identical, and neither is a join key any more.
    """

    __tablename__ = "item_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    addon_target_label: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="Survivor", nullable=False)

    items: Mapped[list["Item"]] = relationship(back_populates="category")
    addons: Mapped[list["ItemAddon"]] = relationship(back_populates="item_category")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "addon_target_label": self.addon_target_label,
            "role": self.role,
        }


class Item(Base):
    """A survivor item. `category` is now a foreign key, `role` comes from it.

    `category_id` is NOT NULL: all 58 items resolve to one of the nine classes.
    """

    __tablename__ = "items"
    __table_args__ = (
        CheckConstraint(f"rarity IS NULL OR rarity IN {_RARITY_SQL}", name="ck_items_rarity"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("item_categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rarity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    translations: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )

    category: Mapped["ItemCategory"] = relationship(back_populates="items", lazy="joined")

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
            "category_id": self.category_id,
            "category": self.category.name if self.category else "",
            "role": self.category.role if self.category else "Survivor",
            "description": description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "rarity": self.rarity or "",
            "translations": self.translations or {},
        }


class _AddonMixin:
    """Everything a killer add-on and an item add-on genuinely have in common.

    A mixin, not a base table. `addons` was one table with two nullable foreign
    keys and a CHECK that only one was ever set -- the honest shape for "points
    at one of two tables", but it left `item_category_id` null on all 880
    killer add-ons and `killer_id` null on all 51 item ones, and neither key
    could be NOT NULL where it belonged. One table per owner makes both keys
    mandatory, which is what they actually are.
    """

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rarity: Mapped[str | None] = mapped_column(String(50), nullable=True)

    @declared_attr
    def translations(cls) -> Mapped[dict[str, Any] | None]:
        return mapped_column(
            JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
        )

    #: "Killer" or "Survivor" -- which side of the trial the add-on is for.
    #: A constant per table rather than a derived read of which key is null.
    category: str = ""

    #: What the old `associated_target` column held: a killer's name, or an
    #: item class's plural label.
    @property
    def associated_target(self) -> str:
        raise NotImplementedError

    def _base_dict(self, lang: str | None = None) -> dict[str, Any]:
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
            "associated_target": self.associated_target,
            "category": self.category,
            "description": description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "rarity": self.rarity or "",
            "translations": self.translations or {},
        }


class KillerAddon(Base, _AddonMixin):
    """An add-on for a killer's power. 880 rows, exactly 20 per killer."""

    __tablename__ = "killer_addons"
    __table_args__ = (
        CheckConstraint(
            f"rarity IS NULL OR rarity IN {_RARITY_SQL}", name="ck_killer_addons_rarity"
        ),
        Index("ix_killer_addons_killer_rarity", "killer_id", "rarity"),
    )

    category = "Killer"

    # NOT NULL: an add-on in this table is an add-on for a killer. It could
    # only be nullable while the 51 item add-ons shared the table.
    killer_id: Mapped[int] = mapped_column(
        ForeignKey("killers.id", ondelete="CASCADE"), nullable=False, index=True
    )

    killer: Mapped["Killer"] = relationship(back_populates="addons", lazy="joined")

    @property
    def associated_target(self) -> str:
        return self.killer.name if self.killer else ""

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        data = self._base_dict(lang)
        data["killer_id"] = self.killer_id
        # Still on the wire, always null, because a killer add-on is not an
        # item add-on -- and because the combined `/addons` response mixes both
        # tables and clients read one shape.
        data["item_category_id"] = None
        return data


class ItemAddon(Base, _AddonMixin):
    """An add-on for a class of survivor item. 51 rows across 7 classes."""

    __tablename__ = "item_addons"
    __table_args__ = (
        CheckConstraint(
            f"rarity IS NULL OR rarity IN {_RARITY_SQL}", name="ck_item_addons_rarity"
        ),
        Index("ix_item_addons_category_rarity", "item_category_id", "rarity"),
    )

    category = "Survivor"

    item_category_id: Mapped[int] = mapped_column(
        ForeignKey("item_categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    item_category: Mapped["ItemCategory"] = relationship(
        back_populates="addons", lazy="joined"
    )

    @property
    def associated_target(self) -> str:
        return self.item_category.addon_target_label if self.item_category else ""

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        data = self._base_dict(lang)
        data["killer_id"] = None
        data["item_category_id"] = self.item_category_id
        return data


class Offering(Base):
    """A burnable offering.

    `category` used to be a stored copy of the wiki section an offering was
    scraped from ("SurvivorOfferings" / "KillerOfferings" /
    "CommonOfferings"). It restated `role` and contradicted it in six rows --
    Petrified Oak, a survivor offering, sat under "KillerOfferings"; Hollow
    Shell, a killer bloodpoint offering, sat under "CommonOfferings". `role` is
    authoritative and `category` is derived from it, so the two can no longer
    disagree.

    `realm_id` is new: 16 of the 96 offerings force a specific realm, which was
    only discoverable by substring-searching the description text.
    """

    __tablename__ = "offerings"
    __table_args__ = (
        CheckConstraint("role IN ('Survivor', 'Killer', 'All')", name="ck_offerings_role"),
        CheckConstraint(f"rarity IS NULL OR rarity IN {_RARITY_SQL}", name="ck_offerings_rarity"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="All", nullable=False, index=True)
    realm_id: Mapped[int | None] = mapped_column(
        ForeignKey("realms.id", ondelete="SET NULL"), nullable=True, index=True
    )
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rarity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    translations: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )

    realm: Mapped["Realm | None"] = relationship(back_populates="offerings", lazy="joined")

    @property
    def category(self) -> str:
        """The legacy wiki-section label, derived from `role`."""
        if self.role == "Survivor":
            return "SurvivorOfferings"
        if self.role == "Killer":
            return "KillerOfferings"
        return "CommonOfferings"

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
            "realm_id": self.realm_id,
            "description": description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "rarity": self.rarity or "",
            "translations": self.translations or {},
        }
