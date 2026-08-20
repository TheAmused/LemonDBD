# backend/app/services/db/export_import.py
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import delete, select
from app.core.extensions import db
from app.models.character import Character
from app.models.perk import Perk
from app.models.equipment import Item, Addon
from app.models.map import MapRealm, MapTile, MapObjective
from app.models.user import User, UserCharacterOwnership, UserPerkOwnership
from app.models.community import DailyQuest, CommunityBuild, CustomPerk, BugReport
from app.models.minigames import GeneratorSetting, GeneratorDrawnPerk, GuesserStat, DraftSession

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


def _parse_datetime(val: Optional[str]) -> Optional[datetime]:
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
    def export_database(cls, targets: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Exports database entities as a structured dictionary.
        If targets is None or empty, exports all supported entity tables.
        """
        target_set: Set[str] = set(targets) if targets else set(SUPPORTED_EXPORT_TARGETS)
        export_data: Dict[str, Any] = {}
        counts: Dict[str, int] = {}

        # 1. Characters
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

        # 2. Perks
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

        # 3. Items
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

        # 4. Add-ons
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

        # 5. Maps (Realms, Tiles, Objectives)
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
                        "label": o.label,
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

        # 6. Users
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

        # 7. Ownerships
        if "ownerships" in target_set:
            char_owns = db.session.scalars(select(UserCharacterOwnership)).all()
            perk_owns = db.session.scalars(select(UserPerkOwnership)).all()
            export_data["ownerships"] = {
                "characters": [
                    {
                        "username": co.user.username if co.user else None,
                        "character_name": co.character.name if co.character else None,
                        "is_owned": co.is_owned,
                        "is_prestiged": co.is_prestiged,
                        "prestige_level": co.prestige_level,
                    }
                    for co in char_owns
                    if co.user and co.character
                ],
                "perks": [
                    {
                        "username": po.user.username if po.user else None,
                        "perk_name": po.perk.name if po.perk else None,
                        "is_unlocked": po.is_unlocked,
                        "tier": po.tier,
                        "favorite": po.favorite,
                    }
                    for po in perk_owns
                    if po.user and po.perk
                ],
            }
            counts["character_ownerships"] = len(export_data["ownerships"]["characters"])
            counts["perk_ownerships"] = len(export_data["ownerships"]["perks"])

        # 8. Community Builds
        if "community_builds" in target_set:
            builds = db.session.scalars(select(CommunityBuild).order_by(CommunityBuild.id)).all()
            build_list = [b.to_dict() for b in builds]
            export_data["community_builds"] = build_list
            counts["community_builds"] = len(build_list)

        # 9. Custom Perks
        if "custom_perks" in target_set:
            cperks = db.session.scalars(select(CustomPerk).order_by(CustomPerk.id)).all()
            cperk_list = [cp.to_dict() for cp in cperks]
            export_data["custom_perks"] = cperk_list
            counts["custom_perks"] = len(cperk_list)

        # 10. Daily Quests
        if "daily_quests" in target_set:
            quests = db.session.scalars(select(DailyQuest).order_by(DailyQuest.id)).all()
            quest_list = [q.to_dict() for q in quests]
            export_data["daily_quests"] = quest_list
            counts["daily_quests"] = len(quest_list)

        # 11. Bug Reports
        if "bug_reports" in target_set:
            reports = db.session.scalars(select(BugReport).order_by(BugReport.id)).all()
            report_list = [r.to_dict() for r in reports]
            export_data["bug_reports"] = report_list
            counts["bug_reports"] = len(report_list)

        # 12. Generator Settings
        if "generator_settings" in target_set:
            settings = db.session.scalars(select(GeneratorSetting).order_by(GeneratorSetting.id)).all()
            setting_list = [s.to_dict() for s in settings]
            export_data["generator_settings"] = setting_list
            counts["generator_settings"] = len(setting_list)

        # 13. Guesser Stats
        if "guesser_stats" in target_set:
            gstats = db.session.scalars(select(GuesserStat).order_by(GuesserStat.id)).all()
            gstat_list = [gs.to_dict() for gs in gstats]
            export_data["guesser_stats"] = gstat_list
            counts["guesser_stats"] = len(gstat_list)

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
        payload: Dict[str, Any],
        mode: str = "merge",
        targets: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Imports and deserializes database payload.
        mode:
          - 'merge': Updates existing records by unique key, inserts new ones.
          - 'replace': Purges target tables first, then inserts imported records.
        """
        if not isinstance(payload, dict):
            raise ValueError("Invalid JSON payload: root must be an object.")

        data: Dict[str, Any] = payload.get("data", payload)
        target_keys = set(targets) if targets else set(data.keys())
        summary: Dict[str, Dict[str, int]] = {}

        try:
            # 1. In 'replace' mode, purge tables in reverse dependency order
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

            # 2. Characters
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

            # Build character lookup by name/real_name/wiki_slug
            char_map: Dict[str, int] = {}
            for c in db.session.scalars(select(Character)).all():
                char_map[c.name.strip().lower()] = c.id
                if c.real_name:
                    char_map[c.real_name.strip().lower()] = c.id
                if c.wiki_slug:
                    char_map[c.wiki_slug.strip().lower()] = c.id

            # 3. Perks
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

                    # Resolve character_id
                    char_name = pdata.get("character_name")
                    if char_name:
                        char_id = char_map.get(char_name.strip().lower())
                        if char_id:
                            perk_obj.character_id = char_id
                db.session.flush()
                summary["perks"] = {"created": created, "updated": updated}

            # 4. Items
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

            # 5. Add-ons
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

            # 6. Maps (Realms, Tiles, Objectives)
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

                    # Sync MapTiles
                    if "tiles" in mdata:
                        # Clear old tiles and recreate
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

                    # Sync MapObjectives
                    if "objectives" in mdata:
                        db.session.execute(delete(MapObjective).where(MapObjective.map_id == map_id))
                        for odata in mdata["objectives"]:
                            obj = MapObjective(
                                map_id=map_id,
                                type=odata.get("type", "generator"),
                                x=float(odata.get("x", 0.0)),
                                y=float(odata.get("y", 0.0)),
                                label=odata.get("label", ""),
                                floor=int(odata.get("floor", 1)),
                            )
                            db.session.add(obj)
                db.session.flush()
                summary["maps"] = {"created": created, "updated": updated}

            # 7. Users
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

            # Build user lookup & perk lookup
            user_map: Dict[str, int] = {u.username: u.id for u in db.session.scalars(select(User)).all()}
            perk_map: Dict[str, int] = {p.name.strip().lower(): p.id for p in db.session.scalars(select(Perk)).all()}

            # 8. Ownerships
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
                        co.is_prestiged = co_data.get("is_prestiged", False)
                        co.prestige_level = co_data.get("prestige_level", 0)

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
                        po.tier = po_data.get("tier", 3)
                        po.favorite = po_data.get("favorite", False)

                db.session.flush()
                summary["character_ownerships"] = {"created": char_created, "updated": char_updated}
                summary["perk_ownerships"] = {"created": perk_created, "updated": perk_updated}

            # 9. Community Builds
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

            # 10. Custom Perks
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

            # 11. Daily Quests
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

            # 12. Bug Reports
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

            # 13. Generator Settings
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

            # 14. Guesser Stats
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

            # Refresh in-memory caches
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
