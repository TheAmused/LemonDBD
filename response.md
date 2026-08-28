### backend/app/services/chaos/__init__.py
```python
from app.services.chaos.constants import (
    ADDON_RARITY_POOL,
    CHAOS_CHECKPOINT_INTERVAL,
    DIFFICULTIES,
    checkpoint_interval,
)
from app.services.chaos.roller import (
    draw_addon_rarities,
    draw_chaos_perks,
    get_owned_killer_ids,
    get_owned_killer_names,
    get_unlocked_killer_perk_ids,
    get_unlocked_killer_perks,
    resolve_killer_names_by_ids,
    resolve_perk_names_by_ids,
    resolve_perks_by_ids,
    resolve_perks_by_names,
)
from app.services.chaos.stats import fetch_chaos_user_stats

__all__ = [
    "DIFFICULTIES",
    "CHAOS_CHECKPOINT_INTERVAL",
    "ADDON_RARITY_POOL",
    "checkpoint_interval",
    "get_owned_killer_names",
    "get_owned_killer_ids",
    "get_unlocked_killer_perks",
    "get_unlocked_killer_perk_ids",
    "resolve_perks_by_names",
    "resolve_perks_by_ids",
    "resolve_perk_names_by_ids",
    "resolve_killer_names_by_ids",
    "draw_chaos_perks",
    "draw_addon_rarities",
    "fetch_chaos_user_stats",
]
```

### backend/app/services/chaos/constants.py
```python
DIFFICULTIES: tuple[str, ...] = ("easy", "medium", "hell")

# 0 means no checkpoint: one loss fully resets the run.
CHAOS_CHECKPOINT_INTERVAL: dict[str, int] = {"easy": 5, "medium": 10, "hell": 0}

# "Event" rarity addons are excluded as they are tied to limited-time events.
ADDON_RARITY_POOL: list[str] = ["Common", "Uncommon", "Rare", "Very Rare", "Ultra Rare"]


def checkpoint_interval(difficulty: str) -> int:
    return CHAOS_CHECKPOINT_INTERVAL.get(difficulty, 0)
```

### backend/app/services/chaos/roller.py
```python
import random
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models import Character, Perk
from app.services.chaos.constants import ADDON_RARITY_POOL
from app.services.ownership_service import OwnershipService


def get_owned_killer_names(user_id: int, ownership_service: OwnershipService) -> list[str]:
    """Every killer the user owns. Unlike Gauntlet Original, no roster cap."""
    owned = ownership_service.get_user_characters(user_id, role="Killer")
    return [c["name"] for c in owned if c["is_owned"] and not c.get("is_disabled")]


def get_owned_killer_ids(user_id: int, ownership_service: OwnershipService) -> list[int]:
    """Same as get_owned_killer_names, but keyed by the killer's stable id."""
    owned = ownership_service.get_user_characters(user_id, role="Killer")
    return [c["id"] for c in owned if c["is_owned"] and not c.get("is_disabled")]


def get_unlocked_killer_perks(user_id: int, ownership_service: OwnershipService) -> list[dict[str, Any]]:
    """Every unlocked perk in the Killer category."""
    perks = ownership_service.get_user_perks(user_id, category="Killer")
    return [p for p in perks if p["is_unlocked"] and not p.get("is_disabled")]


def get_unlocked_killer_perk_ids(user_id: int, ownership_service: OwnershipService) -> list[int]:
    """Same as get_unlocked_killer_perks, but keyed by the perk's stable id."""
    perks = ownership_service.get_user_perks(user_id, category="Killer")
    return [p["perk_id"] for p in perks if p["is_unlocked"] and not p.get("is_disabled")]


def resolve_perks_by_names(names: list[str]) -> list[dict[str, Any]]:
    """Turns a frozen name list back into full perk dicts (icon, description)."""
    if not names:
        return []
    perks = db.session.scalars(select(Perk).where(Perk.name.in_(names), Perk.category == "Killer")).all()
    by_name = {p.name: p.to_dict() for p in perks}
    return [by_name[n] for n in names if n in by_name]


def resolve_perks_by_ids(ids: list[int]) -> list[dict[str, Any]]:
    """Turns a frozen perk id list back into full perk dicts (icon, description)."""
    if not ids:
        return []
    perks = db.session.scalars(select(Perk).where(Perk.id.in_(ids), Perk.category == "Killer")).all()
    by_id = {p.id: p.to_dict() for p in perks}
    return [by_id[i] for i in ids if i in by_id]


def resolve_perk_names_by_ids(ids: list[int]) -> list[str]:
    """Frozen perk id list -> current names."""
    return [p["name"] for p in resolve_perks_by_ids(ids)]


def resolve_killer_names_by_ids(ids: list[int]) -> list[str]:
    """Turns a frozen killer id list back into current names."""
    if not ids:
        return []
    rows = db.session.scalars(select(Character).where(Character.id.in_(ids))).all()
    by_id = {c.id: c.name for c in rows}
    return [by_id[i] for i in ids if i in by_id]


def draw_chaos_perks(
    unlocked_perks: list[dict[str, Any]],
    used_perk_names: list[str],
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Draws 4 perks one at a time without repeating a perk already in
    used_perk_names. If the eligible pool runs out mid-draw, the whole pool
    becomes eligible again.
    """
    if not unlocked_perks:
        return [], list(used_perk_names)

    used = list(used_perk_names)
    drawn: list[dict[str, Any]] = []

    for _ in range(4):
        eligible = [p for p in unlocked_perks if p["name"] not in used]
        if not eligible:
            used = []
            eligible = list(unlocked_perks)
        pick = random.choice(eligible)
        drawn.append(pick)
        used.append(pick["name"])

    return drawn, used


def draw_addon_rarities() -> list[str]:
    """Two independent picks from ADDON_RARITY_POOL; duplicates are allowed."""
    return [random.choice(ADDON_RARITY_POOL), random.choice(ADDON_RARITY_POOL)]
```

### backend/app/services/chaos/stats.py
```python
from typing import Any
from sqlalchemy import select

from app.core.extensions import db
from app.models import ChaosMatchLog, ChaosRun
from app.services.streak_stats import fetch_streak_stats


def fetch_chaos_user_stats(user_id: int, difficulty: str) -> dict[str, Any]:
    run_ids = db.session.scalars(
        select(ChaosRun.id).where(ChaosRun.user_id == user_id, ChaosRun.difficulty == difficulty)
    ).all()
    return fetch_streak_stats(run_ids, ChaosMatchLog)
```

