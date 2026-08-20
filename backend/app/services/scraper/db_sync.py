# backend/app/services/scraper/db_sync.py
import json
import logging
from typing import Dict, List, Optional
from sqlalchemy import select

from app.core.extensions import db
from app.models import Addon, Character, Item, MapRealm, MapTile, Perk
from app.scrapers.types import AddonData, CharacterData, ItemData, MapData, PerkData
from app.scrapers.utils import clean_description_text, normalize_name_key, sanitize_filename

logger = logging.getLogger(__name__)


def ensure_translations_columns():
    """Ensure translations JSONB/JSON column exists in SQLite/PostgreSQL tables."""
    try:
        from app.services.db.migrations import migrate_runtime_columns
        migrate_runtime_columns(db)
    except Exception as e:
        logger.debug(f"ensure_translations_columns error: {e}")


def sync_characters_to_db(characters: List[CharacterData]) -> Dict[str, Character]:
    """Upsert canonical characters and return lookup dictionary."""
    existing_chars = {
        normalize_name_key(c.name): c
        for c in db.session.scalars(select(Character)).all()
    }

    if not characters:
        return existing_chars

    for c in characters:
        role = getattr(c, "category", "Survivor")
        c_name = c.name.strip()
        norm_c_name = normalize_name_key(c_name)

        existing_char = existing_chars.get(norm_c_name)
        p_name = c.power.name if c.power else None
        p_desc = c.power.description if c.power else None
        p_icon = c.power.icon_url if c.power else None
        p_speed = c.power.movement_speed if c.power else None
        p_tr = c.power.terror_radius if c.power else None
        p_trm = c.power.terror_radius_meters if c.power else None
        p_height = c.power.height if c.power else None

        cp_raw = getattr(c, "dlc_counterparts", None)
        cp_str = json.dumps(cp_raw) if isinstance(cp_raw, list) else cp_raw
        trans = getattr(c, "translations", None) or {}

        if existing_char:
            existing_char.role = role
            existing_char.code_prefix = c.code_prefix
            existing_char.portrait_url = c.avatar_url
            existing_char.real_name = c.real_name or c_name
            existing_char.short_name = c.short_name or ""
            existing_char.wiki_slug = c.wiki_slug or ""
            existing_char.avatar_local_path = c.avatar_local_path or ""
            existing_char.release_number = c.release_number
            if getattr(c, "chapter_name", None):
                existing_char.chapter_name = c.chapter_name
            if getattr(c, "chapter_number", None):
                existing_char.chapter_number = c.chapter_number
            if getattr(c, "dlc_type", None):
                existing_char.dlc_type = c.dlc_type
            if getattr(c, "is_licensed", None) is not None:
                existing_char.is_licensed = c.is_licensed
            if getattr(c, "release_year", None):
                existing_char.release_year = c.release_year
            if getattr(c, "release_date", None):
                existing_char.release_date = c.release_date
            if cp_str is not None:
                existing_char.dlc_counterparts = cp_str
            if getattr(c, "lore", None):
                existing_char.lore = c.lore
            if trans:
                existing_char.translations = trans
            if c.power:
                existing_char.power_name = p_name
                existing_char.power_description = p_desc
                existing_char.power_icon_url = p_icon
                existing_char.movement_speed = p_speed
                existing_char.terror_radius = p_tr
                existing_char.terror_radius_meters = p_trm
                existing_char.height = p_height
        else:
            new_char = Character(
                name=c_name,
                role=role,
                code_prefix=c.code_prefix,
                portrait_url=c.avatar_url or "",
                real_name=c.real_name or c_name,
                short_name=c.short_name or "",
                wiki_slug=c.wiki_slug or "",
                avatar_local_path=c.avatar_local_path or "",
                release_number=c.release_number,
                chapter_name=getattr(c, "chapter_name", None),
                chapter_number=getattr(c, "chapter_number", None),
                dlc_type=getattr(c, "dlc_type", None),
                is_licensed=getattr(c, "is_licensed", False),
                release_year=getattr(c, "release_year", None),
                release_date=getattr(c, "release_date", None),
                dlc_counterparts=cp_str,
                lore=getattr(c, "lore", None),
                power_name=p_name,
                power_description=p_desc,
                power_icon_url=p_icon,
                movement_speed=p_speed,
                terror_radius=p_tr,
                terror_radius_meters=p_trm,
                height=p_height,
                translations=trans,
            )
            db.session.add(new_char)
            existing_chars[norm_c_name] = new_char

    db.session.commit()
    return existing_chars


