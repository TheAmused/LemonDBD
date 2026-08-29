# backend/app/services/perks/loader.py
import json
import logging
import os
from flask import current_app
from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.models import Addon, Character, Item, MapRealm, MapTile, Perk
from app.services.perks.utils import clean_description

logger = logging.getLogger(__name__)


def seed_database_from_json_files(service) -> None:
    """Seeds baseline database tables from local JSON files if records are missing."""
    try:
        char_count = db.session.scalar(select(func.count(Character.id))) or 0
        if char_count == 0 and service.characters_path.exists():
            with open(service.characters_path, "r", encoding="utf-8") as f:
                raw_chars = json.load(f)
                for c in raw_chars:
                    existing = db.session.scalars(
                        select(Character).where(Character.name == c["name"])
                    ).first()
                    if not existing:
                        db.session.add(
                            Character(
                                name=c["name"],
                                role=c.get("category") or c.get("role", "Survivor"),
                                real_name=c.get("real_name", c["name"]),
                                short_name=c.get("short_name", ""),
                                wiki_slug=c.get("wiki_slug", ""),
                                portrait_url=c.get("avatar_url", ""),
                                avatar_local_path=c.get("avatar_local_path", ""),
                                release_number=c.get("release_number"),
                                code_prefix=c.get("code_prefix"),
                                chapter_name=c.get("chapter_name"),
                                chapter_number=c.get("chapter_number"),
                                dlc_type=c.get("dlc_type"),
                                is_licensed=c.get("is_licensed", False),
                                release_year=c.get("release_year"),
                                release_date=c.get("release_date"),
                                dlc_counterparts=c.get("dlc_counterparts"),
                                lore=c.get("lore"),
                            )
                        )
                db.session.commit()

        perk_count = db.session.scalar(select(func.count(Perk.id))) or 0
        if perk_count == 0 and service.data_path.exists():
            with open(service.data_path, "r", encoding="utf-8") as f:
                raw_perks = json.load(f)
                for p in raw_perks:
                    existing = db.session.scalars(
                        select(Perk).where(Perk.name == p["name"])
                    ).first()
                    if not existing:
                        char_name = p.get("character")
                        matched_char = None
                        if char_name and char_name.lower() not in ["none", "all", "general"]:
                            matched_char = db.session.scalars(
                                select(Character).where(
                                    or_(
                                        func.lower(Character.name) == char_name.lower(),
                                        func.lower(Character.real_name) == char_name.lower(),
                                    )
                                )
                            ).first()

                        db.session.add(
                            Perk(
                                name=p["name"],
                                alternate_name=p.get("alternate_name"),
                                is_generic_counterpart=p.get("is_generic_counterpart", False),
                                category=p.get("category", "Survivor"),
                                is_teachable=(matched_char is not None),
                                description=clean_description(p.get("description", "")),
                                icon_url=p.get("icon_url", ""),
                                icon_local_path=p.get("icon_local_path", ""),
                                character_id=matched_char.id if matched_char else None,
                            )
                        )
                db.session.commit()

        item_count = db.session.scalar(select(func.count(Item.id))) or 0
        if item_count == 0 and service.items_path.exists():
            with open(service.items_path, "r", encoding="utf-8") as f:
                raw_items = json.load(f)
                for item in raw_items:
                    existing = db.session.scalars(
                        select(Item).where(Item.name == item["name"])
                    ).first()
                    if not existing:
                        db.session.add(
                            Item(
                                name=item["name"],
                                category=item.get("category", ""),
                                role=item.get("role", "Survivor"),
                                description=clean_description(item.get("description", "")),
                                icon_url=item.get("icon_url", ""),
                                icon_local_path=item.get("icon_local_path", ""),
                                rarity=item.get("rarity", ""),
                            )
                        )
                db.session.commit()

        addon_count = db.session.scalar(select(func.count(Addon.id))) or 0
        if addon_count == 0 and service.addons_path.exists():
            with open(service.addons_path, "r", encoding="utf-8") as f:
                raw_addons = json.load(f)
                for addon in raw_addons:
                    existing = db.session.scalars(
                        select(Addon).where(Addon.name == addon["name"])
                    ).first()
                    if not existing:
                        db.session.add(
                            Addon(
                                name=addon["name"],
                                associated_target=addon.get("associated_target", ""),
                                category=addon.get("category", ""),
                                description=clean_description(addon.get("description", "")),
                                icon_url=addon.get("icon_url", ""),
                                icon_local_path=addon.get("icon_local_path", ""),
                                rarity=addon.get("rarity", ""),
                            )
                        )
                db.session.commit()

        map_count = db.session.scalar(select(func.count(MapRealm.id))) or 0
        if map_count == 0:
            from app.services.maps.data import DEFAULT_TILES_SEED_A, SAMPLE_MAPS
            for m in SAMPLE_MAPS:
                existing = db.session.scalars(
                    select(MapRealm).where(MapRealm.map_id == m["id"])
                ).first()
                if not existing:
                    map_realm = MapRealm(
                        map_id=m["id"],
                        name=m["name"],
                        realm=m["realm"],
                        realm_id=m.get("realm_id") or m["id"],
                        source=m.get("source", "hens333"),
                        source_label=m.get("source_label", "Hens333 12-Clock Callouts"),
                        callout_image_url=m.get("callout_image_url", m.get("image_url", "")),
                        callout_image_local_path=m.get("callout_image_local_path", ""),
                        image_url=m.get("image_url", ""),
                        layout_type=m.get("layout_type", "Standard"),
                        jungle_gyms_count=m.get("jungle_gyms_count", 4),
                        totem_spawns_count=m.get("totem_spawns_count", 5),
                        pallet_density=m.get("pallet_density", "Medium"),
                        shack_has_basement=m.get("shack_has_basement", True),
                        description=m.get("description", ""),
                    )
                    db.session.add(map_realm)
                    db.session.flush()

                    for t_data in DEFAULT_TILES_SEED_A:
                        db.session.add(
                            MapTile(
                                map_id=map_realm.map_id,
                                name=t_data["name"],
                                type=t_data.get("type", "landmark"),
                                x=t_data.get("x", 0.0),
                                y=t_data.get("y", 0.0),
                                seed_variant="seed_a",
                                floor=1,
                                has_pallet=t_data.get("has_pallet", False),
                                has_window=t_data.get("has_window", False),
                            )
                        )
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error seeding database from JSON files: {e}")