### backend/app/services/db/__init__.py
```python
from app.services.db.connection import MemConnectionWrapper, create_sqlite_connection
from app.services.db.maintenance import prune_stale_character_rows
from app.services.db.raw_schema import init_raw_sqlite_schema
from app.services.db.seeders import seed_default_configs

__all__ = [
    "MemConnectionWrapper",
    "create_sqlite_connection",
    "init_raw_sqlite_schema",
    "seed_default_configs",
    "prune_stale_character_rows",
]
```

### backend/app/services/db/connection.py
```python
import os
import sqlite3


class MemConnectionWrapper:
    """Wrapper that prevents closing an in-memory SQLite database connection."""

    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn

    def cursor(self):
        return self._conn.cursor()

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def execute(self, *args, **kwargs):
        return self._conn.execute(*args, **kwargs)

    def executemany(self, *args, **kwargs):
        return self._conn.executemany(*args, **kwargs)

    def executescript(self, *args, **kwargs):
        return self._conn.executescript(*args, **kwargs)

    def close(self):
        pass

    def __getattr__(self, name: str):
        return getattr(self._conn, name)


def create_sqlite_connection(db_path: str = ":memory:") -> sqlite3.Connection:
    """Create a configured SQLite connection with row factory enabled."""
    if db_path != ":memory:":
        dir_name = os.path.dirname(os.path.abspath(db_path))
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)

    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn
```

