# backend/app/services/db/export_import.py
import logging
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import delete, func, select
from app.core.extensions import db
from app.core.json_provider import safe_json_dumps
from app.models.character import Character
from app.models.perk import Perk
from app.models.equipment import Item, Addon, Offering
from app.models.chapter import Chapter
from app.models.map import MapRealm, MapTile, MapObjective, Realm
from app.models.user import User, UserCharacterOwnership, UserPerkOwnership, UserShowcase
from app.models.community import DailyQuest, CommunityBuild, CustomPerk, BugReport
from app.models.minigames import DraftSession, GuesserStat
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
    serialize_character, serialize_perk, serialize_item, serialize_addon, serialize_realm,
    serialize_offering, serialize_chapter, serialize_user, serialize_user_showcase,
    serialize_admin_audit_log, serialize_changelog_post, serialize_smash_entity, serialize_roster,
)

logger = logging.getLogger(__name__)

TARGET_GROUPS: dict[str, list[str]] = {
    "content": [
        "characters",
        "perks",
        "items",
        "addons",
        "offerings",
        "chapters",
        "maps",
        "realms",
    ],
    "users": [
        "users",
        "ownerships",
        "user_showcases",
    ],
    "community": [
        "community_builds",
        "custom_perks",
        "daily_quests",
        "bug_reports",
        "changelog_posts",
        "gauntlet_runs",
        "chaos_runs",
        "history_runs",
        "page_streak_runs",
        "rosters",
    ],
    "settings": [
        "draft_sessions",
        "challenge_mode_settings",
        "admin_audit_logs",
        "guesser_stats",
    ],
}

SUPPORTED_EXPORT_TARGETS = [
    target for targets in TARGET_GROUPS.values() for target in targets
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
    row[f"{path_field}_data"] = read_asset_base64(static_dir, row.get(path_field) or None)


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
    ("characters", Character, serialize_character, ["avatar_local_path", "power_icon_local_path"]),
    ("perks", Perk, serialize_perk, ["icon_local_path"]),
    ("items", Item, serialize_item, ["icon_local_path"]),
    ("addons", Addon, serialize_addon, ["icon_local_path"]),
    ("offerings", Offering, serialize_offering, ["icon_local_path"]),
    ("chapters", Chapter, serialize_chapter, ["banner_local_path"]),
    ("users", User, serialize_user, ["avatar_relative_path"]),
    ("community_builds", CommunityBuild, lambda b: b.to_dict(), []),
    ("custom_perks", CustomPerk, lambda cp: cp.to_dict(), []),
    ("daily_quests", DailyQuest, lambda q: q.to_dict(), []),
    ("bug_reports", BugReport, lambda r: r.to_dict(), []),
    ("guesser_stats", GuesserStat, lambda gs: gs.to_dict(), []),
    ("draft_sessions", DraftSession, lambda ds: ds.to_dict(), []),
    ("challenge_mode_settings", ChallengeModeSetting, lambda cms: cms.to_dict(), []),
    ("admin_audit_logs", AdminAuditLog, serialize_admin_audit_log, []),
    ("changelog_posts", ChangelogPost, serialize_changelog_post, []),
]

