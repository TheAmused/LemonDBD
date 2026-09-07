# backend/app/services/db/export_import.py
import logging
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select
from app.core.extensions import db
from app.models.character import Character
from app.models.perk import Perk
from app.models.equipment import Item, Addon, Offering
from app.models.chapter import Chapter
from app.models.map import MapRealm, MapTile, MapObjective, Realm
from app.models.user import User, UserCharacterOwnership, UserPerkOwnership
from app.models.community import DailyQuest, CommunityBuild, CustomPerk, BugReport
from app.models.minigames import GeneratorSetting, GuesserStat
from app.services.db.asset_bundling import get_static_dir, read_asset_base64, write_asset_base64

logger = logging.getLogger(__name__)

SUPPORTED_EXPORT_TARGETS = [
    "characters",
    "perks",
    "items",
    "addons",
    "offerings",
    "chapters",
    "maps",
    "realms",
    "users",
    "ownerships",
    "community_builds",
    "custom_perks",
    "daily_quests",
    "bug_reports",
    "generator_settings",
    "guesser_stats",
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


def _power_icon_local_path(power_name: str | None) -> str | None:
    """Mirrors Character.to_dict()'s computed (not stored) power icon path,
    so export/import knows where the power icon actually lives on disk."""
    if not power_name:
        return None
    p_clean = power_name.lower().replace(" ", "_").replace("'", "").replace("-", "_")
    return f"icons/powers/{p_clean}.webp" if p_clean else None


def _serialize_character(c: Character) -> dict[str, Any]:
    return {
        "name": c.name,
        "role": c.role,
        "code_prefix": c.code_prefix,
        "portrait_url": c.portrait_url,
        "real_name": c.real_name,
        "short_name": c.short_name,
        "wiki_slug": c.wiki_slug,
        "avatar_local_path": c.avatar_local_path,
        "release_number": c.release_number,
        "chapter_name": c.chapter_name,
        "chapter_number": c.chapter_number,
        "dlc_type": c.dlc_type,
        "is_licensed": c.is_licensed,
        "release_year": c.release_year,
        "release_date": c.release_date,
        "dlc_counterparts": c.dlc_counterparts,
        "lore": c.lore,
        "power_name": c.power_name,
        "power_description": c.power_description,
        "power_icon_url": c.power_icon_url,
        "power_icon_local_path": _power_icon_local_path(c.power_name),
        "movement_speed": c.movement_speed,
        "terror_radius": c.terror_radius,
        "terror_radius_meters": c.terror_radius_meters,
        "height": c.height,
        "translations": c.translations or {},
    }


def _serialize_perk(p: Perk) -> dict[str, Any]:
    return {
        "name": p.name,
        "alternate_name": p.alternate_name,
        "is_generic_counterpart": p.is_generic_counterpart,
        "is_teachable": p.is_teachable,
        "category": p.category,
        "description": p.description,
        "icon_url": p.icon_url,
        "icon_local_path": p.icon_local_path,
        "character_name": p.character.name if p.character else None,
        "translations": p.translations or {},
    }


def _serialize_item(item: Item) -> dict[str, Any]:
    return {
        "name": item.name,
        "category": item.category,
        "role": item.role,
        "description": item.description,
        "icon_url": item.icon_url,
        "icon_local_path": item.icon_local_path,
        "rarity": item.rarity,
        "translations": item.translations or {},
    }


def _serialize_addon(a: Addon) -> dict[str, Any]:
    return {
        "name": a.name,
        "associated_target": a.associated_target,
        "category": a.category,
        "description": a.description,
        "icon_url": a.icon_url,
        "icon_local_path": a.icon_local_path,
        "rarity": a.rarity,
        "translations": a.translations or {},
    }


def _serialize_offering(o: Offering) -> dict[str, Any]:
    return {
        "name": o.name,
        "category": o.category,
        "role": o.role,
        "description": o.description,
        "icon_url": o.icon_url,
        "icon_local_path": o.icon_local_path,
        "rarity": o.rarity,
        "translations": o.translations or {},
    }


def _serialize_chapter(c: Chapter) -> dict[str, Any]:
    return {
        "name": c.name,
        "banner_url": c.banner_url,
        "banner_local_path": c.banner_local_path,
    }


def _serialize_realm(rb: Realm) -> dict[str, Any]:
    return {
        "name": rb.name,
        "image_url": rb.image_url,
        "image_local_path": rb.image_local_path,
        "translations": rb.translations or {},
    }


def _serialize_user(u: User) -> dict[str, Any]:
    return {
        "username": u.username,
        "email": u.email,
        "password_hash": u.password_hash,
        "role": u.role,
        "avatar_url": u.avatar_url,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "updated_at": u.updated_at.isoformat() if u.updated_at else None,
    }


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
    ("characters", Character, _serialize_character, ["avatar_local_path", "power_icon_local_path"]),
    ("perks", Perk, _serialize_perk, ["icon_local_path"]),
    ("items", Item, _serialize_item, ["icon_local_path"]),
    ("addons", Addon, _serialize_addon, ["icon_local_path"]),
    ("offerings", Offering, _serialize_offering, ["icon_local_path"]),
    ("chapters", Chapter, _serialize_chapter, ["banner_local_path"]),
    ("users", User, _serialize_user, []),
    ("community_builds", CommunityBuild, lambda b: b.to_dict(), []),
    ("custom_perks", CustomPerk, lambda cp: cp.to_dict(), []),
    ("daily_quests", DailyQuest, lambda q: q.to_dict(), []),
    ("bug_reports", BugReport, lambda r: r.to_dict(), []),
    ("generator_settings", GeneratorSetting, lambda s: s.to_dict(), []),
    ("guesser_stats", GuesserStat, lambda gs: gs.to_dict(), []),
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
    ("generator_settings", GeneratorSetting),
    ("guesser_stats", GuesserStat),
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

        obj = db.session.scalar(select(model).where(getattr(model, unique_field) == key_val))
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
            _export_entity(export_data, counts, "realms", Realm, _serialize_realm, ["image_local_path"], static_dir, include_assets)

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

        return {
            "version": "1.0",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "source": "LemonDBD",
            "counts": counts,
            "data": export_data,
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

        data: dict[str, Any] = payload.get("data", payload)
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
                for key, model in _SIMPLE_DELETE_TARGETS:
                    if key in target_keys:
                        db.session.execute(delete(model))
                db.session.flush()

            _upsert_entity(
                data, target_keys, summary, "characters", Character, "name",
                update_fields=[
                    "role", "code_prefix", "portrait_url", "real_name", "short_name",
                    "wiki_slug", "avatar_local_path", "release_number", "chapter_name",
                    "chapter_number", "dlc_type", "is_licensed", "release_year",
                    "release_date", "dlc_counterparts", "lore", "power_name",
                    "power_description", "power_icon_url", "movement_speed",
                    "terror_radius", "terror_radius_meters", "height", "translations",
                ],
                defaults=lambda row: {"role": row.get("role", "Survivor")},
                asset_fields=["avatar_local_path", "power_icon_local_path"], static_dir=static_dir,
            )

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

            _upsert_entity(
                data, target_keys, summary, "users", User, "username",
                update_fields=["email", "password_hash", "role", "avatar_url", "is_active"],
                defaults=lambda row: {
                    "email": row.get("email", f"{row.get('username')}@lemondbd.com"),
                    "password_hash": row.get("password_hash", ""),
                    "role": row.get("role", "user"),
                    "avatar_url": row.get("avatar_url", "default_avatar"),
                    "is_active": row.get("is_active", True),
                },
                post_process=lambda user_obj, row: setattr(
                    user_obj, "created_at", _parse_datetime(row["created_at"]) or user_obj.created_at
                ) if row.get("created_at") else None,
                skip_none=True,
            )

            user_map: dict[str, int] = {u.username: u.id for u in db.session.scalars(select(User)).all()}
            perk_map: dict[str, int] = {p.name.strip().lower(): p.id for p in db.session.scalars(select(Perk)).all()}

            if "ownerships" in target_keys and "ownerships" in data:
                raw_owns = data["ownerships"]
                char_created, char_updated = 0, 0
                perk_created, perk_updated = 0, 0

                for co_data in raw_owns.get("characters", []):
                    uname = co_data.get("username")
                    cname = co_data.get("character_name")
                    u_id = user_map.get(uname) if uname else None
                    c_id = char_map.get(cname.strip().lower()) if cname else None
                    if u_id and c_id:
                        co = db.session.scalar(
                            select(UserCharacterOwnership).where(
                                UserCharacterOwnership.user_id == u_id,
                                UserCharacterOwnership.character_id == c_id,
                            )
                        )
                        if not co:
                            co = UserCharacterOwnership(user_id=u_id, character_id=c_id)
                            db.session.add(co)
                            char_created += 1
                        else:
                            char_updated += 1
                        co.is_owned = co_data.get("is_owned", True)

                for po_data in raw_owns.get("perks", []):
                    uname = po_data.get("username")
                    pname = po_data.get("perk_name")
                    u_id = user_map.get(uname) if uname else None
                    p_id = perk_map.get(pname.strip().lower()) if pname else None
                    if u_id and p_id:
                        po = db.session.scalar(
                            select(UserPerkOwnership).where(
                                UserPerkOwnership.user_id == u_id,
                                UserPerkOwnership.perk_id == p_id,
                            )
                        )
                        if not po:
                            po = UserPerkOwnership(user_id=u_id, perk_id=p_id)
                            db.session.add(po)
                            perk_created += 1
                        else:
                            perk_updated += 1
                        po.is_unlocked = po_data.get("is_unlocked", True)

                db.session.flush()
                summary["character_ownerships"] = {"created": char_created, "updated": char_updated}
                summary["perk_ownerships"] = {"created": perk_created, "updated": perk_updated}

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
                data, target_keys, summary, "generator_settings", GeneratorSetting, "role",
                update_fields=["gen_mode", "no_repeat_perks", "total_pages", "perks_per_page", "last_page_perks", "spin_duration_sec"],
                key_default="Survivor",
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