### backend/app/services/db/export_import.py
```python
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select
from app.core.extensions import db
from app.core.json_provider import safe_json_loads
from app.models.character import Character
from app.models.perk import Perk
from app.models.equipment import Item, Addon
from app.models.map import MapRealm, MapTile, MapObjective
from app.models.user import User, UserCharacterOwnership, UserPerkOwnership
from app.models.community import DailyQuest, CommunityBuild, CustomPerk, BugReport
from app.models.minigames import GeneratorSetting, GuesserStat

logger = logging.getLogger(__name__)

SUPPORTED_EXPORT_TARGETS = [
    "characters",
    "perks",
    "items",
    "addons",
    "maps",
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


class DatabaseExportImportService:
    """
    Handles JSON-based export, backup, and restore operations across all LemonDBD database entities.
    Supports atomic execution, merge upserts, full table replacements, and foreign key resolution.
    """

    @classmethod
    def export_database(cls, targets: list[str] | None = None) -> dict[str, Any]:
        target_set: set[str] = set(targets) if targets else set(SUPPORTED_EXPORT_TARGETS)
        export_data: dict[str, Any] = {}
        counts: dict[str, int] = {}

        if "characters" in target_set:
            chars = db.session.scalars(select(Character).order_by(Character.id)).all()
            char_list = []
            for c in chars:
                char_list.append({
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
                    "movement_speed": c.movement_speed,
                    "terror_radius": c.terror_radius,
                    "terror_radius_meters": c.terror_radius_meters,
                    "height": c.height,
                    "translations": c.translations or {},
                })
            export_data["characters"] = char_list
            counts["characters"] = len(char_list)

        if "perks" in target_set:
            perks = db.session.scalars(select(Perk).order_by(Perk.id)).all()
            perk_list = []
            for p in perks:
                perk_list.append({
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
                })
            export_data["perks"] = perk_list
            counts["perks"] = len(perk_list)

        if "items" in target_set:
            items = db.session.scalars(select(Item).order_by(Item.id)).all()
            item_list = []
            for item in items:
                item_list.append({
                    "name": item.name,
                    "category": item.category,
                    "role": item.role,
                    "description": item.description,
                    "icon_url": item.icon_url,
                    "icon_local_path": item.icon_local_path,
                    "rarity": item.rarity,
                    "translations": item.translations or {},
                })
            export_data["items"] = item_list
            counts["items"] = len(item_list)

        if "addons" in target_set:
            addons = db.session.scalars(select(Addon).order_by(Addon.id)).all()
            addon_list = []
            for a in addons:
                addon_list.append({
                    "name": a.name,
                    "associated_target": a.associated_target,
                    "category": a.category,
                    "description": a.description,
                    "icon_url": a.icon_url,
                    "icon_local_path": a.icon_local_path,
                    "rarity": a.rarity,
                    "translations": a.translations or {},
                })
            export_data["addons"] = addon_list
            counts["addons"] = len(addon_list)

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
                    "tiles": tiles,
                    "objectives": objectives,
                })
            export_data["maps"] = map_list
            counts["maps"] = len(map_list)

        if "users" in target_set:
            users = db.session.scalars(select(User).order_by(User.id)).all()
            user_list = []
            for u in users:
                user_list.append({
                    "username": u.username,
                    "email": u.email,
                    "password_hash": u.password_hash,
                    "role": u.role,
                    "avatar_url": u.avatar_url,
                    "is_active": u.is_active,
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                    "updated_at": u.updated_at.isoformat() if u.updated_at else None,
                })
            export_data["users"] = user_list
            counts["users"] = len(user_list)

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

        if "community_builds" in target_set:
            builds = db.session.scalars(select(CommunityBuild).order_by(CommunityBuild.id)).all()
            export_data["community_builds"] = [b.to_dict() for b in builds]
            counts["community_builds"] = len(builds)

        if "custom_perks" in target_set:
            cperks = db.session.scalars(select(CustomPerk).order_by(CustomPerk.id)).all()
            export_data["custom_perks"] = [cp.to_dict() for cp in cperks]
            counts["custom_perks"] = len(cperks)

        if "daily_quests" in target_set:
            quests = db.session.scalars(select(DailyQuest).order_by(DailyQuest.id)).all()
            export_data["daily_quests"] = [q.to_dict() for q in quests]
            counts["daily_quests"] = len(quests)

        if "bug_reports" in target_set:
            reports = db.session.scalars(select(BugReport).order_by(BugReport.id)).all()
            export_data["bug_reports"] = [r.to_dict() for r in reports]
            counts["bug_reports"] = len(reports)

        if "generator_settings" in target_set:
            settings = db.session.scalars(select(GeneratorSetting).order_by(GeneratorSetting.id)).all()
            export_data["generator_settings"] = [s.to_dict() for s in settings]
            counts["generator_settings"] = len(settings)

        if "guesser_stats" in target_set:
            gstats = db.session.scalars(select(GuesserStat).order_by(GuesserStat.id)).all()
            export_data["guesser_stats"] = [gs.to_dict() for gs in gstats]
            counts["guesser_stats"] = len(gstats)

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

        try:
            if mode == "replace":
                if "ownerships" in target_keys:
                    db.session.execute(delete(UserCharacterOwnership))
                    db.session.execute(delete(UserPerkOwnership))
                if "bug_reports" in target_keys:
                    db.session.execute(delete(BugReport))
                if "community_builds" in target_keys:
                    db.session.execute(delete(CommunityBuild))
                if "custom_perks" in target_keys:
                    db.session.execute(delete(CustomPerk))
                if "daily_quests" in target_keys:
                    db.session.execute(delete(DailyQuest))
                if "maps" in target_keys:
                    db.session.execute(delete(MapObjective))
                    db.session.execute(delete(MapTile))
                    db.session.execute(delete(MapRealm))
                if "addons" in target_keys:
                    db.session.execute(delete(Addon))
                if "items" in target_keys:
                    db.session.execute(delete(Item))
                if "perks" in target_keys:
                    db.session.execute(delete(Perk))
                if "characters" in target_keys:
                    db.session.execute(delete(Character))
                if "generator_settings" in target_keys:
                    db.session.execute(delete(GeneratorSetting))
                if "guesser_stats" in target_keys:
                    db.session.execute(delete(GuesserStat))
                db.session.flush()

            if "characters" in target_keys and "characters" in data:
                raw_chars = data["characters"]
                created, updated = 0, 0
                for cdata in raw_chars:
                    name = cdata.get("name")
                    if not name:
                        continue
                    char_obj = db.session.scalar(select(Character).where(Character.name == name))
                    if not char_obj:
                        char_obj = Character(name=name, role=cdata.get("role", "Survivor"))
                        db.session.add(char_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in [
                        "role", "code_prefix", "portrait_url", "real_name", "short_name",
                        "wiki_slug", "avatar_local_path", "release_number", "chapter_name",
                        "chapter_number", "dlc_type", "is_licensed", "release_year",
                        "release_date", "dlc_counterparts", "lore", "power_name",
                        "power_description", "power_icon_url", "movement_speed",
                        "terror_radius", "terror_radius_meters", "height", "translations"
                    ]:
                        if k in cdata:
                            setattr(char_obj, k, cdata[k])
                db.session.flush()
                summary["characters"] = {"created": created, "updated": updated}

            char_map: dict[str, int] = {}
            for c in db.session.scalars(select(Character)).all():
                char_map[c.name.strip().lower()] = c.id
                if c.real_name:
                    char_map[c.real_name.strip().lower()] = c.id
                if c.wiki_slug:
                    char_map[c.wiki_slug.strip().lower()] = c.id

            if "perks" in target_keys and "perks" in data:
                raw_perks = data["perks"]
                created, updated = 0, 0
                for pdata in raw_perks:
                    name = pdata.get("name")
                    if not name:
                        continue
                    perk_obj = db.session.scalar(select(Perk).where(Perk.name == name))
                    if not perk_obj:
                        perk_obj = Perk(name=name)
                        db.session.add(perk_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in [
                        "alternate_name", "is_generic_counterpart", "is_teachable",
                        "category", "description", "icon_url", "icon_local_path", "translations"
                    ]:
                        if k in pdata:
                            setattr(perk_obj, k, pdata[k])

                    char_name = pdata.get("character_name")
                    if char_name:
                        char_id = char_map.get(char_name.strip().lower())
                        if char_id:
                            perk_obj.character_id = char_id
                db.session.flush()
                summary["perks"] = {"created": created, "updated": updated}

            if "items" in target_keys and "items" in data:
                raw_items = data["items"]
                created, updated = 0, 0
                for idata in raw_items:
                    name = idata.get("name")
                    if not name:
                        continue
                    item_obj = db.session.scalar(select(Item).where(Item.name == name))
                    if not item_obj:
                        item_obj = Item(name=name)
                        db.session.add(item_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in [
                        "category", "role", "description", "icon_url",
                        "icon_local_path", "rarity", "translations"
                    ]:
                        if k in idata:
                            setattr(item_obj, k, idata[k])
                db.session.flush()
                summary["items"] = {"created": created, "updated": updated}

            if "addons" in target_keys and "addons" in data:
                raw_addons = data["addons"]
                created, updated = 0, 0
                for adata in raw_addons:
                    name = adata.get("name")
                    if not name:
                        continue
                    addon_obj = db.session.scalar(select(Addon).where(Addon.name == name))
                    if not addon_obj:
                        addon_obj = Addon(name=name)
                        db.session.add(addon_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in [
                        "associated_target", "category", "description",
                        "icon_url", "icon_local_path", "rarity", "translations"
                    ]:
                        if k in adata:
                            setattr(addon_obj, k, adata[k])
                db.session.flush()
                summary["addons"] = {"created": created, "updated": updated}

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
                        "image_url", "callout_image_url", "callout_image_local_path"
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
                db.session.flush()
                summary["maps"] = {"created": created, "updated": updated}

            if "users" in target_keys and "users" in data:
                raw_users = data["users"]
                created, updated = 0, 0
                for udata in raw_users:
                    username = udata.get("username")
                    if not username:
                        continue
                    user_obj = db.session.scalar(select(User).where(User.username == username))
                    if not user_obj:
                        user_obj = User(
                            username=username,
                            email=udata.get("email", f"{username}@lemondbd.com"),
                            password_hash=udata.get("password_hash", ""),
                            role=udata.get("role", "user"),
                            avatar_url=udata.get("avatar_url", "default_avatar"),
                            is_active=udata.get("is_active", True),
                        )
                        db.session.add(user_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in ["email", "password_hash", "role", "avatar_url", "is_active"]:
                        if k in udata and udata[k] is not None:
                            setattr(user_obj, k, udata[k])
                    if "created_at" in udata and udata["created_at"]:
                        user_obj.created_at = _parse_datetime(udata["created_at"]) or user_obj.created_at
                db.session.flush()
                summary["users"] = {"created": created, "updated": updated}

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

            if "community_builds" in target_keys and "community_builds" in data:
                raw_builds = data["community_builds"]
                created, updated = 0, 0
                for bdata in raw_builds:
                    title = bdata.get("title")
                    if not title:
                        continue
                    build_obj = db.session.scalar(select(CommunityBuild).where(CommunityBuild.title == title))
                    if not build_obj:
                        build_obj = CommunityBuild(
                            title=title,
                            description=bdata.get("description", ""),
                            role=bdata.get("role", "Survivor"),
                            category=bdata.get("category", "Meta"),
                        )
                        db.session.add(build_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in ["description", "role", "category", "character_id", "perks_json", "upvotes", "author"]:
                        if k in bdata:
                            setattr(build_obj, k, bdata[k])
                db.session.flush()
                summary["community_builds"] = {"created": created, "updated": updated}

            if "custom_perks" in target_keys and "custom_perks" in data:
                raw_cperks = data["custom_perks"]
                created, updated = 0, 0
                for cpdata in raw_cperks:
                    name = cpdata.get("name")
                    if not name:
                        continue
                    cp_obj = db.session.scalar(select(CustomPerk).where(CustomPerk.name == name))
                    if not cp_obj:
                        cp_obj = CustomPerk(
                            name=name,
                            role=cpdata.get("role", "Survivor"),
                            rarity=cpdata.get("rarity", "Very Rare"),
                            description=cpdata.get("description", ""),
                        )
                        db.session.add(cp_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in ["role", "character_name", "rarity", "icon_preset", "description", "upvotes", "author"]:
                        if k in cpdata:
                            setattr(cp_obj, k, cpdata[k])
                db.session.flush()
                summary["custom_perks"] = {"created": created, "updated": updated}

            if "daily_quests" in target_keys and "daily_quests" in data:
                raw_quests = data["daily_quests"]
                created, updated = 0, 0
                for qdata in raw_quests:
                    title = qdata.get("title")
                    if not title:
                        continue
                    q_obj = db.session.scalar(select(DailyQuest).where(DailyQuest.title == title))
                    if not q_obj:
                        q_obj = DailyQuest(
                            title=title,
                            description=qdata.get("description", ""),
                            category=qdata.get("category", "General"),
                        )
                        db.session.add(q_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in ["description", "category", "progress", "goal", "xp_reward", "is_completed"]:
                        if k in qdata:
                            setattr(q_obj, k, qdata[k])
                db.session.flush()
                summary["daily_quests"] = {"created": created, "updated": updated}

            if "bug_reports" in target_keys and "bug_reports" in data:
                raw_reports = data["bug_reports"]
                created, updated = 0, 0
                for rdata in raw_reports:
                    title = rdata.get("title")
                    if not title:
                        continue
                    r_obj = db.session.scalar(select(BugReport).where(BugReport.title == title))
                    if not r_obj:
                        r_obj = BugReport(
                            title=title,
                            reporter_name=rdata.get("reporter_name", "Anonymous"),
                            message=rdata.get("message", ""),
                        )
                        db.session.add(r_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in ["reporter_name", "reporter_email", "category", "message", "images_json", "status", "admin_notes"]:
                        if k in rdata:
                            setattr(r_obj, k, rdata[k])
                db.session.flush()
                summary["bug_reports"] = {"created": created, "updated": updated}

            if "generator_settings" in target_keys and "generator_settings" in data:
                raw_settings = data["generator_settings"]
                created, updated = 0, 0
                for sdata in raw_settings:
                    role = sdata.get("role", "Survivor")
                    s_obj = db.session.scalar(select(GeneratorSetting).where(GeneratorSetting.role == role))
                    if not s_obj:
                        s_obj = GeneratorSetting(role=role)
                        db.session.add(s_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in [
                        "gen_mode", "no_repeat_perks", "total_pages",
                        "perks_per_page", "last_page_perks", "spin_duration_sec"
                    ]:
                        if k in sdata:
                            setattr(s_obj, k, sdata[k])
                db.session.flush()
                summary["generator_settings"] = {"created": created, "updated": updated}

            if "guesser_stats" in target_keys and "guesser_stats" in data:
                raw_gstats = data["guesser_stats"]
                created, updated = 0, 0
                for gsdata in raw_gstats:
                    gtype = gsdata.get("guesser_type")
                    if not gtype:
                        continue
                    gs_obj = db.session.scalar(select(GuesserStat).where(GuesserStat.guesser_type == gtype))
                    if not gs_obj:
                        gs_obj = GuesserStat(guesser_type=gtype)
                        db.session.add(gs_obj)
                        created += 1
                    else:
                        updated += 1

                    for k in ["current_streak", "best_streak", "total_guesses", "correct_guesses"]:
                        if k in gsdata:
                            setattr(gs_obj, k, gsdata[k])
                db.session.flush()
                summary["guesser_stats"] = {"created": created, "updated": updated}

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
```