# Entities whose deletion in "replace" mode is a single unconditional DELETE, gated
# only by their own target key. Order matters: perks must be cleared before
# characters (perk.character_id FK), mirroring the plan's original ordering.
_SIMPLE_DELETE_TARGETS: list[tuple[str, type]] = [
    ("bug_reports", BugReport),
    ("community_builds", CommunityBuild),
    ("custom_perks", CustomPerk),
    ("daily_quests", DailyQuest),
    ("addons", Addon),
    ("offerings", Offering),
    ("chapters", Chapter),
    ("items", Item),
    ("perks", Perk),
    ("characters", Character),
    ("guesser_stats", GuesserStat),
    ("draft_sessions", DraftSession),
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
    post_process: Callable[[Any, dict[str, Any]], None] | None = None,
    skip_none: bool = False,
    key_default: Any = None,
    asset_fields: list[str] | None = None,
    static_dir: Path | None = None,
) -> None:
    """Upsert every row in `data[name]` into `model`, keyed by `unique_field`.

    A missing row is created with `unique_field` plus whatever `defaults(row)`
    returns; an existing row only has `update_fields` (present in `row`) applied.
    `post_process` runs after field assignment, for cross-entity resolution
    (e.g. perks resolving their owning character). When `asset_fields` is given,
    each listed field's sibling "<field>_data" base64 payload (if present in
    `row`) is decoded and written back to disk under `static_dir`.
    """
    if name not in target_keys or name not in data:
        return

    created = updated = 0
    for row in data[name]:
        key_val = row.get(unique_field, key_default)
        if not key_val:
            # key_default only substitutes a missing key -- a present-but-falsy
            # value (e.g. "" or null) falls back to it too when one exists,
            # matching entities that never skip a row for a missing unique key
            # (e.g. generator_settings always defaulting role to "Survivor").
            if key_default is None:
                continue
            key_val = key_default

        if isinstance(key_val, str):
            clean_str = key_val.strip()
            where_clause = func.lower(func.trim(getattr(model, unique_field))) == clean_str.lower()
            key_val = clean_str
        else:
            where_clause = getattr(model, unique_field) == key_val

        obj = db.session.scalar(select(model).where(where_clause))
        if not obj:
            extra = defaults(row) if defaults else {}
            obj = model(**{unique_field: key_val}, **extra)
            db.session.add(obj)
            created += 1
        else:
            updated += 1

        for k in update_fields:
            if k in row:
                if skip_none and row[k] is None:
                    continue
                setattr(obj, k, row[k])

        if post_process:
            post_process(obj, row)

        if asset_fields and static_dir is not None:
            for field in asset_fields:
                write_asset_base64(static_dir, row.get(field), row.get(f"{field}_data"))

    db.session.flush()
    summary[name] = {"created": created, "updated": updated}


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
                tiles = [
                    {
                        "name": t.name,
                        "type": t.type,
                        "x": t.x,
                        "y": t.y,
                        "seed_variant": t.seed_variant,
                        "floor": t.floor,
                        "has_pallet": t.has_pallet,
                        "has_window": t.has_window,
                    }
                    for t in r.tiles
                ]
                objectives = [
                    {
                        "type": o.type,
                        "x": o.x,
                        "y": o.y,
                        "floor": o.floor,
                    }
                    for o in r.objectives
                ]
                map_list.append({
                    "map_id": r.map_id,
                    "name": r.name,
                    "realm": r.realm,
                    "realm_id": r.realm_id,
                    "source": r.source,
                    "source_label": r.source_label,
                    "layout_type": r.layout_type,
                    "jungle_gyms_count": r.jungle_gyms_count,
                    "totem_spawns_count": r.totem_spawns_count,
                    "pallet_density": r.pallet_density,
                    "shack_has_basement": r.shack_has_basement,
                    "description": r.description,
                    "image_url": r.image_url,
                    "callout_image_url": r.callout_image_url,
                    "callout_image_local_path": r.callout_image_local_path,
                    "translations": r.translations or {},
                    "tiles": tiles,
                    "objectives": objectives,
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
                    db.session.execute(delete(MapObjective))
                    db.session.execute(delete(MapTile))
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

            if "characters" in target_keys and "characters" in data:
                c_created, c_updated = 0, 0
                for row in data["characters"]:
                    name = row.get("name")
                    wiki_slug = row.get("wiki_slug")
                    if not name and not wiki_slug:
                        continue

                    char_obj = None
                    if name:
                        char_obj = db.session.scalar(select(Character).where(Character.name == name))
                    if not char_obj and wiki_slug:
                        char_obj = db.session.scalar(select(Character).where(Character.wiki_slug == wiki_slug))

                    if not char_obj:
                        char_obj = Character(
                            name=name or wiki_slug,
                            role=row.get("role", "Survivor"),
                        )
                        db.session.add(char_obj)
                        c_created += 1
                    else:
                        c_updated += 1

                    if name:
                        name_conflict = db.session.scalar(
                            select(Character).where(Character.name == name, Character.id != char_obj.id)
                        )
                        if not name_conflict:
                            char_obj.name = name

                    for k in [
                        "role", "code_prefix", "portrait_url", "real_name", "short_name",
                        "wiki_slug", "avatar_local_path", "release_number", "chapter_name",
                        "chapter_number", "dlc_type", "is_licensed", "release_year",
                        "release_date", "dlc_counterparts", "lore", "power_name",
                        "power_description", "power_icon_url", "movement_speed",
                        "terror_radius", "terror_radius_meters", "height", "translations",
                    ]:
                        if k in row:
                            setattr(char_obj, k, row[k])

                    if static_dir is not None:
                        for field in ["avatar_local_path", "power_icon_local_path"]:
                            write_asset_base64(static_dir, row.get(field), row.get(f"{field}_data"))

                db.session.flush()
                summary["characters"] = {"created": c_created, "updated": c_updated}

            char_map: dict[str, int] = {}
            for c in db.session.scalars(select(Character)).all():
                char_map[c.name.strip().lower()] = c.id
                if c.real_name:
                    char_map[c.real_name.strip().lower()] = c.id
                if c.wiki_slug:
                    char_map[c.wiki_slug.strip().lower()] = c.id

            def _resolve_perk_character(perk_obj: Perk, row: dict[str, Any]) -> None:
                char_name = row.get("character_name")
                if char_name:
                    char_id = char_map.get(char_name.strip().lower())
                    if char_id:
                        perk_obj.character_id = char_id

            _upsert_entity(
                data, target_keys, summary, "perks", Perk, "name",
                update_fields=[
                    "alternate_name", "is_generic_counterpart", "is_teachable",
                    "category", "description", "icon_url", "icon_local_path", "translations",
                ],
                post_process=_resolve_perk_character,
                asset_fields=["icon_local_path"], static_dir=static_dir,
            )

            _upsert_entity(
                data, target_keys, summary, "items", Item, "name",
                update_fields=["category", "role", "description", "icon_url", "icon_local_path", "rarity", "translations"],
                asset_fields=["icon_local_path"], static_dir=static_dir,
            )

            _upsert_entity(
                data, target_keys, summary, "addons", Addon, "name",
                update_fields=["associated_target", "category", "description", "icon_url", "icon_local_path", "rarity", "translations"],
                asset_fields=["icon_local_path"], static_dir=static_dir,
            )

            _upsert_entity(
                data, target_keys, summary, "offerings", Offering, "name",
                update_fields=["category", "role", "description", "icon_url", "icon_local_path", "rarity", "translations"],
                asset_fields=["icon_local_path"], static_dir=static_dir,
            )

            _upsert_entity(
                data, target_keys, summary, "chapters", Chapter, "name",
                update_fields=["banner_url", "banner_local_path"],
                asset_fields=["banner_local_path"], static_dir=static_dir,
            )

            if "maps" in target_keys and "maps" in data:
                raw_maps = data["maps"]
                created, updated = 0, 0
                for mdata in raw_maps:
                    map_id = mdata.get("map_id")
                    if not map_id:
                        continue
                    realm_obj = db.session.scalar(select(MapRealm).where(MapRealm.map_id == map_id))
                    if not realm_obj:
                        realm_obj = MapRealm(
                            map_id=map_id,
                            name=mdata.get("name", map_id),
                            realm=mdata.get("realm", "Unknown Realm"),
                        )
                        db.session.add(realm_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in [
                        "name", "realm", "realm_id", "source", "source_label",
                        "layout_type", "jungle_gyms_count", "totem_spawns_count",
                        "pallet_density", "shack_has_basement", "description",
                        "image_url", "callout_image_url", "callout_image_local_path",
                        "translations",
                    ]:
                        if k in mdata:
                            setattr(realm_obj, k, mdata[k])

                    if "tiles" in mdata:
                        db.session.execute(delete(MapTile).where(MapTile.map_id == map_id))
                        for tdata in mdata["tiles"]:
                            tile = MapTile(
                                map_id=map_id,
                                name=tdata.get("name", "Tile"),
                                type=tdata.get("type", "standard"),
                                x=float(tdata.get("x", 0.0)),
                                y=float(tdata.get("y", 0.0)),
                                seed_variant=tdata.get("seed_variant", "seed_a"),
                                floor=int(tdata.get("floor", 1)),
                                has_pallet=bool(tdata.get("has_pallet", False)),
                                has_window=bool(tdata.get("has_window", False)),
                            )
                            db.session.add(tile)

                    if "objectives" in mdata:
                        db.session.execute(delete(MapObjective).where(MapObjective.map_id == map_id))
                        for odata in mdata["objectives"]:
                            obj = MapObjective(
                                map_id=map_id,
                                type=odata.get("type", "generator"),
                                x=float(odata.get("x", 0.0)),
                                y=float(odata.get("y", 0.0)),
                                floor=int(odata.get("floor", 1)),
                            )
                            db.session.add(obj)
                    write_asset_base64(static_dir, mdata.get("callout_image_local_path"), mdata.get("callout_image_local_path_data"))
                db.session.flush()
                summary["maps"] = {"created": created, "updated": updated}

            if "maps" in target_keys or "realms" in target_keys:
                # Realms restore is gated by this outer "maps" OR "realms" check
                # (an old backup may carry realm banners only under the "maps"
                # target). The synthetic {"realms"} passed below only satisfies
                # _upsert_entity's own internal target-key gate -- it does not
                # replace the real gating condition above.
                _upsert_entity(
                    data, {"realms"}, summary, "realms", Realm, "name",
                    update_fields=["image_url", "image_local_path", "translations"],
                    defaults=lambda row: {
                        "image_url": row.get("image_url", ""),
                        "image_local_path": row.get("image_local_path", ""),
                    },
                    asset_fields=["image_local_path"], static_dir=static_dir,
                )

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

            if "ownerships" in target_keys and "ownerships" in data:
                raw_owns = data["ownerships"]
                char_created, char_updated = 0, 0
                perk_created, perk_updated = 0, 0

                existing_char_owns: dict[tuple[int, int], UserCharacterOwnership] = {
                    (co.user_id, co.character_id): co
                    for co in db.session.scalars(select(UserCharacterOwnership)).all()
                }
                for co_data in raw_owns.get("characters", []):
                    uname = co_data.get("username")
                    cname = co_data.get("character_name")
                    u_id = user_map.get(uname) if uname else None
                    c_id = char_map.get(cname.strip().lower()) if cname else None
                    if u_id and c_id:
                        co = existing_char_owns.get((u_id, c_id))
                        if not co:
                            co = UserCharacterOwnership(user_id=u_id, character_id=c_id)
                            db.session.add(co)
                            existing_char_owns[(u_id, c_id)] = co
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
                        "survivor_main_character", "survivor_main_prestige", "survivor_perk_ids",
                        "killer_main_character", "killer_main_prestige", "killer_perk_ids",
                    ]:
                        if field in row:
                            setattr(existing_showcase, field, row[field])
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
                            name_i18n_key=r_row.get("name_i18n_key", ""),
                            description_i18n_key=r_row.get("description_i18n_key", ""),
                        )
                        db.session.add(roster_obj)
                        db.session.flush()
                        r_created += 1
                    else:
                        r_updated += 1
                    for field in ["name_i18n_key", "description_i18n_key", "cover_image_url", "theme_color", "category", "is_nsfw", "is_active"]:
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
                        for field in ["name", "role", "gender", "media_url", "media_type", "order_index", "is_active"]:
                            if field in e_row:
                                setattr(entity_obj, field, e_row[field])
                        if "metadata_json" in e_row:
                            entity_obj.set_metadata(e_row["metadata_json"])

                        stat_row = e_row.get("stat")
                        if stat_row:
                            stat_obj = db.session.scalar(select(EntityStat).where(EntityStat.entity_id == entity_obj.id))
                            if not stat_obj:
                                stat_obj = EntityStat(entity_id=entity_obj.id)
                                db.session.add(stat_obj)
                            for field in ["smash_count", "pass_count", "super_smash_count", "total_votes", "smash_rate", "chaos_rating"]:
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
                data, target_keys, summary, "community_builds", CommunityBuild, "title",
                update_fields=["description", "role", "category", "character_id", "perks_json", "upvotes", "author"],
                defaults=lambda row: {
                    "description": row.get("description", ""),
                    "role": row.get("role", "Survivor"),
                    "category": row.get("category", "Meta"),
                },
            )

            _upsert_entity(
                data, target_keys, summary, "custom_perks", CustomPerk, "name",
                update_fields=["role", "character_name", "rarity", "icon_preset", "description", "upvotes", "author"],
                defaults=lambda row: {
                    "role": row.get("role", "Survivor"),
                    "rarity": row.get("rarity", "Very Rare"),
                    "description": row.get("description", ""),
                },
            )

            _upsert_entity(
                data, target_keys, summary, "daily_quests", DailyQuest, "title",
                update_fields=["description", "category", "progress", "goal", "xp_reward", "is_completed"],
                defaults=lambda row: {
                    "description": row.get("description", ""),
                    "category": row.get("category", "General"),
                },
            )

            _upsert_entity(
                data, target_keys, summary, "bug_reports", BugReport, "title",
                update_fields=["reporter_name", "reporter_email", "category", "message", "images_json", "status", "admin_notes"],
                defaults=lambda row: {
                    "reporter_name": row.get("reporter_name", "Anonymous"),
                    "message": row.get("message", ""),
                },
            )

            _upsert_entity(
                data, target_keys, summary, "guesser_stats", GuesserStat, "guesser_type",
                update_fields=["current_streak", "best_streak", "total_guesses", "correct_guesses"],
            )

            db.session.commit()

            try:
                from app.routes.perks import perk_service
                perk_service.reload_data()
            except Exception as reload_err:
                logger.debug(f"PerkService reload_data notice during import: {reload_err}")

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