def load_fallback_files(service) -> None:
    """Populates local memory cache fallback structures from disk JSON files."""
    if service.characters_path.exists():
        try:
            with open(service.characters_path, "r", encoding="utf-8") as f:
                service._characters_cache = json.load(f)
        except Exception:
            service._characters_cache = []
    if service.data_path.exists():
        try:
            with open(service.data_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                for p in raw_data:
                    if "description" in p:
                        p["description"] = clean_description(p["description"])
                service._cache = raw_data
        except Exception:
            service._cache = []
    if service.items_path.exists():
        try:
            with open(service.items_path, "r", encoding="utf-8") as f:
                raw_items = json.load(f)
                for i in raw_items:
                    if "description" in i:
                        i["description"] = clean_description(i["description"])
                service._items_cache = raw_items
        except Exception:
            service._items_cache = []
    if service.addons_path.exists():
        try:
            with open(service.addons_path, "r", encoding="utf-8") as f:
                raw_addons = json.load(f)
                for a in raw_addons:
                    if "description" in a:
                        a["description"] = clean_description(a["description"])
                service._addons_cache = raw_addons
        except Exception:
            service._addons_cache = []
    if service.maps_path.exists():
        try:
            with open(service.maps_path, "r", encoding="utf-8") as f:
                service._maps_cache = json.load(f)
        except Exception:
            service._maps_cache = []


def reload_service_data(service) -> None:
    """Reloads database tables or fallback memory caches."""
    try:
        if current_app:
            if current_app.config.get("TESTING") or ("PYTEST_CURRENT_TEST" in os.environ):
                load_fallback_files(service)
                return

            char_count = db.session.scalar(select(func.count(Character.id))) or 0
            perk_count = db.session.scalar(select(func.count(Perk.id))) or 0
            item_count = db.session.scalar(select(func.count(Item.id))) or 0
            addon_count = db.session.scalar(select(func.count(Addon.id))) or 0
            map_count = db.session.scalar(select(func.count(MapRealm.id))) or 0

            if char_count == 0 or perk_count == 0 or item_count == 0 or addon_count == 0 or map_count == 0:
                is_pg = False
                try:
                    is_pg = db.engine.dialect.name in ("postgresql", "postgres")
                except Exception:
                    pass

                if is_pg:
                    from sqlalchemy import text
                    with db.engine.connect() as conn:
                        acquired = conn.execute(text("SELECT pg_try_advisory_lock(8882027);")).scalar()
                        if acquired:
                            try:
                                cc = db.session.scalar(select(func.count(Character.id))) or 0
                                pc = db.session.scalar(select(func.count(Perk.id))) or 0
                                if cc == 0 or pc == 0:
                                    seed_database_from_json_files(service)
                            finally:
                                conn.execute(text("SELECT pg_advisory_unlock(8882027);"))
                else:
                    seed_database_from_json_files(service)
            return
    except Exception as e:
        logger.debug(f"Database query check during reload_data: {e}")

    load_fallback_files(service)