### backend/app/services/db/maintenance.py
```python
from flask import current_app
from sqlalchemy import select
from app.core.extensions import db
from app.models import GauntletRun, PageStreakRun


def prune_stale_character_rows(valid_names: set[str] | None, get_conn_fn) -> dict[str, int]:
    """Delete run rows pinned to characters that no longer exist."""
    names = {str(n) for n in (valid_names or set())}
    if not names:
        return {}

    deleted: dict[str, int] = {}
    if get_conn_fn:
        conn = get_conn_fn()
        try:
            cursor = conn.cursor()
            cursor.execute("PRAGMA foreign_keys = ON;")

            for table, column in (("gauntlet_runs", "current_character_id"), ("page_streak_runs", "killer")):
                cursor.execute(f"SELECT id, {column} AS character_name FROM {table};")
                stale = [row["id"] for row in cursor.fetchall() if row["character_name"] not in names]
                if stale:
                    placeholders = ",".join("?" for _ in stale)
                    cursor.execute(f"DELETE FROM {table} WHERE id IN ({placeholders});", stale)
                deleted[table] = len(stale)

            conn.commit()
            return deleted
        finally:
            try:
                conn.close()
            except Exception:
                pass

    try:
        if current_app:
            stale_cr = db.session.scalars(
                select(GauntletRun).where(~GauntletRun.current_character_id.in_(names))
            ).all()
            deleted["gauntlet_runs"] = len(stale_cr)
            for cr in stale_cr:
                db.session.delete(cr)

            stale_psr = db.session.scalars(
                select(PageStreakRun).where(~PageStreakRun.killer.in_(names))
            ).all()
            deleted["page_streak_runs"] = len(stale_psr)
            for psr in stale_psr:
                db.session.delete(psr)

            db.session.commit()
            return deleted
    except Exception:
        pass

    return deleted
```

