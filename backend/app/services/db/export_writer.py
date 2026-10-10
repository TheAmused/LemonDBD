# backend/app/services/db/export_writer.py
"""Builds the JSON document `DatabaseExportImportService.export_database` returns."""
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models.chaos import ChaosMatchLog, ChaosRun
from app.models.gauntlet import GauntletMatchLog, GauntletRun
from app.models.history import HistoryMatchLog, HistoryRun
from app.models.map import MapRealm, Realm
from app.models.page_streak import PageStreakPageLog, PageStreakRun
from app.models.smash_or_pass import Roster
from app.models.user import User, UserCharacterOwnership, UserPerkOwnership, UserShowcase
from app.services.db.asset_bundling import read_asset_base64
from app.services.db.export_registry import SIMPLE_EXPORT_TARGETS, TARGET_GROUPS
from app.services.db.run_family_export import export_run_family
from app.services.db.serializers import serialize_realm, serialize_roster, serialize_user_showcase


def with_asset(row: dict[str, Any], path_field: str, static_dir: Path, include_assets: bool) -> None:
    """Mutates `row` in place, adding `<path_field>_data` (base64 or None) when
    `include_assets` is true and `row[path_field]` is a real path."""
    if not include_assets:
        return
    container, _, leaf = path_field.rpartition(".")
    holder = row
    if container:
        for step in container.split("."):
            holder = holder.get(step) if isinstance(holder, dict) else None
            if not isinstance(holder, dict):
                return
    holder[f"{leaf}_data"] = read_asset_base64(static_dir, holder.get(leaf) or None)


def export_entity(
    export_data: dict[str, Any],
    counts: dict[str, int],
    name: str,
    model: type,
    serializer: Callable[[Any], dict[str, Any]],
    asset_fields: list[str] | None = None,
    static_dir: Path | None = None,
    include_assets: bool = True,
) -> None:
    """Select every row of `model` (ordered by id), serialize it, and record it under
    `name`. When `asset_fields` is given, each listed field (e.g. "icon_local_path")
    gets a sibling "<field>_data" base64 payload read from `static_dir`."""
    rows = db.session.scalars(select(model).order_by(model.id)).all()
    serialized = [serializer(r) for r in rows]
    if asset_fields and static_dir is not None:
        for row in serialized:
            for field in asset_fields:
                with_asset(row, field, static_dir, include_assets)
    export_data[name] = serialized
    counts[name] = len(serialized)


def _export_maps(
    export_data: dict[str, Any], counts: dict[str, int], static_dir: Path, include_assets: bool,
) -> None:
    realms = db.session.scalars(select(MapRealm).order_by(MapRealm.id)).all()
    map_list = []
    for r in realms:
        map_list.append({
            "id": r.id,
            "name": r.name,
            "realm_id": r.realm_id,
            "source_id": r.source_id,
            "description": r.description,
            # `image_url` is not exported: it held a byte-identical
            # copy of `callout_image_url` on all 58 rows. `source` and
            # `source_label` are read through `source_id`.
            "callout_image_url": r.callout_image_url,
            "callout_image_local_path": r.callout_image_local_path,
            "translations": r.translations or {},
        })
    for row in map_list:
        with_asset(row, "callout_image_local_path", static_dir, include_assets)
    export_data["maps"] = map_list
    counts["maps"] = len(map_list)


def _export_ownerships(export_data: dict[str, Any], counts: dict[str, int]) -> None:
    char_owns = db.session.scalars(select(UserCharacterOwnership)).all()
    perk_owns = db.session.scalars(select(UserPerkOwnership)).all()
    export_data["ownerships"] = {
        "characters": [
            {
                "username": co.user.username if co.user else None,
                "character_name": co.character.name if co.character else None,
                # Names are unique across both tables, so the role is
                # not needed to resolve the row -- it is exported so a
                # reader does not have to know that to trust the file.
                "character_role": co.character.role if co.character else None,
                "is_owned": co.is_owned,
            }
            for co in char_owns
            if co.user and co.character
        ],
        "perks": [
            {
                "username": po.user.username if po.user else None,
                "perk_name": po.perk.name if po.perk else None,
                "is_unlocked": po.is_unlocked,
            }
            for po in perk_owns
            if po.user and po.perk
        ],
    }
    counts["character_ownerships"] = len(export_data["ownerships"]["characters"])
    counts["perk_ownerships"] = len(export_data["ownerships"]["perks"])


def build_export(target_set: set[str], include_assets: bool, static_dir: Path) -> dict[str, Any]:
    """Serialize the entities named in `target_set` into the grouped export envelope."""
    export_data: dict[str, Any] = {}
    counts: dict[str, int] = {}

    for name, model, serializer, asset_fields in SIMPLE_EXPORT_TARGETS:
        if name in target_set:
            export_entity(export_data, counts, name, model, serializer, asset_fields, static_dir, include_assets)

    if "maps" in target_set:
        _export_maps(export_data, counts, static_dir, include_assets)

    if "maps" in target_set or "realms" in target_set:
        export_entity(export_data, counts, "realms", Realm, serialize_realm, ["image_local_path"], static_dir, include_assets)

    if "ownerships" in target_set:
        _export_ownerships(export_data, counts)

    if "user_showcases" in target_set:
        showcases = [sc for sc in db.session.scalars(select(UserShowcase)).all() if sc.user]
        export_data["user_showcases"] = [serialize_user_showcase(sc) for sc in showcases]
        counts["user_showcases"] = len(export_data["user_showcases"])

    if "gauntlet_runs" in target_set:
        export_run_family(export_data, counts, "gauntlet_runs", GauntletRun, GauntletMatchLog, "match_logs")
    if "chaos_runs" in target_set:
        export_run_family(export_data, counts, "chaos_runs", ChaosRun, ChaosMatchLog, "match_logs")
    if "history_runs" in target_set:
        export_run_family(export_data, counts, "history_runs", HistoryRun, HistoryMatchLog, "match_logs")
    if "page_streak_runs" in target_set:
        export_run_family(export_data, counts, "page_streak_runs", PageStreakRun, PageStreakPageLog, "page_logs")

    if "rosters" in target_set:
        username_by_user_id = {u.id: u.username for u in db.session.scalars(select(User)).all()}
        rosters = db.session.scalars(select(Roster).order_by(Roster.id)).all()
        export_data["rosters"] = [serialize_roster(r, username_by_user_id) for r in rosters]
        counts["rosters"] = len(export_data["rosters"])

    # Organize export into semantic groups
    grouped_data: dict[str, dict[str, Any]] = {}
    for group_name, entities in TARGET_GROUPS.items():
        group_slice = {k: export_data[k] for k in entities if k in export_data}
        if group_slice:
            grouped_data[group_name] = group_slice

    return {
        "version": "1.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "source": "LemonDBD",
        "counts": counts,
        "groups": grouped_data,
    }
