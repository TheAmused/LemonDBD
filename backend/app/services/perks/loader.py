# backend/app/services/perks/loader.py
"""Cache loading for PerkService. This module does not seed the database.

It used to. `seed_database_from_json_files` was a second seeder -- a full
chapters/characters/perks/items/add-ons/maps import guarded by `count == 0`
checks -- reached through `PerkService.reload_data()`, which
`DatabaseService.init_db()` calls on every boot. On an empty database every one
of its branches fired, and its map branch planted six hardcoded `SAMPLE_MAPS`
rows on primary keys 1-6. `app/seeds/static_db_seeder.py` then imported
`maps.json`, whose ids 1-6 belong to six entirely different maps, and the whole
import died on `duplicate key value violates unique constraint
"map_realms_pkey"` -- every boot, in a restart loop.

Two seeders cannot both own the id space. `static_db_seeder` is the one that
does: it reads the versioned files in `app/seeds/data/`, resolves every row by
primary key, and records what it applied. This module now only fills
PerkService's in-memory caches, and falls back to reading the JSON off disk
when there is no database to read (tests, and the pre-database boot path).
"""
import json
import logging
import os
from flask import current_app

from app.services.perks.utils import clean_description

logger = logging.getLogger(__name__)


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
    """Refresh PerkService's caches.

    With a live database every query path reads it directly and these caches
    are only a fallback, so there is nothing to reload here. Without one --
    under tests, or before the database exists -- the JSON files on disk stand
    in for it.

    This function used to seed the database when a table came back empty. It
    does not any more: `app/seeds/static_db_seeder.py` is the only seeder.
    """
    try:
        if current_app and not (
            current_app.config.get("TESTING") or "PYTEST_CURRENT_TEST" in os.environ
        ):
            return
    except Exception as exc:
        logger.debug(f"reload_data notice: {exc}")

    load_fallback_files(service)