### backend/app/services/db/raw_schema.py
```python
import logging
import sqlite3

logger = logging.getLogger(__name__)

SQLITE_FALLBACK_DDL = """
CREATE TABLE IF NOT EXISTS perk_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    slot1_type TEXT NOT NULL DEFAULT 'character_own',
    slot2_type TEXT NOT NULL DEFAULT 'character_own',
    slot3_type TEXT NOT NULL DEFAULT 'general_role',
    slot4_type TEXT NOT NULL DEFAULT 'any_role',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gauntlet_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT NOT NULL CHECK (role IN ('survivor', 'killer')),
    status TEXT NOT NULL DEFAULT 'in_progress',
    game_mode TEXT NOT NULL DEFAULT 'original',
    target_revealed BOOLEAN NOT NULL DEFAULT 0,
    current_character_id TEXT NOT NULL,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    last_checkpoint_streak INTEGER NOT NULL DEFAULT 0,
    completed_characters_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_characters_json TEXT NOT NULL DEFAULT '[]',
    current_loadout_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gauntlet_match_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    character_id TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    perks_json TEXT NOT NULL,
    streak_before INTEGER NOT NULL,
    streak_after INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES gauntlet_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chaos_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hell')),
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    last_checkpoint_streak INTEGER NOT NULL DEFAULT 0,
    completed_killers_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_killers_json TEXT NOT NULL DEFAULT '[]',
    used_perks_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_used_perks_json TEXT NOT NULL DEFAULT '[]',
    current_perks_json TEXT NOT NULL DEFAULT '[]',
    current_addon_rarities_json TEXT NOT NULL DEFAULT '[]',
    perks_revealed BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chaos_match_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    killer_id TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    perks_json TEXT NOT NULL,
    addon_rarities_json TEXT NOT NULL,
    streak_before INTEGER NOT NULL,
    streak_after INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES chaos_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS history_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mode TEXT NOT NULL CHECK (mode IN ('medium', 'hell')),
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_row_index INTEGER NOT NULL DEFAULT 0,
    total_killers_beaten INTEGER NOT NULL DEFAULT 0,
    best_killers_beaten INTEGER NOT NULL DEFAULT 0,
    completed_killers_json TEXT NOT NULL DEFAULT '[]',
    unlocked_perk_names_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_row_index INTEGER NOT NULL DEFAULT 0,
    checkpoint_total_killers_beaten INTEGER NOT NULL DEFAULT 0,
    checkpoint_completed_killers_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_unlocked_perk_names_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_match_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    killer_id TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    row_index INTEGER NOT NULL,
    streak_before INTEGER NOT NULL,
    streak_after INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES history_runs(id) ON DELETE CASCADE
);

INSERT INTO perk_rules (id, name, is_default, slot1_type, slot2_type, slot3_type, slot4_type)
SELECT 1, 'Default Balanced (2 Own, 1 General, 1 Any)', 1, 'character_own', 'character_own', 'general_role', 'any_role'
WHERE NOT EXISTS (SELECT 1 FROM perk_rules WHERE id = 1);

CREATE TABLE IF NOT EXISTS generator_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    role TEXT NOT NULL DEFAULT 'Survivor',
    gen_mode TEXT NOT NULL DEFAULT 'instant',
    no_repeat_perks BOOLEAN NOT NULL DEFAULT 1,
    total_pages INTEGER NOT NULL DEFAULT 12,
    perks_per_page INTEGER NOT NULL DEFAULT 15,
    last_page_perks INTEGER NOT NULL DEFAULT 8,
    spin_duration_sec REAL NOT NULL DEFAULT 3.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generator_drawn_perks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    perk_name TEXT NOT NULL,
    drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, perk_name)
);

CREATE TABLE IF NOT EXISTS draft_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT UNIQUE NOT NULL,
    phase TEXT NOT NULL DEFAULT 'bans' CHECK (phase IN ('bans', 'picks', 'complete')),
    banned_perks TEXT NOT NULL DEFAULT '[]',
    picked_survivor_perks TEXT NOT NULL DEFAULT '[]',
    picked_killer_perks TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('daily', 'weekly')),
    progress INTEGER NOT NULL DEFAULT 0,
    goal INTEGER NOT NULL DEFAULT 1,
    xp_reward INTEGER NOT NULL DEFAULT 500,
    is_completed BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_builds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('survivor', 'killer')),
    category TEXT NOT NULL CHECK (category IN ('otzdarva', 'meta', 'meme', 'stealth', 'chase')),
    character_id TEXT NOT NULL DEFAULT 'all',
    perks_json TEXT NOT NULL DEFAULT '[]',
    upvotes INTEGER NOT NULL DEFAULT 0,
    author TEXT NOT NULL DEFAULT 'Community',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_perks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('survivor', 'killer')),
    character_name TEXT NOT NULL DEFAULT 'Teachable',
    rarity TEXT NOT NULL CHECK (rarity IN ('Iridescent', 'Very Rare', 'Uncommon')),
    icon_preset TEXT NOT NULL DEFAULT 'sparkles',
    description TEXT NOT NULL,
    upvotes INTEGER NOT NULL DEFAULT 0,
    author TEXT NOT NULL DEFAULT 'Community',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS map_realms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    realm TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'hens333',
    source_label TEXT NOT NULL DEFAULT 'Hens333 12-Clock Callouts',
    layout_type TEXT,
    jungle_gyms_count INTEGER DEFAULT 0,
    totem_spawns_count INTEGER DEFAULT 5,
    pallet_density TEXT,
    shack_has_basement BOOLEAN DEFAULT 1,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS map_tiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id TEXT NOT NULL,
    seed_variant TEXT NOT NULL DEFAULT 'seed_a',
    floor INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    has_pallet BOOLEAN NOT NULL DEFAULT 0,
    pallet_safety_rating TEXT CHECK (pallet_safety_rating IS NULL OR pallet_safety_rating IN ('god', 'safe', 'mindgameable', 'unsafe')),
    has_window BOOLEAN NOT NULL DEFAULT 0,
    vault_directions TEXT DEFAULT '[]',
    looping_tips TEXT NOT NULL DEFAULT '',
    mindgame_counter TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES map_realms(map_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS map_objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id TEXT NOT NULL,
    seed_variant TEXT NOT NULL DEFAULT 'seed_a',
    floor INTEGER NOT NULL DEFAULT 1,
    type TEXT NOT NULL CHECK (type IN ('totem', 'generator', 'exit_gate', 'hatch', 'chest', 'basement')),
    x REAL NOT NULL,
    y REAL NOT NULL,
    location_description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES map_realms(map_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS page_streak_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    killer TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    attempt INTEGER NOT NULL DEFAULT 1,
    current_page INTEGER NOT NULL DEFAULT 1,
    best_page INTEGER NOT NULL DEFAULT 0,
    pages_json TEXT NOT NULL DEFAULT '[]',
    snapshot_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS page_streak_page_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    attempt INTEGER NOT NULL,
    page_number INTEGER NOT NULL,
    perks_json TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES page_streak_runs(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO generator_settings (id, role, gen_mode, no_repeat_perks)
VALUES (1, 'Survivor', 'instant', 1);

CREATE TABLE IF NOT EXISTS guesser_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guesser_type TEXT UNIQUE NOT NULL,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    total_guesses INTEGER NOT NULL DEFAULT 0,
    correct_guesses INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO guesser_stats (guesser_type, current_streak, best_streak, total_guesses, correct_guesses) VALUES ('character', 0, 0, 0, 0);
INSERT OR IGNORE INTO guesser_stats (guesser_type, current_streak, best_streak, total_guesses, correct_guesses) VALUES ('perk_description', 0, 0, 0, 0);
INSERT OR IGNORE INTO guesser_stats (guesser_type, current_streak, best_streak, total_guesses, correct_guesses) VALUES ('perk_name_to_icon', 0, 0, 0, 0);
INSERT OR IGNORE INTO guesser_stats (guesser_type, current_streak, best_streak, total_guesses, correct_guesses) VALUES ('perk_icon_to_name', 0, 0, 0, 0);
INSERT OR IGNORE INTO guesser_stats (guesser_type, current_streak, best_streak, total_guesses, correct_guesses) VALUES ('memes', 0, 0, 0, 0);

CREATE TABLE IF NOT EXISTS smash_pass_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_slug TEXT UNIQUE NOT NULL,
    character_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Survivor',
    gender TEXT NOT NULL DEFAULT 'female',
    smash_count INTEGER NOT NULL DEFAULT 0,
    pass_count INTEGER NOT NULL DEFAULT 0,
    super_smash_count INTEGER NOT NULL DEFAULT 0,
    total_votes INTEGER NOT NULL DEFAULT 0,
    smash_rate REAL NOT NULL DEFAULT 50.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS smash_pass_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_slug TEXT NOT NULL,
    vote_type TEXT NOT NULL,
    user_id INTEGER,
    session_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rosters (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name_i18n_key TEXT NOT NULL,
    description_i18n_key TEXT NOT NULL,
    cover_image_url TEXT,
    theme_color TEXT NOT NULL DEFAULT '#ff0055',
    category TEXT NOT NULL DEFAULT 'DBD',
    is_nsfw BOOLEAN NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    roster_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Survivor',
    gender TEXT NOT NULL DEFAULT 'female',
    media_url TEXT,
    media_type TEXT NOT NULL DEFAULT 'image',
    metadata_json TEXT DEFAULT '{}',
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roster_id) REFERENCES rosters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entity_stats (
    id TEXT PRIMARY KEY,
    entity_id TEXT UNIQUE NOT NULL,
    smash_count INTEGER NOT NULL DEFAULT 0,
    pass_count INTEGER NOT NULL DEFAULT 0,
    super_smash_count INTEGER NOT NULL DEFAULT 0,
    total_votes INTEGER NOT NULL DEFAULT 0,
    smash_rate REAL NOT NULL DEFAULT 0.0,
    chaos_rating REAL NOT NULL DEFAULT 50.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    session_id TEXT,
    user_id INTEGER,
    vote_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS translations (
    id TEXT PRIMARY KEY,
    locale TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


def init_raw_sqlite_schema(conn: sqlite3.Connection) -> None:
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(map_realms);")
        cols = [row[1] for row in cursor.fetchall()]
        if cols:
            if "map_id" not in cols:
                cursor.execute("DROP TABLE IF EXISTS map_realms;")
                cursor.execute("DROP TABLE IF EXISTS map_tiles;")
                cursor.execute("DROP TABLE IF EXISTS map_objectives;")
                conn.commit()
            else:
                if "source" not in cols:
                    try:
                        cursor.execute("ALTER TABLE map_realms ADD COLUMN source TEXT NOT NULL DEFAULT 'hens333';")
                    except Exception:
                        pass
                if "source_label" not in cols:
                    try:
                        cursor.execute("ALTER TABLE map_realms ADD COLUMN source_label TEXT NOT NULL DEFAULT 'Hens333 12-Clock Callouts';")
                    except Exception:
                        pass
                conn.commit()

        cursor.executescript(SQLITE_FALLBACK_DDL)
        conn.commit()
    except Exception as e:
        logger.error(f"Fallback SQLite init_db failed: {e}")
```

