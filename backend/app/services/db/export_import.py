# backend/app/services/db/export_import.py
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select
from app.core.extensions import db
from app.core.json_provider import safe_json_loads
from app.models.character import Character
from app.models.perk import Perk
from app.models.equipment import Item, Addon
from app.models.map import MapRealm, MapTile, MapObjective, Realm
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
                    "translations": r.translations or {},
                    "tiles": tiles,
                    "objectives": objectives,
                })
            export_data["maps"] = map_list
            counts["maps"] = len(map_list)

        if "maps" in target_set or "realms" in target_set:
            realms_banner = db.session.scalars(select(Realm).order_by(Realm.id)).all()
            realm_list = []
            for rb in realms_banner:
                realm_list.append({
                    "name": rb.name,
                    "image_url": rb.image_url,
                    "image_local_path": rb.image_local_path,
                    "translations": rb.translations or {},
                })
            export_data["realms"] = realm_list
            counts["realms"] = len(realm_list)

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
                if "maps" in target_keys or "realms" in target_keys:
                    db.session.execute(delete(Realm))
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
                db.session.flush()
                summary["maps"] = {"created": created, "updated": updated}

            if ("maps" in target_keys or "realms" in target_keys) and "realms" in data:
                raw_realms = data["realms"]
                created, updated = 0, 0
                for rdata in raw_realms:
                    name = rdata.get("name")
                    if not name:
                        continue
                    realm_banner = db.session.scalar(select(Realm).where(Realm.name == name))
                    if not realm_banner:
                        realm_banner = Realm(
                            name=name,
                            image_url=rdata.get("image_url", ""),
                            image_local_path=rdata.get("image_local_path", ""),
                        )
                        db.session.add(realm_banner)
                        created += 1
                    else:
                        updated += 1

                    for k in ["image_url", "image_local_path", "translations"]:
                        if k in rdata:
                            setattr(realm_banner, k, rdata[k])
                db.session.flush()
                summary["realms"] = {"created": created, "updated": updated}

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
