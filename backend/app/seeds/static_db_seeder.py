# backend/app/seeds/static_db_seeder.py
import json
import logging
from pathlib import Path
from typing import Any
from sqlalchemy import func, select, text

from app.core.extensions import db
from app.models.character import Character
from app.services.db.export_import import DatabaseExportImportService

logger = logging.getLogger(__name__)

SEEDS_DATA_DIR = Path(__file__).resolve().parent / "data"
FALLBACK_DATA_DIRS = [
    Path("/app/data/static_export"),
    Path("/app/backend/data/static_export"),
    Path(__file__).resolve().parent.parent.parent / "data" / "static_export",
]


def _sync_all_postgres_sequences() -> None:
    """Updates all PostgreSQL sequences to MAX(id) after bulk seeding."""
    try:
        if db.engine.dialect.name not in ("postgresql", "postgres"):
            return

        tables_to_sync = [
            "characters",
            "perks",
            "items",
            "addons",
            "offerings",
            "chapters",
            "realms",
            "map_realms",
            "map_tiles",
            "map_objectives",
            "users",
            "perk_rules",
            "scraper_settings",
            "rosters",
        ]

        for table in tables_to_sync:
            try:
                db.session.execute(text(
                    f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                    f"COALESCE((SELECT MAX(id) FROM \"{table}\"), 1), true);"
                ))
            except Exception as seq_err:
                logger.debug(f"[static_seeder] Sequence sync notice for {table}: {seq_err}")

        db.session.commit()
    except Exception as e:
        logger.warning(f"[static_seeder] Failed syncing postgres sequences: {e}")


def _find_data_dir() -> Path | None:
    if SEEDS_DATA_DIR.exists() and (SEEDS_DATA_DIR / "full_static_export.json").exists():
        return SEEDS_DATA_DIR
    for fallback in FALLBACK_DATA_DIRS:
        if fallback.exists() and (fallback / "full_static_export.json").exists():
            return fallback
    if SEEDS_DATA_DIR.exists():
        return SEEDS_DATA_DIR
    return None


def load_static_seed_payload(data_dir: Path) -> dict[str, Any]:
    """Loads full_static_export.json or combines modular json files."""
    master_file = data_dir / "full_static_export.json"
    if master_file.exists():
        try:
            with open(master_file, "r", encoding="utf-8") as f:
                payload = json.load(f)
            logger.info(f"[static_seeder] Loaded unified static bundle from {master_file}")
            return payload
        except Exception as e:
            logger.warning(f"[static_seeder] Could not load {master_file}, falling back to modular files: {e}")

    # Fallback: merge all individual json files from folders
    combined_data: dict[str, Any] = {}
    for sub in ["content", "settings", "smash_or_pass", "users"]:
        folder = data_dir / sub
        if not folder.exists():
            continue
        for json_file in folder.glob("*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    file_data = json.load(f)
                target = file_data.get("target") or json_file.stem
                if "data" in file_data and target in file_data["data"]:
                    combined_data[target] = file_data["data"][target]
                elif target in file_data:
                    combined_data[target] = file_data[target]
            except Exception as read_err:
                logger.warning(f"[static_seeder] Error reading {json_file}: {read_err}")

    return {"version": "1.0", "data": combined_data}


def seed_from_static_json(force: bool = False) -> dict[str, Any]:
    """
    Alternative static database seeder that imports all core static game records
    (characters, perks, items, addons, offerings, chapters, maps, realms, rosters,
    rules, scraper settings, and core admin/user accounts) directly from offline JSON.
    Zero external scraping, zero HTTP calls to wiki.gg.
    """
    char_count = 0
    try:
        char_count = db.session.scalar(select(func.count(Character.id))) or 0
    except Exception as e:
        logger.debug(f"[static_seeder] Character count check notice: {e}")
        char_count = 0

    if char_count > 0 and not force:
        logger.info(f"[static_seeder] Database already initialized ({char_count} characters present). Skipping seed.")
        return {"status": "skipped", "character_count": char_count}

    data_dir = _find_data_dir()
    if not data_dir:
        logger.error("[static_seeder] Static seed directory not found! No data to seed.")
        return {"status": "error", "message": "Seeds data directory not found"}

    logger.info(f"[static_seeder] Seeding database from offline JSON static files at: {data_dir}...")

    payload = load_static_seed_payload(data_dir)
    result = DatabaseExportImportService.import_database(payload, mode="merge")

    # Post-seeding: sync postgres sequences
    _sync_all_postgres_sequences()

    # Post-seeding: refresh in-memory perk cache
    try:
        from app.services.perk_service import PerkService
        perk_service = PerkService()
        perk_service.reload_data()
    except Exception as perk_err:
        logger.debug(f"[static_seeder] PerkService reload notice: {perk_err}")

    logger.info(f"[static_seeder] Database seeding successfully completed: {result.get('summary', {})}")
    return {"status": "success", "summary": result.get("summary", {})}