### backend/app/services/db/seeders.py
```python
import logging
from sqlalchemy import select
from app.models import GeneratorSetting, GuesserStat, PerkRule

logger = logging.getLogger(__name__)

GUESSER_TYPES: list[str] = [
    "character",
    "perk_description",
    "perk_name_to_icon",
    "perk_icon_to_name",
    "memes",
]


def seed_default_configs(db) -> None:
    """Seeds baseline settings and rules into the SQLAlchemy session if not already present."""
    try:
        default_rule = db.session.get(PerkRule, 1)
        if not default_rule:
            db.session.add(
                PerkRule(
                    id=1,
                    name="Default Balanced (2 Own, 1 General, 1 Any)",
                    is_default=True,
                    slot1_type="character_own",
                    slot2_type="character_own",
                    slot3_type="general_role",
                    slot4_type="any_role",
                )
            )

        gen_setting = db.session.get(GeneratorSetting, 1)
        if not gen_setting:
            db.session.add(
                GeneratorSetting(
                    id=1,
                    role="Survivor",
                    gen_mode="instant",
                    no_repeat_perks=True,
                )
            )

        for g_type in GUESSER_TYPES:
            stat = db.session.scalars(
                select(GuesserStat).where(GuesserStat.guesser_type == g_type)
            ).first()
            if not stat:
                db.session.add(GuesserStat(guesser_type=g_type))

        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.warning(f"Error seeding default settings in SQLAlchemy: {e}")
```

### backend/app/services/gauntlet/__init__.py
```python
from app.services.gauntlet.constants import (
    BUILD_SIZE,
    CHECKPOINT_INTERVAL,
    GENERAL_CHARACTER,
    KILLER_TIERS,
    ORIGINAL_KILLER_ROSTER_LIMIT,
    ORIGINAL_SURVIVOR_ROSTER_LIMIT,
    SURVIVOR_TIERS,
    get_tier_info,
)
from app.services.gauntlet.roller import (
    get_character_teachable_perks,
    get_owned_character_ids,
    get_owned_character_names,
    pick_initial_target,
    resolve_character_names_by_ids,
    roll_gauntlet_target,
)
from app.services.gauntlet.stats import fetch_gauntlet_user_stats

__all__ = [
    "CHECKPOINT_INTERVAL",
    "BUILD_SIZE",
    "GENERAL_CHARACTER",
    "ORIGINAL_KILLER_ROSTER_LIMIT",
    "ORIGINAL_SURVIVOR_ROSTER_LIMIT",
    "SURVIVOR_TIERS",
    "KILLER_TIERS",
    "get_tier_info",
    "get_owned_character_names",
    "get_owned_character_ids",
    "resolve_character_names_by_ids",
    "get_character_teachable_perks",
    "pick_initial_target",
    "roll_gauntlet_target",
    "fetch_gauntlet_user_stats",
]
```