def sync_perks_to_db(perks: List[PerkData], char_lookup: Dict[str, int]) -> None:
    """Upsert perks with automatic teachable character association."""
    if not perks:
        return

    existing_perks = {
        normalize_name_key(p.name): p
        for p in db.session.scalars(select(Perk)).all()
    }

    for p in perks:
        char_name = getattr(p, "character", None) or ""
        norm_char = normalize_name_key(char_name)

        matched_char_id = None
        if norm_char and norm_char not in ["none", "all", "general", ""]:
            matched_char_id = char_lookup.get(norm_char)

        is_teachable = matched_char_id is not None
        desc = clean_description_text(getattr(p, "description", ""))
        p_name = p.name.strip()
        norm_p_name = normalize_name_key(p_name)
        trans = getattr(p, "translations", None) or {}

        existing_perk = existing_perks.get(norm_p_name)

        if existing_perk:
            existing_perk.category = getattr(p, "category", "Survivor")
            existing_perk.is_teachable = is_teachable
            existing_perk.description = desc
            existing_perk.icon_url = p.icon_url or ""
            existing_perk.icon_local_path = p.icon_local_path or ""
            existing_perk.alternate_name = getattr(p, "alternate_name", None)
            existing_perk.is_generic_counterpart = getattr(p, "is_generic_counterpart", False)
            existing_perk.character_id = matched_char_id
            if trans:
                existing_perk.translations = trans
        else:
            new_perk = Perk(
                name=p_name,
                alternate_name=getattr(p, "alternate_name", None),
                is_generic_counterpart=getattr(p, "is_generic_counterpart", False),
                category=getattr(p, "category", "Survivor"),
                is_teachable=is_teachable,
                description=desc,
                icon_url=getattr(p, "icon_url", "") or "",
                icon_local_path=getattr(p, "icon_local_path", "") or "",
                character_id=matched_char_id,
                translations=trans,
            )
            db.session.add(new_perk)
            existing_perks[norm_p_name] = new_perk

    db.session.commit()


def sync_items_to_db(items: List[ItemData]) -> None:
    """Upsert survivor items and tools."""
    if not items:
        return

    existing_items = {
        normalize_name_key(i.name): i
        for i in db.session.scalars(select(Item)).all()
    }
    valid_keys = set()
    for item in items:
        i_name = item.name.strip()
        norm_i_name = normalize_name_key(i_name)
        valid_keys.add(norm_i_name)
        desc = clean_description_text(getattr(item, "description", ""))
        trans = getattr(item, "translations", None) or {}
        existing_item = existing_items.get(norm_i_name)

        if existing_item:
            existing_item.category = getattr(item, "category", "")
            existing_item.role = getattr(item, "role", "Survivor")
            existing_item.description = desc
            existing_item.icon_url = item.icon_url or ""
            existing_item.icon_local_path = item.icon_local_path or ""
            existing_item.rarity = getattr(item, "rarity", "") or ""
            if trans:
                existing_item.translations = trans
        else:
            new_item = Item(
                name=i_name,
                category=getattr(item, "category", ""),
                role=getattr(item, "role", "Survivor"),
                description=desc,
                icon_url=getattr(item, "icon_url", "") or "",
                icon_local_path=getattr(item, "icon_local_path", "") or "",
                rarity=getattr(item, "rarity", "") or "",
                translations=trans,
            )
            db.session.add(new_item)
            existing_items[norm_i_name] = new_item

    for k, item in existing_items.items():
        if k not in valid_keys:
            db.session.delete(item)

    db.session.commit()


def sync_addons_to_db(addons: List[AddonData]) -> None:
    """Upsert killer power addons and item addons."""
    if not addons:
        return

    existing_addons = {
        normalize_name_key(a.name): a
        for a in db.session.scalars(select(Addon)).all()
    }
    valid_keys = set()
    for addon in addons:
        a_name = addon.name.strip()
        norm_a_name = normalize_name_key(a_name)
        valid_keys.add(norm_a_name)
        desc = clean_description_text(getattr(addon, "description", ""))
        trans = getattr(addon, "translations", None) or {}
        existing_addon = existing_addons.get(norm_a_name)

        if existing_addon:
            existing_addon.associated_target = getattr(addon, "associated_target", "") or ""
            existing_addon.category = getattr(addon, "category", "")
            existing_addon.description = desc
            existing_addon.icon_url = addon.icon_url or ""
            existing_addon.icon_local_path = addon.icon_local_path or ""
            existing_addon.rarity = getattr(addon, "rarity", "") or ""
            if trans:
                existing_addon.translations = trans
        else:
            new_addon = Addon(
                name=a_name,
                associated_target=getattr(addon, "associated_target", "") or "",
                category=getattr(addon, "category", ""),
                description=desc,
                icon_url=getattr(addon, "icon_url", "") or "",
                icon_local_path=getattr(addon, "icon_local_path", "") or "",
                rarity=getattr(addon, "rarity", "") or "",
                translations=trans,
            )
            db.session.add(new_addon)
            existing_addons[norm_a_name] = new_addon

    for k, addon in existing_addons.items():
        if k not in valid_keys:
            db.session.delete(addon)

    db.session.commit()


