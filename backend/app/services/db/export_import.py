# backend/app/services/db/export_import.py
"""JSON export, backup and restore for every LemonDBD database entity.

`DatabaseExportImportService` is the public entry point. The work lives in sibling modules:
`export_registry` (what exists), `export_writer` (building the document), `import_upserts`
(generic row upserts), and `import_content` / `import_accounts` / `import_community`
(one per area of the schema).

Keys in an import payload that no importer knows are ignored. That includes `draft_sessions`:
its importer was removed with the `DraftSession` model it referenced, so such a payload now
imports cleanly instead of failing with a `NameError`.
"""
import logging
from typing import Any

from sqlalchemy import delete

from app.core.extensions import db
from app.core.redis_cache import bump_catalog_version
from app.models.map import MapRealm, Realm
from app.models.smash_or_pass import Entity, EntityStat, Roster, Vote
from app.models.user import UserCharacterOwnership, UserPerkOwnership
from app.services.db.asset_bundling import get_static_dir
from app.services.db.export_registry import SIMPLE_DELETE_TARGETS, SUPPORTED_EXPORT_TARGETS, TARGET_GROUPS
from app.services.db.export_writer import build_export
from app.services.db.import_accounts import (
    build_account_lookups, import_ownerships, import_user_showcases, import_users,
)
from app.services.db.import_community import import_community
from app.services.db.import_content import import_content

logger = logging.getLogger(__name__)

__all__ = ["DatabaseExportImportService", "SUPPORTED_EXPORT_TARGETS", "TARGET_GROUPS", "get_static_dir"]


def _clear_for_replace(target_keys: set[str]) -> None:
    """Delete the rows `replace` mode is about to rewrite (children before parents)."""
    if "ownerships" in target_keys:
        db.session.execute(delete(UserCharacterOwnership))
        db.session.execute(delete(UserPerkOwnership))
    if "maps" in target_keys:
        db.session.execute(delete(MapRealm))
    if "maps" in target_keys or "realms" in target_keys:
        db.session.execute(delete(Realm))
    if "rosters" in target_keys:
        db.session.execute(delete(Vote))
        db.session.execute(delete(EntityStat))
        db.session.execute(delete(Entity))
        db.session.execute(delete(Roster))
    for key, model in SIMPLE_DELETE_TARGETS:
        if key in target_keys:
            db.session.execute(delete(model))
    db.session.flush()


def _flatten_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Entities from the grouped format, the flat `data` format, or the bare root payload."""
    data: dict[str, Any] = {}
    if "groups" in payload and isinstance(payload["groups"], dict):
        for group_dict in payload["groups"].values():
            if isinstance(group_dict, dict):
                data.update(group_dict)
    if "data" in payload and isinstance(payload["data"], dict):
        data.update(payload["data"])
    if not data:
        data = payload
    return data


class DatabaseExportImportService:
    """
    Handles JSON-based export, backup, and restore operations across all LemonDBD database entities.
    Supports atomic execution, merge upserts, full table replacements, and foreign key resolution.
    """

    @classmethod
    def export_database(cls, targets: list[str] | None = None, include_assets: bool = True) -> dict[str, Any]:
        target_set: set[str] = set(targets) if targets else set(SUPPORTED_EXPORT_TARGETS)
        return build_export(target_set, include_assets, get_static_dir())

    @classmethod
    def import_database(
        cls,
        payload: dict[str, Any],
        mode: str = "merge",
        targets: list[str] | None = None,
    ) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise ValueError("Invalid JSON payload: root must be an object.")

        data = _flatten_payload(payload)
        target_keys = set(targets) if targets else set(data.keys())
        summary: dict[str, dict[str, int]] = {}
        static_dir = get_static_dir()

        try:
            if mode == "replace":
                _clear_for_replace(target_keys)

            import_content(data, target_keys, summary, static_dir)
            import_users(data, target_keys, summary, static_dir)
            lookups = build_account_lookups()
            import_ownerships(data, target_keys, summary, lookups)
            import_user_showcases(data, target_keys, summary, lookups)
            import_community(data, target_keys, summary, lookups.user_map)

            db.session.commit()

            try:
                from app.routes.perks import perk_service
                perk_service.reload_data()
            except Exception as reload_err:
                logger.debug(f"PerkService reload_data notice during import: {reload_err}")

            # After the commit, so nothing can repopulate the cache from the
            # pre-import state between the bump and the write landing.
            bump_catalog_version()

            return {
                "status": "success",
                "message": f"Database import completed ({mode} mode).",
                "mode": mode,
                "summary": summary,
            }

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error during database import: {e}", exc_info=True)
            raise e
