# backend/app/services/db/import_upserts.py
"""Generic row upserts shared by the import modules."""
import logging
from collections.abc import Callable
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models.tier_list import TierList
from app.services.db.asset_bundling import write_asset_base64
from app.services.db.serializers import TIER_LIST_FIELDS
from app.services.tier_list_service import validate_tier_list

logger = logging.getLogger(__name__)


def upsert_entity(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    name: str,
    model: type,
    unique_field: str,
    update_fields: list[str],
    defaults: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
) -> None:
    """Upsert rows keyed by a natural text field.

    Used only by the community and settings tables -- community builds keyed by
    title, custom perks by name, guesser stats by `guesser_type`, challenge
    modes by `mode`. Those are user-authored rows with no curated id space, and
    their "natural key" really is the text.

    Static content does NOT come through here: it is addressed by primary key
    in `upsert_by_id`.
    """
    if name not in target_keys or name not in data:
        return

    created = updated = 0
    for row in data[name]:
        key_val = row.get(unique_field)
        if not key_val:
            continue
        if isinstance(key_val, str):
            key_val = key_val.strip()

        obj = db.session.scalar(select(model).where(getattr(model, unique_field) == key_val))
        if not obj:
            extra = defaults(row) if defaults else {}
            obj = model(**{unique_field: key_val}, **extra)
            db.session.add(obj)
            created += 1
        else:
            updated += 1

        for field in update_fields:
            if field in row:
                setattr(obj, field, row[field])

    db.session.flush()
    summary[name] = {"created": created, "updated": updated}


def upsert_by_id(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    name: str,
    model: type,
    update_fields: list[str],
    defaults: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
    post_process: Callable[[Any, dict[str, Any]], None] | None = None,
    asset_fields: list[str] | None = None,
    static_dir: Path | None = None,
) -> None:
    """Upsert every row in `data[name]` into `model`, keyed by primary key.

    The row's `id` is the only thing consulted to decide which database row it
    is. No name comparison, no case-insensitive fallback, no slug lookup: seed
    files and backups carry explicit ids, foreign keys in them are integers,
    and a row whose id is absent is a new row inserted at that id.

    This replaces a lookup that ran `lower(trim(name)) = ?` once per row --
    935 sequential full scans for the add-on file alone, since no index can
    serve a function over a column.

    A row with no `id` is rejected rather than guessed at, and counted in the
    summary as `skipped`; that only happens for payloads written before the
    export carried ids, which `backend/scripts/normalize_static_export.py`
    converts.
    """
    if name not in target_keys or name not in data:
        return

    created = updated = skipped = 0
    for row in data[name]:
        row_id = row.get("id")
        if not isinstance(row_id, int):
            skipped += 1
            continue

        obj = db.session.get(model, row_id)
        if obj is None:
            extra = defaults(row) if defaults else {}
            obj = model(id=row_id, **extra)
            db.session.add(obj)
            created += 1
        else:
            updated += 1

        for field in update_fields:
            if field in row:
                setattr(obj, field, row[field])

        if post_process:
            post_process(obj, row)

        if asset_fields and static_dir is not None:
            for field in asset_fields:
                write_asset_base64(static_dir, row.get(field), row.get(f"{field}_data"))

    db.session.flush()
    summary[name] = {"created": created, "updated": updated}
    if skipped:
        summary[name]["skipped_without_id"] = skipped
        logger.warning(
            "[import] %d %s row(s) had no id and were skipped -- regenerate the "
            "payload with backend/scripts/normalize_static_export.py",
            skipped, name,
        )


def import_tier_lists(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
) -> None:
    """Upsert official tier lists by id, one savepoint per row.

    Unlike the scraped catalog, these rows are written by hand, so a typo is
    the expected failure -- a bad slug, an unknown tier color, a custom list
    with no items. Such a row is rejected by the model's validators and
    skipped with a warning; it must not roll back the rest of the seed
    (at first boot every seed file is imported as one payload).
    """
    if "tier_lists" not in target_keys or "tier_lists" not in data:
        return

    created = updated = rejected = 0
    for row in data["tier_lists"]:
        row_id = row.get("id")
        if not isinstance(row_id, int):
            rejected += 1
            logger.warning("[import] tier_lists row without an integer id skipped: %r", row.get("slug"))
            continue

        savepoint = db.session.begin_nested()
        try:
            obj = db.session.get(TierList, row_id)
            is_new = obj is None
            if is_new:
                obj = TierList(id=row_id)
                db.session.add(obj)
            for field in TIER_LIST_FIELDS:
                # Absent optional keys mean NULL, exactly as in the other seed
                # files -- so removing `default_placements` from a row clears it.
                setattr(obj, field, row.get(field, _TIER_LIST_DEFAULTS.get(field)))
            validate_tier_list(obj)
            db.session.flush()
            savepoint.commit()
            created += int(is_new)
            updated += int(not is_new)
        except Exception as row_err:
            savepoint.rollback()
            rejected += 1
            logger.warning("[import] tier_lists row %s (%r) rejected: %s", row_id, row.get("slug"), row_err)

    summary["tier_lists"] = {"created": created, "updated": updated}
    if rejected:
        summary["tier_lists"]["rejected"] = rejected


_TIER_LIST_DEFAULTS: dict[str, Any] = {
    "description": "",
    "is_featured": False,
    "is_active": True,
    "sort_order": 0,
}