### backend/app/services/gauntlet/constants.py
```python
from typing import Any

CHECKPOINT_INTERVAL: int = 10
BUILD_SIZE: int = 4
GENERAL_CHARACTER: str = "General"

ORIGINAL_KILLER_ROSTER_LIMIT: int = 43
ORIGINAL_SURVIVOR_ROSTER_LIMIT: int = 52

SURVIVOR_TIERS: list[dict[str, Any]] = [
    {"min_streak": 0, "tier_level": 0, "name": "The Warm Up", "perk_limit": 4, "character_perks_only": False, "description": "Must include at least 1 character teachable perk"},
    {"min_streak": CHECKPOINT_INTERVAL, "tier_level": 1, "name": "The Thinning", "perk_limit": 3, "character_perks_only": False, "description": "Must include at least 1 character teachable perk"},
    {"min_streak": CHECKPOINT_INTERVAL * 2, "tier_level": 2, "name": "The Struggle", "perk_limit": 2, "character_perks_only": False, "description": "Must include at least 1 character teachable perk"},
    {"min_streak": CHECKPOINT_INTERVAL * 3, "tier_level": 3, "name": "The Hardcore", "perk_limit": 1, "character_perks_only": False, "description": "Must be a character teachable perk"},
    {"min_streak": CHECKPOINT_INTERVAL * 4, "tier_level": 4, "name": "The Legend", "perk_limit": 0, "character_perks_only": False, "description": "No perks allowed (no-perk trial)"},
]

KILLER_TIERS: list[dict[str, Any]] = [
    {"min_streak": 0, "tier_level": 0, "name": "The Bloodbath", "perk_limit": 3, "character_perks_only": True, "description": "All 3 of the killer's own perks"},
    {"min_streak": CHECKPOINT_INTERVAL, "tier_level": 1, "name": "The Obsession", "perk_limit": 2, "character_perks_only": True, "description": "Any 2 of the killer's own perks"},
    {"min_streak": CHECKPOINT_INTERVAL * 2, "tier_level": 2, "name": "The Executioner", "perk_limit": 1, "character_perks_only": True, "description": "Any 1 of the killer's own perks"},
    {"min_streak": CHECKPOINT_INTERVAL * 3, "tier_level": 3, "name": "The Entity", "perk_limit": 0, "character_perks_only": True, "description": "No perks allowed (no-perk trial)"},
]


def get_tier_info(streak: int, role: str) -> dict[str, Any]:
    tiers = KILLER_TIERS if role == "killer" else SURVIVOR_TIERS
    tier = tiers[0]
    for candidate in tiers:
        if streak >= candidate["min_streak"]:
            tier = candidate
    info = dict(tier)
    info.pop("min_streak")
    info["roster_limit"] = ORIGINAL_KILLER_ROSTER_LIMIT if role == "killer" else ORIGINAL_SURVIVOR_ROSTER_LIMIT
    return info
```

### backend/app/services/gauntlet/roller.py
```python
import random
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models import Character, Perk
from app.services.gauntlet.constants import (
    ORIGINAL_KILLER_ROSTER_LIMIT,
    ORIGINAL_SURVIVOR_ROSTER_LIMIT,
    get_tier_info,
)
from app.services.ownership_service import OwnershipService


def get_owned_character_names(user_id: int, role: str, ownership_service: OwnershipService) -> list[str]:
    db_role = "Killer" if role == "killer" else "Survivor"
    owned = ownership_service.get_user_characters(user_id, role=db_role)
    limit = ORIGINAL_KILLER_ROSTER_LIMIT if role == "killer" else ORIGINAL_SURVIVOR_ROSTER_LIMIT
    owned = [
        c for c in owned
        if c.get("release_number") is None or c["release_number"] <= limit
    ]
    return [c["name"] for c in owned if c["is_owned"] and not c.get("is_disabled")]


def get_owned_character_ids(user_id: int, role: str, ownership_service: OwnershipService) -> list[int]:
    db_role = "Killer" if role == "killer" else "Survivor"
    owned = ownership_service.get_user_characters(user_id, role=db_role)
    limit = ORIGINAL_KILLER_ROSTER_LIMIT if role == "killer" else ORIGINAL_SURVIVOR_ROSTER_LIMIT
    owned = [
        c for c in owned
        if c.get("release_number") is None or c["release_number"] <= limit
    ]
    return [c["id"] for c in owned if c["is_owned"] and not c.get("is_disabled")]


def resolve_character_names_by_ids(ids: list[int]) -> list[str]:
    if not ids:
        return []
    rows = db.session.scalars(select(Character).where(Character.id.in_(ids))).all()
    by_id = {c.id: c.name for c in rows}
    return [by_id[i] for i in ids if i in by_id]


def get_character_teachable_perks(character_name: str) -> list[dict[str, Any]]:
    perks = db.session.scalars(
        select(Perk)
        .join(Character, Perk.character_id == Character.id)
        .where(Character.name == character_name, Perk.is_teachable.is_(True), Perk.is_disabled.is_(False))
        .order_by(Perk.name.asc())
    ).all()
    return [p.to_dict() for p in perks]


def pick_initial_target(user_id: int, role: str, ownership_service: OwnershipService) -> str:
    names = get_owned_character_names(user_id, role, ownership_service)
    if names:
        return random.choice(names)
    return "Meg Thomas" if role == "survivor" else "The Trapper"


def roll_gauntlet_target(
    role: str,
    current_streak: int,
    completed_characters: list[str],
    owned_characters: list[str],
    target_character: str | None = None,
) -> tuple[str, dict[str, Any], dict[str, Any]]:
    tier_info = get_tier_info(current_streak, role)

    remaining = [c for c in owned_characters if c not in completed_characters]
    if not remaining:
        remaining = owned_characters if owned_characters else [
            "Meg Thomas" if role == "survivor" else "The Trapper"
        ]

    target_char = target_character if target_character else random.choice(remaining)

    loadout = {
        "character": target_char,
        "character_perks": get_character_teachable_perks(target_char),
        "tier_info": tier_info,
    }

    return target_char, loadout, tier_info
```

