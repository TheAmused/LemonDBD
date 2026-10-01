# backend/app/services/tier_list_service.py
"""Reads for the official tier-list templates, plus the one write path: an
admin hand-authoring a new one from the "Official?" checkbox in the creator.

Every other row arrives through the seeder
(`seeds/data/content/tier_lists.json` -> `DatabaseExportImportService`), and a
user's own ranking never leaves their browser. An admin-created list is the
exception on both counts: it is written directly (`create_tier_list`), and it
is then folded back into that same seed file (`_rewrite_seed_file`) so a
future reseed does not forget it -- the file becomes generated output for
this table, never hand-edited.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select

from app.core.extensions import db
from app.core.redis_cache import bump_catalog_version
from app.models.slug import slugify, unique_slug
from app.models.tier_list import RESERVED_SLUGS, TierList
from app.services.db.serializers import serialize_tier_list

logger = logging.getLogger(__name__)


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


def _new_slug(title: str) -> str:
    """`"Best Chase Music!"` -> `"best-chase-music"`, matching `TierList`'s own
    `SLUG_PATTERN` exactly, made unique against reserved and existing slugs."""
    base = slugify(title, sep="-", fold_unicode=False, strip_symbols=False, max_len=80, fallback="tier-list")
    return unique_slug(
        base,
        lambda c: db.session.scalar(select(TierList.id).where(TierList.slug == c)),
        reserved=RESERVED_SLUGS,
    )


def create_tier_list(
    *,
    title: str,
    description: str,
    cover_image_url: str | None,
    tiers: list[dict[str, Any]],
    custom_items: list[dict[str, Any]],
) -> TierList:
    """An admin-authored official list: `kind='custom'`, its own tiers and
    items (exactly what the creator already builds for a personal list), but
    published immediately for everyone -- never auto-featured, so it starts
    at the end of the hub's curated order rather than jumping the queue.

    Raises `ValueError` for anything `TierList`'s own column validators or
    `validate_tier_list()`'s cross-field rules reject (a bad color, a
    duplicate tier id, no items at all) -- the route turns that into a 400.
    """
    slug = _new_slug(title)
    next_sort_order = (db.session.scalar(select(func.max(TierList.sort_order))) or 0) + 10

    row = TierList(
        slug=slug,
        kind="custom",
        title=title.strip(),
        description=description.strip(),
        cover_image_url=cover_image_url,
        tiers=tiers,
        custom_items=custom_items,
        is_featured=False,
        is_active=True,
        sort_order=next_sort_order,
    )
    validate_tier_list(row)

    db.session.add(row)
    db.session.commit()

    # Everything below is best-effort follow-up to a write that already
    # succeeded: the row is live and served either way, so neither step
    # rolls it back or fails the request if it stumbles.
    bump_catalog_version()
    _rewrite_seed_file()
    return row


def _rewrite_seed_file() -> None:
    """Regenerates `seeds/data/content/tier_lists.json` from the live table.

    Every row, not just the new one: this file is generated output for this
    table now, the same way an export dump is, so it can never drift from
    what a fresh reseed would actually load. A write failure (read-only
    filesystem, full disk) is logged, not raised -- the DB row this follows
    is already committed and is what the running app serves.
    """
    # Imported here, not at module load: static_db_seeder -> export_import ->
    # this module, so importing it back at the top would be a cycle.
    from app.seeds.static_db_seeder import SEEDS_DATA_DIR

    rows = db.session.scalars(select(TierList).order_by(TierList.id)).all()
    payload = {
        "version": "3.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "source": "LemonDBD",
        "target": "tier_lists",
        "count": len(rows),
        "tier_lists": [serialize_tier_list(row) for row in rows],
    }
    path = SEEDS_DATA_DIR / "content" / "tier_lists.json"
    try:
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    except OSError as err:
        logger.error("[tier_list_service] Failed to rewrite tier_lists seed file: %s", err)
