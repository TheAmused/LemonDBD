# backend/app/services/tier_list_service.py
"""Reads for the official tier-list templates.

Read-only on purpose: rows arrive through the one seeder
(`seeds/data/content/tier_lists.json` -> `DatabaseExportImportService`), and a
user's own ranking never leaves their browser.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models.tier_list import TierList


def validate_tier_list(tier_list: TierList) -> None:
    """Cross-field rules the column validators cannot see one field at a time.

    Called by the importer after every field of a row has been assigned.
    """
    if tier_list.kind == "custom":
        if not tier_list.custom_items:
            raise ValueError(f"Custom tier list {tier_list.slug!r} has no custom_items")
        if tier_list.item_ids:
            raise ValueError(f"Custom tier list {tier_list.slug!r} cannot filter by item_ids")
    elif tier_list.custom_items:
        raise ValueError(
            f"Tier list {tier_list.slug!r} ranks {tier_list.kind!r} and cannot carry custom_items"
        )

    if tier_list.default_placements:
        tier_ids = {str(t.get("id")) for t in (tier_list.tiers or [])} or {"s", "a", "b", "c", "d", "f"}
        unknown = set(tier_list.default_placements) - tier_ids
        if unknown:
            raise ValueError(
                f"Tier list {tier_list.slug!r} places items in unknown tiers: {sorted(unknown)}"
            )


def list_tier_lists(lang: str | None = None) -> list[dict[str, Any]]:
    """Every active template, featured first, then by the curated order."""
    rows = db.session.scalars(
        select(TierList)
        .where(TierList.is_active.is_(True))
        .order_by(TierList.is_featured.desc(), TierList.sort_order, TierList.id)
    ).all()
    return [row.to_summary_dict(lang) for row in rows]


def get_tier_list(slug: str, lang: str | None = None) -> dict[str, Any] | None:
    """One active template by slug, or None. An inactive list is a 404, not a 403:
    retiring a list should look exactly like it never existed."""
    normalized = (slug or "").strip().lower()
    if not normalized:
        return None
    row = db.session.scalar(
        select(TierList).where(TierList.slug == normalized, TierList.is_active.is_(True))
    )
    return row.to_dict(lang) if row else None