### backend/app/services/gauntlet/stats.py
```python
from typing import Any
from sqlalchemy import select

from app.core.extensions import db
from app.models import GauntletMatchLog, GauntletRun
from app.services.streak_stats import fetch_streak_stats


def fetch_gauntlet_user_stats(user_id: int, role: str) -> dict[str, Any]:
    run_ids = db.session.scalars(
        select(GauntletRun.id).where(GauntletRun.user_id == user_id, GauntletRun.role == role)
    ).all()
    return fetch_streak_stats(run_ids, GauntletMatchLog)
```

### backend/app/services/generator/__init__.py
```python
from app.services.generator.config_manager import (
    get_generator_config,
    update_generator_config,
)
from app.services.generator.drawn_manager import (
    add_drawn_perks,
    get_drawn_perks,
    reset_drawn_perks,
)

__all__ = [
    "get_generator_config",
    "update_generator_config",
    "get_drawn_perks",
    "add_drawn_perks",
    "reset_drawn_perks",
]
```

### backend/app/services/generator/config_manager.py
```python
import logging
from typing import Any
from flask import current_app

from app.core.extensions import db
from app.models import GeneratorSetting

logger = logging.getLogger(__name__)

CONFIG_FIELDS = [
    "role",
    "gen_mode",
    "no_repeat_perks",
    "total_pages",
    "perks_per_page",
    "last_page_perks",
    "spin_duration_sec",
]


def get_generator_config(use_sqlalchemy: bool, db_service: Any) -> dict[str, Any]:
    if use_sqlalchemy:
        try:
            if current_app:
                setting = db.session.get(GeneratorSetting, 1)
                if not setting:
                    setting = GeneratorSetting(
                        id=1,
                        role="Survivor",
                        gen_mode="instant",
                        no_repeat_perks=True,
                        total_pages=12,
                        perks_per_page=15,
                        last_page_perks=8,
                        spin_duration_sec=3.0,
                    )
                    db.session.add(setting)
                    db.session.commit()
                return setting.to_dict()
        except Exception as e:
            logger.debug(f"SQLAlchemy GeneratorService get_config fallback: {e}")

    conn = db_service.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM generator_settings WHERE id = 1;")
    row = cursor.fetchone()
    conn.close()

    return (
        dict(row)
        if row
        else {
            "role": "Survivor",
            "gen_mode": "instant",
            "no_repeat_perks": 1,
            "total_pages": 12,
            "perks_per_page": 15,
            "last_page_perks": 8,
            "spin_duration_sec": 3.0,
        }
    )


def update_generator_config(data: dict[str, Any], use_sqlalchemy: bool, db_service: Any) -> dict[str, Any]:
    if use_sqlalchemy:
        try:
            if current_app:
                setting = db.session.get(GeneratorSetting, 1)
                if not setting:
                    setting = GeneratorSetting(id=1)
                    db.session.add(setting)

                for key in CONFIG_FIELDS:
                    if key in data:
                        val = data[key]
                        if key == "no_repeat_perks":
                            val = bool(val)
                        setattr(setting, key, val)

                db.session.commit()
                return setting.to_dict()
        except Exception as e:
            logger.debug(f"SQLAlchemy GeneratorService update_config fallback: {e}")

    conn = db_service.get_connection()
    cursor = conn.cursor()
    fields = []
    values = []

    for key in CONFIG_FIELDS:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])

    if fields:
        values.append(1)
        query = f"UPDATE generator_settings SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;"
        cursor.execute(query, tuple(values))
        conn.commit()
    conn.close()

    return get_generator_config(use_sqlalchemy=False, db_service=db_service)
```

### backend/app/services/generator/drawn_manager.py
```python
import logging
from typing import Any
from flask import current_app
from sqlalchemy import delete, select

from app.core.extensions import db
from app.models import GeneratorDrawnPerk

logger = logging.getLogger(__name__)


def get_drawn_perks(role: str | None, use_sqlalchemy: bool, db_service: Any) -> list[str]:
    role_clean = (role or "Survivor").capitalize()

    if use_sqlalchemy:
        try:
            if current_app:
                stmt = select(GeneratorDrawnPerk.perk_name).where(GeneratorDrawnPerk.role == role_clean)
                rows = db.session.scalars(stmt).all()
                return list(rows)
        except Exception as e:
            logger.debug(f"SQLAlchemy GeneratorService get_drawn_perks fallback: {e}")

    conn = db_service.get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT perk_name FROM generator_drawn_perks WHERE role = ?;",
        (role_clean,),
    )
    rows = cursor.fetchall()
    conn.close()

    return [row[0] for row in rows]


def add_drawn_perks(role: str | None, perk_names: list[str], use_sqlalchemy: bool, db_service: Any) -> list[str]:
    role_clean = (role or "Survivor").capitalize()

    if use_sqlalchemy:
        try:
            if current_app:
                for name in perk_names:
                    exists = db.session.scalars(
                        select(GeneratorDrawnPerk).where(
                            GeneratorDrawnPerk.role == role_clean,
                            GeneratorDrawnPerk.perk_name == name,
                        )
                    ).first()
                    if not exists:
                        db.session.add(GeneratorDrawnPerk(role=role_clean, perk_name=name))
                db.session.commit()
                return get_drawn_perks(role_clean, use_sqlalchemy=True, db_service=db_service)
        except Exception as e:
            logger.debug(f"SQLAlchemy GeneratorService add_drawn_perks fallback: {e}")

    conn = db_service.get_connection()
    cursor = conn.cursor()
    for name in perk_names:
        cursor.execute(
            """
            INSERT OR IGNORE INTO generator_drawn_perks (role, perk_name)
            VALUES (?, ?);
            """,
            (role_clean, name),
        )
    conn.commit()
    conn.close()

    return get_drawn_perks(role_clean, use_sqlalchemy=False, db_service=db_service)


def reset_drawn_perks(role: str | None, use_sqlalchemy: bool, db_service: Any) -> list[str]:
    if use_sqlalchemy:
        try:
            if current_app:
                if role:
                    role_clean = role.capitalize()
                    db.session.execute(delete(GeneratorDrawnPerk).where(GeneratorDrawnPerk.role == role_clean))
                else:
                    db.session.execute(delete(GeneratorDrawnPerk))
                db.session.commit()
                return []
        except Exception as e:
            logger.debug(f"SQLAlchemy GeneratorService reset_drawn_perks fallback: {e}")

    conn = db_service.get_connection()
    cursor = conn.cursor()
    if role:
        cursor.execute(
            "DELETE FROM generator_drawn_perks WHERE role = ?;",
            (role.capitalize(),),
        )
    else:
        cursor.execute("DELETE FROM generator_drawn_perks;")
    conn.commit()
    conn.close()

    return []
```