def sync_maps_to_db(maps: List[MapData]) -> None:
    """Upsert map realms and clock landmark tiles."""
    if not maps:
        return

    existing_maps = {
        m.map_id: m for m in db.session.scalars(select(MapRealm)).all()
    }
    for m in maps:
        m_id = getattr(m, "id", None) or f"map_{sanitize_filename(m.name)}"
        desc = ""
        if getattr(m, "clock_system", None) and isinstance(m.clock_system, dict):
            desc = m.clock_system.get("description", "")
        if not desc:
            desc = f"12-Clock callout map layout for {m.name} ({m.realm})."

        existing_map = existing_maps.get(m_id)
        if existing_map:
            existing_map.name = m.name
            existing_map.realm = m.realm
            existing_map.realm_id = m.realm_id or sanitize_filename(m.realm)
            existing_map.source = getattr(m, "source", "hens333")
            existing_map.source_label = getattr(m, "source_label", "Hens333 12-Clock Callouts")
            existing_map.callout_image_url = m.callout_image_url or ""
            existing_map.callout_image_local_path = m.callout_image_local_path or ""
            existing_map.image_url = m.callout_image_url or ""
            existing_map.description = desc
        else:
            new_map = MapRealm(
                map_id=m_id,
                name=m.name,
                realm=m.realm,
                realm_id=m.realm_id or sanitize_filename(m.realm),
                source=getattr(m, "source", "hens333"),
                source_label=getattr(m, "source_label", "Hens333 12-Clock Callouts"),
                callout_image_url=m.callout_image_url or "",
                callout_image_local_path=m.callout_image_local_path or "",
                image_url=m.callout_image_url or "",
                layout_type="Standard",
                jungle_gyms_count=4,
                totem_spawns_count=5,
                pallet_density="Medium",
                shack_has_basement=True,
                description=desc,
            )
            db.session.add(new_map)
            existing_maps[m_id] = new_map

        clock_sys = getattr(m, "clock_system", None)
        if clock_sys and isinstance(clock_sys, dict):
            existing_tiles = db.session.scalars(
                select(MapTile).where(MapTile.map_id == m_id)
            ).all()
            if not existing_tiles:
                landmark_positions = [
                    ("twelve_o_clock", "12 O'Clock: " + str(clock_sys.get("twelve_o_clock", "Main Building / North Exit Gate")), 0.5, 0.1),
                    ("three_o_clock", "3 O'Clock: " + str(clock_sys.get("three_o_clock", "East Gym / Outer Loop")), 0.9, 0.5),
                    ("six_o_clock", "6 O'Clock: " + str(clock_sys.get("six_o_clock", "Killer Shack / South Exit Gate")), 0.5, 0.9),
                    ("nine_o_clock", "9 O'Clock: " + str(clock_sys.get("nine_o_clock", "West Gym / L-T Wall")), 0.1, 0.5),
                    ("center", "Center: " + str(clock_sys.get("center", "Central Landmark")), 0.5, 0.5),
                ]
                for key, tile_name, tx, ty in landmark_positions:
                    db.session.add(
                        MapTile(
                            map_id=m_id,
                            name=tile_name,
                            type="landmark",
                            x=tx,
                            y=ty,
                            seed_variant="seed_a",
                            floor=1,
                            has_pallet=("shack" in tile_name.lower() or "gym" in tile_name.lower()),
                            has_window=("shack" in tile_name.lower() or "gym" in tile_name.lower() or "main" in tile_name.lower()),
                        )
                    )

    db.session.commit()


def sync_all_to_database(
    characters: List[CharacterData],
    perks: List[PerkData],
    items: Optional[List[ItemData]] = None,
    addons: Optional[List[AddonData]] = None,
    maps: Optional[List[MapData]] = None,
) -> Dict[str, int]:
    """Execute complete database synchronization pipeline across all DBD entity domains."""
    ensure_translations_columns()
    items = items or []
    addons = addons or []
    maps = maps or []

    existing_chars = sync_characters_to_db(characters)

    char_lookup: Dict[str, int] = {}
    for c in existing_chars.values():
        char_lookup[normalize_name_key(c.name)] = c.id
        if c.real_name:
            char_lookup[normalize_name_key(c.real_name)] = c.id
        if c.wiki_slug:
            char_lookup[normalize_name_key(c.wiki_slug)] = c.id

    sync_perks_to_db(perks, char_lookup)
    sync_items_to_db(items)
    sync_addons_to_db(addons)
    sync_maps_to_db(maps)

    return {
        "characters_synced": len(characters),
        "perks_synced": len(perks),
        "items_synced": len(items),
        "addons_synced": len(addons),
        "maps_synced": len(maps),
    }

