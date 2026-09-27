# backend/app/models/tier_list.py
"""Official tier lists -- the templates the /tier-lists hub offers.

A row is a *template*, not somebody's ranking: it says what is being ranked
(`kind` + optionally a subset of `item_ids`, or a hand-authored
`custom_items` list), which tiers exist, and -- optionally -- an official
LemonDBD ranking to start from (`default_placements`). Users' own rankings
never reach the server; the frontend keeps them in localStorage keyed by
`slug`, which is why the slug is the stable public identity of a row and
may never be recycled for a different list.

The five built-in lists (survivor perks, killer perks, survivors, killers,
maps) are ordinary rows seeded from `seeds/data/content/tier_lists.json`, so a
new themed list is one more seed row and no code change.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.core.extensions import Base
from app.models.base import JSON_DICT, JSON_LIST, utcnow

#: What a list ranks. Everything but `custom` is resolved against the live
#: catalog on the client, so a new perk or killer appears in its list the day
#: it is seeded. `custom` lists carry their own items.
TIER_LIST_KINDS = (
    "survivor_perks",
    "killer_perks",
    "survivors",
    "killers",
    "maps",
    "custom",
)

#: Slugs the frontend uses as static route segments next to `[slug]`
#: (`/tier-lists/custom/<id>`, `/tier-lists/new`). A row with one of these
#: would be unreachable.
RESERVED_SLUGS = frozenset({"custom", "new", "import", "shared"})

SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

#: Named tier colors the frontend maps onto `--color-tier-*` theme tokens.
#: Anything else must be a `#rrggbb` hex.
TIER_COLOR_TOKENS = frozenset({"s", "a", "b", "c", "d", "e", "f", "neutral"})
HEX_COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")


def _localized(translations: dict[str, Any] | None, lang: str | None) -> dict[str, Any]:
    if not lang or not translations:
        return {}
    entry = translations.get(lang)
    return entry if isinstance(entry, dict) else {}


class TierList(Base):
    __tablename__ = "tier_lists"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('survivor_perks', 'killer_perks', 'survivors', 'killers', 'maps', 'custom')",
            name="ck_tier_lists_kind",
        ),
        # Deliberately no CHECK tying `custom_items` to `kind`: a JSONB column
        # assigned Python None stores JSON `null`, which is NOT SQL NULL, so
        # `custom_items IS NULL` would reject every catalog list written by an
        # import that carries the key. `service.validate_tier_list()` enforces
        # the pairing instead, where both values are Python objects.
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    #: `[{"id": "s", "label": "S", "color": "s" | "#ff7f7f"}, ...]`, top tier
    #: first. NULL means the frontend's default S/A/B/C/D/F ladder.
    tiers: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON_LIST, nullable=True)
    #: Integer ids into the table `kind` names -- restricts the pool to a
    #: subset of the catalog. NULL means the whole catalog.
    item_ids: Mapped[list[int] | None] = mapped_column(JSON_LIST, nullable=True)
    #: `kind = 'custom'` only: `[{"id", "name", "image_url"?, "image_local_path"?}]`.
    custom_items: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON_LIST, nullable=True)
    #: Optional official ranking: `{"<tier id>": ["<item key>", ...]}`, where an
    #: item key is `perk:12`, `survivor:7`, `killer:7`, `map:31` or a custom
    #: item's own id. The list opens pre-ranked and "Reset" returns here.
    default_placements: Mapped[dict[str, list[str]] | None] = mapped_column(JSON_DICT, nullable=True)
    #: `{lang: {"title", "description", "tiers": {tier_id: label}, "items": {item_id: name}}}`
    translations: Mapped[dict[str, Any] | None] = mapped_column(JSON_DICT, nullable=True)

    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    # ------------------------------------------------------------------
    # Validation. Seed files are hand-edited, so a typo should fail the
    # import of that row loudly rather than ship a list the UI cannot draw.
    # ------------------------------------------------------------------

    @validates("slug")
    def _validate_slug(self, _key: str, value: str) -> str:
        slug = (value or "").strip().lower()
        if not SLUG_PATTERN.match(slug) or len(slug) > 80:
            raise ValueError(f"Invalid tier list slug: {value!r}")
        if slug in RESERVED_SLUGS:
            raise ValueError(f"Tier list slug {slug!r} is reserved by a frontend route")
        return slug

    @validates("kind")
    def _validate_kind(self, _key: str, value: str) -> str:
        if value not in TIER_LIST_KINDS:
            raise ValueError(f"Invalid tier list kind: {value!r}")
        return value

    @validates("tiers")
    def _validate_tiers(self, _key: str, value: list[dict[str, Any]] | None) -> list[dict[str, Any]] | None:
        if value is None:
            return None
        if not isinstance(value, list) or not 1 <= len(value) <= 20:
            raise ValueError("A tier list needs between 1 and 20 tiers")
        seen: set[str] = set()
        for tier in value:
            tier_id = str(tier.get("id") or "").strip() if isinstance(tier, dict) else ""
            if not tier_id or tier_id in seen:
                raise ValueError(f"Tier ids must be present and unique: {tier!r}")
            seen.add(tier_id)
            color = tier.get("color")
            if color is not None and color not in TIER_COLOR_TOKENS and not HEX_COLOR_PATTERN.match(str(color)):
                raise ValueError(f"Tier color must be a token or #rrggbb: {color!r}")
        return value

    @validates("custom_items")
    def _validate_custom_items(
        self, _key: str, value: list[dict[str, Any]] | None
    ) -> list[dict[str, Any]] | None:
        if value is None:
            return None
        if not isinstance(value, list):
            raise ValueError("custom_items must be a list")
        seen: set[str] = set()
        for item in value:
            item_id = str(item.get("id") or "").strip() if isinstance(item, dict) else ""
            if not item_id or item_id in seen or not item.get("name"):
                raise ValueError(f"Custom items need a unique id and a name: {item!r}")
            seen.add(item_id)
        return value

    # ------------------------------------------------------------------
    # API shapes
    # ------------------------------------------------------------------

    def _localized_tiers(self, lang: str | None) -> list[dict[str, Any]] | None:
        if self.tiers is None:
            return None
        labels = _localized(self.translations, lang).get("tiers") or {}
        return [
            {
                "id": str(t.get("id")),
                "label": str(labels.get(str(t.get("id"))) or t.get("label") or t.get("id")),
                "color": t.get("color"),
            }
            for t in self.tiers
        ]

    def _localized_items(self, lang: str | None) -> list[dict[str, Any]] | None:
        if self.custom_items is None:
            return None
        names = _localized(self.translations, lang).get("items") or {}
        return [
            {
                "id": str(item.get("id")),
                "name": str(names.get(str(item.get("id"))) or item.get("name")),
                "image_url": item.get("image_url") or "",
                "image_local_path": item.get("image_local_path") or "",
            }
            for item in self.custom_items
        ]

    def item_count(self) -> int | None:
        """How many things the list ranks, when that is knowable server-side.

        A catalog list without `item_ids` ranks "everything of that kind", a
        number only the live catalog knows -- None, and the hub leaves it out.
        """
        if self.custom_items is not None:
            return len(self.custom_items)
        if self.item_ids is not None:
            return len(self.item_ids)
        return None

    def to_summary_dict(self, lang: str | None = None) -> dict[str, Any]:
        """The hub card: everything but the item payloads."""
        trans = _localized(self.translations, lang)
        return {
            "id": self.id,
            "slug": self.slug,
            "kind": self.kind,
            "title": trans.get("title") or self.title,
            "description": trans.get("description") or self.description or "",
            "cover_image_url": self.cover_image_url or "",
            "is_featured": bool(self.is_featured),
            "sort_order": self.sort_order,
            "item_count": self.item_count(),
            "tier_count": len(self.tiers) if self.tiers is not None else None,
            "has_default_placements": bool(self.default_placements),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        """The full template the builder page renders."""
        return {
            **self.to_summary_dict(lang),
            "tiers": self._localized_tiers(lang),
            "item_ids": list(self.item_ids) if self.item_ids is not None else None,
            "custom_items": self._localized_items(lang),
            "default_placements": dict(self.default_placements) if self.default_placements else None,
        }
