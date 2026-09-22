# backend/app/services/db/export_import.py
import logging
from collections.abc import Callable
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import delete, func, select
from app.core.extensions import db
from app.core.json_provider import safe_json_dumps
from app.core.redis_cache import bump_catalog_version
from app.models.character import Killer, Survivor
from app.models.perk import Perk
from app.models.equipment import Item, ItemAddon, ItemCategory, KillerAddon, Offering
from app.models.chapter import Chapter
from app.services.db.parsing import parse_movement_speed, parse_release_date
from app.models.map import MapRealm, MapSource, Realm
from app.models.user import User, UserCharacterOwnership, UserPerkOwnership, UserShowcase
from app.models.community import BugReport
from app.models.admin import ChallengeModeSetting, AdminAuditLog
from app.models.changelog import ChangelogPost
from app.models.gauntlet import GauntletRun, GauntletMatchLog
from app.models.chaos import ChaosRun, ChaosMatchLog
from app.models.history import HistoryRun, HistoryMatchLog
from app.models.page_streak import PageStreakRun, PageStreakPageLog
from app.services.db.run_family_export import export_run_family, import_run_family
from app.models.smash_or_pass import Roster, Entity, EntityStat, Vote
from app.services.db.asset_bundling import get_static_dir, read_asset_base64, write_asset_base64
from app.services.db.serializers import (
    serialize_survivor, serialize_killer, serialize_perk, serialize_item,
    serialize_item_category,
    serialize_killer_addon, serialize_item_addon, serialize_realm, serialize_offering,
    serialize_chapter, serialize_user,
    serialize_user_showcase, serialize_admin_audit_log, serialize_changelog_post,
    serialize_smash_entity, serialize_roster,
)

logger = logging.getLogger(__name__)

TARGET_GROUPS: dict[str, list[str]] = {
    "content": [
        "chapters",
        "realms",
        "item_categories",
        "map_sources",
        "survivors",
        "killers",
        "perks",
        "items",
        "killer_addons",
        "item_addons",
        "offerings",
        "maps",
    ],
    "users": [
        "users",
        "ownerships",
        "user_showcases",
    ],
    "community": [
        "bug_reports",
        "changelog_posts",
        "gauntlet_runs",
        "chaos_runs",
        "history_runs",
        "page_streak_runs",
        "rosters",
    ],
    "settings": [
        "challenge_mode_settings",
        "admin_audit_logs",
    ],
}

SUPPORTED_EXPORT_TARGETS = [
    target for targets in TARGET_GROUPS.values() for target in targets
]

#: Entity columns an import may set, matching `serialize_smash_entity`. The
#: profile half of this list used to travel as one `metadata_json` blob.
#: `slug` is the natural key and is never reassigned here.
SMASH_ENTITY_FIELDS = [
    "name",
    "real_name",
    "role",
    "gender",
    "media_url",
    "media_type",
    "watermark_left",
    "watermark_right",
    "archetype",
    "bio",
    "tagline",
    "quote",
    "meme",
    "turn_on",
    "dealbreaker",
    "dating_vibe",
    "red_flags",
    "green_flags",
    "chapter",
    "danger_level",
    "chaos_score",
    "translations",
    "order_index",
    "is_active",
]



def _parse_datetime(val: str | datetime | None) -> datetime | None:
    if not val:
        return None
    try:
        if isinstance(val, datetime):
            return val
        clean = val.replace("Z", "+00:00")
        return datetime.fromisoformat(clean)
    except Exception:
        return None


def _with_asset(row: dict[str, Any], path_field: str, static_dir: Path, include_assets: bool) -> None:
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


def _export_entity(
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
                _with_asset(row, field, static_dir, include_assets)
    export_data[name] = serialized
    counts[name] = len(serialized)


# Entities whose export is "select all, serialize each row, store under one key" --
# no nested collections, no cross-entity joins beyond a single to-one lookup.
# The 4th tuple element lists which serialized fields hold a static-dir-relative
# image path and should get a base64 "<field>_data" sibling embedded.
_SIMPLE_EXPORT_TARGETS: list[tuple[str, type, Callable[[Any], dict[str, Any]], list[str]]] = [
    ("survivors", Survivor, serialize_survivor, ["avatar_local_path"]),
    ("killers", Killer, serialize_killer, ["avatar_local_path", "power_icon_local_path"]),
    ("perks", Perk, serialize_perk, ["icon_local_path"]),
    ("item_categories", ItemCategory, serialize_item_category, []),
    ("map_sources", MapSource, lambda s: {"id": s.id, "code": s.code, "label": s.label}, []),
    ("items", Item, serialize_item, ["icon_local_path"]),
    ("killer_addons", KillerAddon, serialize_killer_addon, ["icon_local_path"]),
    ("item_addons", ItemAddon, serialize_item_addon, ["icon_local_path"]),
    ("offerings", Offering, serialize_offering, ["icon_local_path"]),
    ("chapters", Chapter, serialize_chapter, ["banner_local_path"]),
    ("users", User, serialize_user, ["avatar_relative_path"]),
    ("bug_reports", BugReport, lambda r: r.to_dict(), []),
    ("challenge_mode_settings", ChallengeModeSetting, lambda cms: cms.to_dict(), []),
    ("admin_audit_logs", AdminAuditLog, serialize_admin_audit_log, []),
    ("changelog_posts", ChangelogPost, serialize_changelog_post, []),
]

# Entities whose deletion in "replace" mode is a single unconditional DELETE, gated
# only by their own target key. Order matters: perks must be cleared before
# characters (perk.character_id FK), mirroring the plan's original ordering.
_SIMPLE_DELETE_TARGETS: list[tuple[str, type]] = [
    ("bug_reports", BugReport),
    ("killer_addons", KillerAddon),
    ("item_addons", ItemAddon),
    ("offerings", Offering),
    ("items", Item),
    ("item_categories", ItemCategory),
    ("perks", Perk),
    ("survivors", Survivor),
    ("killers", Killer),
    ("chapters", Chapter),
    ("challenge_mode_settings", ChallengeModeSetting),
    ("user_showcases", UserShowcase),
    ("admin_audit_logs", AdminAuditLog),
    ("changelog_posts", ChangelogPost),
    ("gauntlet_runs", GauntletRun),
    ("chaos_runs", ChaosRun),
    ("history_runs", HistoryRun),
    ("page_streak_runs", PageStreakRun),
]


def _upsert_entity(
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
    in `_upsert_by_id`.
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


def _upsert_by_id(
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


class DatabaseExportImportService:
    """
    Handles JSON-based export, backup, and restore operations across all LemonDBD database entities.
    Supports atomic execution, merge upserts, full table replacements, and foreign key resolution.
    """

    @classmethod
    def export_database(cls, targets: list[str] | None = None, include_assets: bool = True) -> dict[str, Any]:
        target_set: set[str] = set(targets) if targets else set(SUPPORTED_EXPORT_TARGETS)
        export_data: dict[str, Any] = {}
        counts: dict[str, int] = {}
        static_dir = get_static_dir()

        for name, model, serializer, asset_fields in _SIMPLE_EXPORT_TARGETS:
            if name in target_set:
                _export_entity(export_data, counts, name, model, serializer, asset_fields, static_dir, include_assets)

        if "maps" in target_set:
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
                _with_asset(row, "callout_image_local_path", static_dir, include_assets)
            export_data["maps"] = map_list
            counts["maps"] = len(map_list)

        if "maps" in target_set or "realms" in target_set:
            _export_entity(export_data, counts, "realms", Realm, serialize_realm, ["image_local_path"], static_dir, include_assets)

        if "ownerships" in target_set:
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

    @classmethod
    def import_database(
        cls,
        payload: dict[str, Any],
        mode: str = "merge",
        targets: list[str] | None = None,
    ) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise ValueError("Invalid JSON payload: root must be an object.")

        # Extract entities from grouped format, flat 'data' format, or root payload
        data: dict[str, Any] = {}
        if "groups" in payload and isinstance(payload["groups"], dict):
            for group_dict in payload["groups"].values():
                if isinstance(group_dict, dict):
                    data.update(group_dict)
        if "data" in payload and isinstance(payload["data"], dict):
            data.update(payload["data"])
        if not data:
            data = payload

        target_keys = set(targets) if targets else set(data.keys())
        summary: dict[str, dict[str, int]] = {}
        static_dir = get_static_dir()

        try:
            if mode == "replace":
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
                for key, model in _SIMPLE_DELETE_TARGETS:
                    if key in target_keys:
                        db.session.execute(delete(model))
                db.session.flush()

            # ---------------------------------------------------------------
            # Static content, parents first.
            #
            # Every row is addressed by its own integer id, and every
            # cross-entity reference in the payload is an integer foreign key.
            # Parents still go first so the foreign keys they satisfy exist by
            # the time the children are flushed.
            #
            # The old order (characters -> perks -> items -> addons ->
            # offerings -> chapters -> maps -> realms) only worked because
            # nothing referenced anything: every link was a copied string.
            # ---------------------------------------------------------------

            def _release_date(chapter_obj: Chapter, row: dict[str, Any]) -> None:
                if "release_date" in row:
                    chapter_obj.release_date = parse_release_date(row.get("release_date"))

            _upsert_by_id(
                data, target_keys, summary, "chapters", Chapter,
                update_fields=[
                    "name", "release_year", "is_licensed", "dlc_type",
                    "banner_url", "banner_local_path", "translations",
                ],
                defaults=lambda row: {"name": row.get("name") or ""},
                post_process=_release_date,
                asset_fields=["banner_local_path"], static_dir=static_dir,
            )

            if "maps" in target_keys or "realms" in target_keys:
                # Gated by "maps" OR "realms" because an old backup may carry
                # realm banners only under the "maps" target.
                _upsert_by_id(
                    data, {"realms"}, summary, "realms", Realm,
                    update_fields=["name", "image_url", "image_local_path", "translations"],
                    defaults=lambda row: {"name": row.get("name") or ""},
                    asset_fields=["image_local_path"], static_dir=static_dir,
                )

            _upsert_by_id(
                data, target_keys, summary, "map_sources", MapSource,
                update_fields=["code", "label"],
                defaults=lambda row: {
                    "code": row.get("code") or "", "label": row.get("label") or "",
                },
            )

            _upsert_by_id(
                data, target_keys, summary, "item_categories", ItemCategory,
                update_fields=["name", "addon_target_label", "role"],
                defaults=lambda row: {
                    "name": row.get("name") or "",
                    "addon_target_label": row.get("addon_target_label") or row.get("name") or "",
                },
            )

            db.session.flush()

            _SHARED_CHARACTER_FIELDS = [
                "name", "chapter_id", "portrait_url", "real_name",
                "avatar_local_path", "is_disabled", "disabled_reason",
                "lore", "translations",
            ]

            def _character_defaults(row: dict[str, Any]) -> dict[str, Any]:
                return {
                    "name": row.get("name") or "",
                    "chapter_id": row.get("chapter_id"),
                }

            def _set_created_at(char_obj: Survivor | Killer, row: dict[str, Any]) -> None:
                if row.get("created_at"):
                    parsed_dt = _parse_datetime(row["created_at"])
                    if parsed_dt:
                        char_obj.created_at = parsed_dt

            _upsert_by_id(
                data, target_keys, summary, "survivors", Survivor,
                update_fields=_SHARED_CHARACTER_FIELDS,
                defaults=_character_defaults,
                post_process=_set_created_at,
                asset_fields=["avatar_local_path"], static_dir=static_dir,
            )

            def _decimal_speed(killer_obj: Killer, row: dict[str, Any]) -> None:
                """`movement_speed_ms` arrives as a string; the column is NUMERIC.

                Only the m/s figure is carried: the percentage the source
                printed beside it is ms / 4.0 * 100, the survivor baseline,
                exactly, for all 44 killers.
                """
                if "movement_speed_ms" not in row:
                    return
                value = row.get("movement_speed_ms")
                killer_obj.movement_speed_ms = (
                    Decimal(str(value)) if value not in (None, "") else None
                )

            def _killer_post_process(killer_obj: Killer, row: dict[str, Any]) -> None:
                _decimal_speed(killer_obj, row)
                _set_created_at(killer_obj, row)

            # The power columns are on this row now. They used to be a 1:1
            # `killer_profiles` child, nested one level deeper in the payload,
            # which existed only to keep them off the 54 survivors.
            _upsert_by_id(
                data, target_keys, summary, "killers", Killer,
                update_fields=_SHARED_CHARACTER_FIELDS + [
                    "power_name", "power_description", "power_icon_url",
                    "power_icon_local_path", "terror_radius",
                    "terror_radius_meters", "height",
                ],
                defaults=lambda row: {
                    **_character_defaults(row),
                    "power_name": row.get("power_name") or "",
                },
                post_process=_killer_post_process,
                asset_fields=["avatar_local_path", "power_icon_local_path"],
                static_dir=static_dir,
            )

            db.session.flush()

            def _perk_owner(perk_obj: Perk, row: dict[str, Any]) -> None:
                """Same rule as add-ons: at most one owner, absent means none.

                The 27 general perks have neither key, so the seed files carry
                neither, and `role` is what still places them on a side.
                """
                if "survivor_id" in row or "killer_id" in row:
                    perk_obj.survivor_id = row.get("survivor_id")
                    perk_obj.killer_id = row.get("killer_id")

            _upsert_by_id(
                data, target_keys, summary, "perks", Perk,
                post_process=_perk_owner,
                update_fields=[
                    "name", "survivor_id", "killer_id", "alternate_name",
                    "is_generic_counterpart", "is_teachable", "role",
                    "description", "icon_url", "icon_local_path", "translations",
                    "perk_type",
                ],
                defaults=lambda row: {
                    "name": row.get("name") or "",
                    # `category` is the pre-split spelling; an older backup
                    # still carries it.
                    "role": row.get("role") or row.get("category") or "Survivor",
                },
                asset_fields=["icon_local_path"], static_dir=static_dir,
            )

            _upsert_by_id(
                data, target_keys, summary, "items", Item,
                update_fields=[
                    "name", "category_id", "description", "icon_url",
                    "icon_local_path", "rarity", "translations",
                ],
                defaults=lambda row: {
                    "name": row.get("name") or "", "category_id": row.get("category_id"),
                },
                asset_fields=["icon_local_path"], static_dir=static_dir,
            )

            # One table per owner, each key NOT NULL, so there is no
            # exclusivity to police on the way in any more -- the table an
            # add-on lands in *is* which kind it is.
            _upsert_by_id(
                data, target_keys, summary, "killer_addons", KillerAddon,
                update_fields=[
                    "name", "killer_id", "description", "icon_url",
                    "icon_local_path", "rarity", "translations",
                ],
                defaults=lambda row: {
                    "name": row.get("name") or "", "killer_id": row.get("killer_id"),
                },
                asset_fields=["icon_local_path"], static_dir=static_dir,
            )

            _upsert_by_id(
                data, target_keys, summary, "item_addons", ItemAddon,
                update_fields=[
                    "name", "item_category_id", "description", "icon_url",
                    "icon_local_path", "rarity", "translations",
                ],
                defaults=lambda row: {
                    "name": row.get("name") or "",
                    "item_category_id": row.get("item_category_id"),
                },
                asset_fields=["icon_local_path"], static_dir=static_dir,
            )

            _upsert_by_id(
                data, target_keys, summary, "offerings", Offering,
                update_fields=[
                    "name", "role", "realm_id", "description", "icon_url",
                    "icon_local_path", "rarity", "translations",
                ],
                defaults=lambda row: {"name": row.get("name") or ""},
                asset_fields=["icon_local_path"], static_dir=static_dir,
            )

            if "maps" in target_keys and "maps" in data:
                created = updated = 0
                for mdata in data["maps"]:
                    # The primary key is the only identity a map has now.
                    # `map_id` -- `hens_autohaven_wreckers_azarovs_resting_place`
                    # -- spelled out the provider, the realm and the name, all
                    # three of which are columns on this row, and the tables
                    # that referenced it are gone. An older backup still
                    # carries it, and the name it held is matched as a
                    # fallback so such a backup still restores.
                    row_id = mdata.get("id")
                    map_obj = (
                        db.session.get(MapRealm, row_id) if isinstance(row_id, int) else None
                    )
                    if map_obj is None:
                        name = mdata.get("name") or mdata.get("map_id")
                        if not name:
                            continue
                        map_obj = db.session.scalar(
                            select(MapRealm).where(MapRealm.name == name)
                        )
                    if not map_obj:
                        map_obj = MapRealm(
                            name=mdata.get("name") or mdata.get("map_id"),
                            realm_id=mdata.get("realm_id"),
                            source_id=mdata.get("source_id"),
                        )
                        if isinstance(row_id, int):
                            map_obj.id = row_id
                        db.session.add(map_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in [
                        "name", "realm_id", "source_id", "description",
                        "callout_image_url", "callout_image_local_path", "translations",
                        "layout_type", "pallet_density", "jungle_gyms_count",
                        "is_shack", "is_main_building",
                        "size_sq_tiles", "size_sq_meters",
                    ]:
                        if k in mdata:
                            setattr(map_obj, k, mdata[k])

                    # `tiles` and `objectives` in an older backup are read
                    # and discarded: neither table exists. `map_objectives` was
                    # empty for all 58 maps, and the 290 `map_tiles` rows were
                    # five generic placeholder names copied onto every map,
                    # which the frontend's own utils/mapLandmarks.ts supersedes
                    # with real per-map callouts.

                    write_asset_base64(
                        static_dir,
                        mdata.get("callout_image_local_path"),
                        mdata.get("callout_image_local_path_data"),
                    )
                db.session.flush()
                summary["maps"] = {"created": created, "updated": updated}

            if "users" in target_keys and "users" in data:
                u_created, u_updated = 0, 0
                for row in data["users"]:
                    username = row.get("username")
                    if not username:
                        continue
                    user_obj = db.session.scalar(select(User).where(User.username == username))
                    candidate_email = row.get("email") or f"{username}@lemondbd.com"
                    email_conflict = db.session.scalar(
                        select(User).where(User.email == candidate_email, User.username != username)
                    )

                    if not user_obj:
                        final_email = candidate_email
                        if email_conflict:
                            final_email = f"{username}_{int(datetime.now(timezone.utc).timestamp())}@lemondbd.com"
                        user_obj = User(
                            username=username,
                            email=final_email,
                            password_hash=row.get("password_hash", ""),
                            role=row.get("role", "user"),
                            avatar_url=row.get("avatar_url", "default_avatar"),
                            is_active=row.get("is_active", True),
                            is_verified=row.get("is_verified", True if username in ("lemon", "user") else False),
                        )
                        db.session.add(user_obj)
                        u_created += 1
                    else:
                        if not email_conflict:
                            user_obj.email = candidate_email
                        for field in ["password_hash", "role", "avatar_url", "is_active", "is_verified"]:
                            if field in row and row[field] is not None:
                                setattr(user_obj, field, row[field])
                        if username in ("lemon", "user"):
                            user_obj.is_verified = True
                        u_updated += 1

                    if row.get("created_at"):
                        parsed_dt = _parse_datetime(row["created_at"])
                        if parsed_dt:
                            user_obj.created_at = parsed_dt

                    write_asset_base64(static_dir, row.get("avatar_relative_path"), row.get("avatar_relative_path_data"))

                db.session.flush()
                summary["users"] = {"created": u_created, "updated": u_updated}

            user_map: dict[str, int] = {u.username: u.id for u in db.session.scalars(select(User)).all()}
            perk_map: dict[str, int] = {p.name.strip().lower(): p.id for p in db.session.scalars(select(Perk)).all()}
            # Ownership rows name their character. An id alone would not
            # identify one any more -- survivor 7 and killer 7 both exist -- so
            # the map carries the side with it. `char_map` was referenced here
            # without ever being built, which made any ownerships import raise
            # NameError.
            char_map: dict[str, tuple[str, int]] = {
                **{s_.name.strip().lower(): ("Survivor", s_.id)
                   for s_ in db.session.scalars(select(Survivor)).all()},
                **{k_.name.strip().lower(): ("Killer", k_.id)
                   for k_ in db.session.scalars(select(Killer)).all()},
            }

            if "ownerships" in target_keys and "ownerships" in data:
                raw_owns = data["ownerships"]
                char_created, char_updated = 0, 0
                perk_created, perk_updated = 0, 0

                existing_char_owns: dict[tuple[int, str, int], UserCharacterOwnership] = {
                    (co.user_id, "Survivor" if co.survivor_id else "Killer",
                     co.survivor_id or co.killer_id): co
                    for co in db.session.scalars(select(UserCharacterOwnership)).all()
                }
                for co_data in raw_owns.get("characters", []):
                    uname = co_data.get("username")
                    cname = co_data.get("character_name")
                    u_id = user_map.get(uname) if uname else None
                    found = char_map.get(cname.strip().lower()) if cname else None
                    if u_id and found:
                        role, c_id = found
                        co = existing_char_owns.get((u_id, role, c_id))
                        if not co:
                            co = UserCharacterOwnership(
                                user_id=u_id,
                                survivor_id=c_id if role == "Survivor" else None,
                                killer_id=c_id if role == "Killer" else None,
                            )
                            db.session.add(co)
                            existing_char_owns[(u_id, role, c_id)] = co
                            char_created += 1
                        else:
                            char_updated += 1
                        co.is_owned = co_data.get("is_owned", True)

                existing_perk_owns: dict[tuple[int, int], UserPerkOwnership] = {
                    (po.user_id, po.perk_id): po
                    for po in db.session.scalars(select(UserPerkOwnership)).all()
                }
                for po_data in raw_owns.get("perks", []):
                    uname = po_data.get("username")
                    pname = po_data.get("perk_name")
                    u_id = user_map.get(uname) if uname else None
                    p_id = perk_map.get(pname.strip().lower()) if pname else None
                    if u_id and p_id:
                        po = existing_perk_owns.get((u_id, p_id))
                        if not po:
                            po = UserPerkOwnership(user_id=u_id, perk_id=p_id)
                            db.session.add(po)
                            existing_perk_owns[(u_id, p_id)] = po
                            perk_created += 1
                        else:
                            perk_updated += 1
                        po.is_unlocked = po_data.get("is_unlocked", True)

                db.session.flush()
                summary["character_ownerships"] = {"created": char_created, "updated": char_updated}
                summary["perk_ownerships"] = {"created": perk_created, "updated": perk_updated}


            if "draft_sessions" in target_keys and "draft_sessions" in data:
                ds_created, ds_updated = 0, 0
                for row in data["draft_sessions"]:
                    room_code = row.get("room_code")
                    if not room_code:
                        continue
                    existing = db.session.scalar(select(DraftSession).where(DraftSession.room_code == room_code))
                    phase = row.get("phase", "bans")
                    banned = row.get("banned_perks_json") or safe_json_dumps(row.get("banned_perks", []))
                    picked_surv = row.get("picked_survivor_perks_json") or safe_json_dumps(row.get("picked_survivor_perks", []))
                    picked_kill = row.get("picked_killer_perks_json") or safe_json_dumps(row.get("picked_killer_perks", []))
                    if not existing:
                        db.session.add(DraftSession(
                            room_code=room_code,
                            phase=phase,
                            banned_perks=banned,
                            picked_survivor_perks=picked_surv,
                            picked_killer_perks=picked_kill,
                        ))
                        ds_created += 1
                    else:
                        existing.phase = phase
                        existing.banned_perks = banned
                        existing.picked_survivor_perks = picked_surv
                        existing.picked_killer_perks = picked_kill
                        ds_updated += 1
                db.session.flush()
                summary["draft_sessions"] = {"created": ds_created, "updated": ds_updated}


            _upsert_entity(
                data, target_keys, summary, "challenge_mode_settings", ChallengeModeSetting, "mode",
                update_fields=["is_enabled", "disabled_reason"],
            )

            if "user_showcases" in target_keys and "user_showcases" in data:
                sc_created = sc_updated = 0
                for row in data["user_showcases"]:
                    u_id = user_map.get(row.get("username"))
                    if not u_id:
                        continue
                    existing_showcase = db.session.scalar(select(UserShowcase).where(UserShowcase.user_id == u_id))
                    if not existing_showcase:
                        existing_showcase = UserShowcase(user_id=u_id)
                        db.session.add(existing_showcase)
                        sc_created += 1
                    else:
                        sc_updated += 1
                    for field in [
                        "player_title", "devotion_level", "grade_rank",
                        "survivor_main_id", "survivor_main_prestige", "survivor_perk_ids",
                        "killer_main_id", "killer_main_prestige", "killer_perk_ids",
                    ]:
                        if field in row:
                            setattr(existing_showcase, field, row[field])

                    # A backup written before the mains became foreign keys
                    # carries the character's name instead. Resolve it, so an
                    # old export still restores a showcase.
                    for legacy, column, want_role in (
                        ("survivor_main_character", "survivor_main_id", "Survivor"),
                        ("killer_main_character", "killer_main_id", "Killer"),
                    ):
                        if legacy not in row or row.get(column) is not None:
                            continue
                        found = char_map.get(str(row[legacy] or "").strip().lower())
                        if found and found[0] == want_role:
                            setattr(existing_showcase, column, found[1])
                db.session.flush()
                summary["user_showcases"] = {"created": sc_created, "updated": sc_updated}

            if "admin_audit_logs" in target_keys and "admin_audit_logs" in data:
                created = 0
                for row in data["admin_audit_logs"]:
                    admin_id = user_map.get(row.get("admin_username")) if row.get("admin_username") else None
                    db.session.add(AdminAuditLog(
                        admin_user_id=admin_id,
                        action=row.get("action", "unknown"),
                        target_type=row.get("target_type"),
                        target_id=row.get("target_id"),
                        details=row.get("details"),
                    ))
                    created += 1
                db.session.flush()
                summary["admin_audit_logs"] = {"created": created, "updated": 0}

            if "changelog_posts" in target_keys and "changelog_posts" in data:
                created = 0
                for row in data["changelog_posts"]:
                    author_id = user_map.get(row.get("author_username")) if row.get("author_username") else None
                    db.session.add(ChangelogPost(
                        title=row.get("title", "Untitled"),
                        content_html=row.get("content_html", ""),
                        tag=row.get("tag", "feature"),
                        position=row.get("position", 0),
                        is_published=row.get("is_published", True),
                        author_id=author_id,
                        author_name=row.get("author_name", "The Entity"),
                    ))
                    created += 1
                db.session.flush()
                summary["changelog_posts"] = {"created": created, "updated": 0}

            import_run_family(
                data, target_keys, summary, "gauntlet_runs", GauntletRun, GauntletMatchLog, "match_logs",
                run_natural_keys=["role", "game_mode"], user_map=user_map,
            )
            import_run_family(
                data, target_keys, summary, "chaos_runs", ChaosRun, ChaosMatchLog, "match_logs",
                run_natural_keys=["difficulty"], user_map=user_map,
            )
            import_run_family(
                data, target_keys, summary, "history_runs", HistoryRun, HistoryMatchLog, "match_logs",
                run_natural_keys=["mode"], user_map=user_map,
            )
            import_run_family(
                data, target_keys, summary, "page_streak_runs", PageStreakRun, PageStreakPageLog, "page_logs",
                run_natural_keys=["killer"], user_map=user_map,
            )

            if "rosters" in target_keys and "rosters" in data:
                r_created = r_updated = 0
                for r_row in data["rosters"]:
                    roster_obj = db.session.scalar(select(Roster).where(Roster.slug == r_row.get("slug")))
                    if not roster_obj:
                        roster_obj = Roster(
                            slug=r_row.get("slug"),
                            name=r_row.get("name", ""),
                            description=r_row.get("description", ""),
                            translations=r_row.get("translations", {}),
                        )
                        db.session.add(roster_obj)
                        db.session.flush()
                        r_created += 1
                    else:
                        r_updated += 1
                    for field in ["name", "description", "translations", "cover_image_url", "theme_color", "category", "is_nsfw", "is_active"]:
                        if field in r_row:
                            setattr(roster_obj, field, r_row[field])

                    for e_row in r_row.get("entities", []):
                        entity_obj = db.session.scalar(
                            select(Entity).where(Entity.roster_id == roster_obj.id, Entity.slug == e_row.get("slug"))
                        )
                        if not entity_obj:
                            entity_obj = Entity(roster_id=roster_obj.id, slug=e_row.get("slug"), name=e_row.get("name", ""))
                            db.session.add(entity_obj)
                            db.session.flush()
                        # The profile fields are columns now, so they set like
                        # any other column. `set_metadata()` and the
                        # `metadata_json` blob it wrote are gone.
                        for field in SMASH_ENTITY_FIELDS:
                            if field in e_row:
                                setattr(entity_obj, field, e_row[field])

                        stat_row = e_row.get("stat")
                        if stat_row:
                            # `entity_id` is the primary key of entity_stats now
                            # -- the surrogate `id` is gone -- so this lookup is
                            # the identity lookup.
                            stat_obj = db.session.scalar(select(EntityStat).where(EntityStat.entity_id == entity_obj.id))
                            if not stat_obj:
                                stat_obj = EntityStat(entity_id=entity_obj.id)
                                db.session.add(stat_obj)
                            # `total_votes` and `smash_rate` are deliberately
                            # absent: they are generated columns, assigning them
                            # raises, and the database derives them from the
                            # three counts below.
                            for field in ["smash_count", "pass_count", "super_smash_count", "chaos_rating"]:
                                if field in stat_row:
                                    setattr(stat_obj, field, stat_row[field])

                        db.session.execute(delete(Vote).where(Vote.entity_id == entity_obj.id))
                        for vote_row in e_row.get("votes", []):
                            vote_username = vote_row.get("username")
                            vote = Vote(
                                entity_id=entity_obj.id,
                                user_id=user_map.get(vote_username) if vote_username else None,
                                session_id=vote_row.get("session_id"),
                                vote_type=vote_row.get("vote_type", "smash"),
                            )
                            created_at = _parse_datetime(vote_row.get("created_at"))
                            if created_at:
                                vote.created_at = created_at
                            db.session.add(vote)
                db.session.flush()
                summary["rosters"] = {"created": r_created, "updated": r_updated}


            _upsert_entity(
                data, target_keys, summary, "bug_reports", BugReport, "title",
                update_fields=["reporter_name", "reporter_email", "category", "message", "images_json", "status", "admin_notes"],
                defaults=lambda row: {
                    "reporter_name": row.get("reporter_name", "Anonymous"),
                    "message": row.get("message", ""),
                },
            )

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
