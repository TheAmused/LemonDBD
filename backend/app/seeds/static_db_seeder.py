# backend/app/seeds/static_db_seeder.py
import hashlib
import json
import logging
from pathlib import Path
from typing import Any
from sqlalchemy import func, select, text

from app.core.extensions import db
from app.models.character import Character
from app.models.admin import SeedUpdateLog
from app.services.db.export_import import DatabaseExportImportService

logger = logging.getLogger(__name__)

SEEDS_DATA_DIR = Path(__file__).resolve().parent / "data"
SEEDS_UPDATES_DIR = Path(__file__).resolve().parent / "updates"

FALLBACK_DATA_DIRS = [
    Path("/app/app/seeds/data"),
    Path("/app/data/static_export"),
    Path(__file__).resolve().parent.parent.parent / "data" / "static_export",
]

FALLBACK_UPDATES_DIRS = [
    Path("/app/app/seeds/updates"),
    Path("/app/data/updates"),
    Path("/app/updates"),
    Path(__file__).resolve().parent.parent.parent / "data" / "updates",
]


def compute_file_hash(path: Path) -> str:
    """Computes SHA256 checksum of file contents."""
    sha = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def _sync_all_postgres_sequences() -> None:
    """Updates all PostgreSQL sequences to MAX(id) after bulk seeding or updates."""
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
            "rosters",
            "seed_update_logs",
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
    """Locate the seed data directory - always the modular folder structure."""
    if SEEDS_DATA_DIR.exists():
        return SEEDS_DATA_DIR
    for fallback in FALLBACK_DATA_DIRS:
        if fallback.exists():
            return fallback
    return None


def _find_updates_dirs() -> list[Path]:
    dirs = []
    if SEEDS_UPDATES_DIR.exists():
        dirs.append(SEEDS_UPDATES_DIR)
    for fallback in FALLBACK_UPDATES_DIRS:
        if fallback.exists() and fallback not in dirs:
            dirs.append(fallback)
    return dirs


def load_static_seed_payload(data_dir: Path) -> dict[str, Any]:
    """Combines modular JSON files from content/, settings/, smash_or_pass/, users/ subfolders."""
    combined_data: dict[str, Any] = {}
    for sub in ["content", "settings", "smash_or_pass", "users"]:
        folder = data_dir / sub
        if not folder.exists():
            continue
        for json_file in sorted(folder.rglob("*.json")):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    file_data = json.load(f)
                target = file_data.get("target") or json_file.stem
                items = None
                # Support clean format: { "target": "perks", "perks": [...] }
                if target in file_data:
                    items = file_data[target]
                elif "data" in file_data and isinstance(file_data["data"], dict) and target in file_data["data"]:
                    items = file_data["data"][target]

                if items is not None:
                    if isinstance(items, list):
                        if target not in combined_data:
                            combined_data[target] = []
                        combined_data[target].extend(items)
                    else:
                        combined_data[target] = items
            except Exception as read_err:
                logger.warning(f"[static_seeder] Error reading {json_file}: {read_err}")

    return {"version": "1.0", "data": combined_data}


def _record_file_update(file_id: str, content_hash: str, summary: dict[str, Any]) -> None:
    """Records or updates a file's applied hash in seed_update_logs."""
    try:
        log_entry = db.session.scalar(
            select(SeedUpdateLog).where(SeedUpdateLog.file_identifier == file_id)
        )
        if not log_entry:
            log_entry = SeedUpdateLog(
                file_identifier=file_id,
                content_hash=content_hash,
                summary_json=json.dumps(summary),
            )
            db.session.add(log_entry)
        else:
            log_entry.content_hash = content_hash
            log_entry.summary_json = json.dumps(summary)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.debug(f"[static_seeder] SeedUpdateLog record notice for {file_id}: {e}")


def import_update_file(file_path: Path) -> dict[str, Any]:
    """
    Imports a specific .json update/patch file in merge mode.
    Upserts changed records into the database without overwriting unrelated data.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"Update file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    file_id = f"custom:{file_path.name}"
    current_hash = compute_file_hash(file_path)

    logger.info(f"[static_seeder] Importing update file: {file_path}...")
    result = DatabaseExportImportService.import_database(payload, mode="merge")
    summary = result.get("summary", {})

    _record_file_update(file_id, current_hash, summary)
    _sync_all_postgres_sequences()

    try:
        from app.services.perk_service import PerkService
        PerkService().reload_data()
    except Exception:
        pass

    logger.info(f"[static_seeder] Successfully applied update from {file_path.name}: {summary}")
    return {"status": "success", "file": str(file_path), "summary": summary}


def apply_pending_updates() -> dict[str, Any]:
    """
    Scans for new or modified .json files across:
      1. seeds/updates/ folder (and data/updates/ at repo root)
      2. seeds/data/ content folder (if any core seed json was manually edited)
    Applies any file whose SHA256 content hash differs from seed_update_logs in PostgreSQL.
    """
    try:
        # Ensure seed_update_logs table exists
        db.create_all()
    except Exception:
        pass

    applied_files = []
    summaries: dict[str, Any] = {}

    # 1. Scan updates directories
    for upd_dir in _find_updates_dirs():
        if not upd_dir.exists():
            continue
        for json_file in sorted(upd_dir.glob("*.json")):
            file_id = f"update:{json_file.name}"
            current_hash = compute_file_hash(json_file)

            existing_log = db.session.scalar(
                select(SeedUpdateLog).where(SeedUpdateLog.file_identifier == file_id)
            )

            if existing_log and existing_log.content_hash == current_hash:
                continue  # Already applied and unchanged

            logger.info(f"[static_seeder] Applying pending update from: {json_file}...")
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    payload = json.load(f)
                result = DatabaseExportImportService.import_database(payload, mode="merge")
                summary = result.get("summary", {})
                _record_file_update(file_id, current_hash, summary)
                applied_files.append(str(json_file.name))
                summaries[json_file.name] = summary
                logger.info(f"[static_seeder] Update {json_file.name} applied: {summary}")
            except Exception as upd_err:
                logger.error(f"[static_seeder] Failed applying update {json_file}: {upd_err}")

    # 2. Check if any core seed file in seeds/data has been edited directly
    data_dir = _find_data_dir()
    if data_dir and data_dir.exists():
        for sub in ["content", "settings", "smash_or_pass", "users"]:
            subfolder = data_dir / sub
            if not subfolder.exists():
                continue
            for json_file in sorted(subfolder.rglob("*.json")):
                rel_id = f"seed:{json_file.relative_to(data_dir).as_posix()}"
                current_hash = compute_file_hash(json_file)

                existing_log = db.session.scalar(
                    select(SeedUpdateLog).where(SeedUpdateLog.file_identifier == rel_id)
                )

                if existing_log and existing_log.content_hash == current_hash:
                    continue  # File unchanged

                # File is new or changed
                logger.info(f"[static_seeder] Detected change in seed file {rel_id}, updating database...")
                try:
                    with open(json_file, "r", encoding="utf-8") as f:
                        payload = json.load(f)
                    result = DatabaseExportImportService.import_database(payload, mode="merge")
                    summary = result.get("summary", {})
                    _record_file_update(rel_id, current_hash, summary)
                    applied_files.append(rel_id)
                    summaries[rel_id] = summary
                    logger.info(f"[static_seeder] Changes from {rel_id} applied: {summary}")
                except Exception as seed_err:
                    logger.error(f"[static_seeder] Failed updating from {json_file}: {seed_err}")

    if applied_files:
        _sync_all_postgres_sequences()
        try:
            from app.services.perk_service import PerkService
            PerkService().reload_data()
        except Exception:
            pass
        logger.info(f"[static_seeder] Completed applying {len(applied_files)} update file(s).")
    else:
        logger.debug("[static_seeder] Database is up to date with all seed and update files.")

    return {"applied_count": len(applied_files), "applied_files": applied_files, "summaries": summaries}


def seed_from_static_json(force: bool = False) -> dict[str, Any]:
    """
    Main entrypoint for static seeding and updates:
      1. If database has no characters (or force=True): Performs initial full seed from seeds/data.
      2. Always checks and applies any pending updates from seeds/updates/ and modified seed files.
    """
    try:
        db.create_all()
    except Exception:
        pass

    char_count = 0
    try:
        char_count = db.session.scalar(select(func.count(Character.id))) or 0
    except Exception as e:
        logger.debug(f"[static_seeder] Character count check notice: {e}")
        char_count = 0

    initial_result = None

    if char_count == 0 or force:
        data_dir = _find_data_dir()
        if not data_dir:
            logger.error("[static_seeder] Static seed directory not found! No data to seed.")
            return {"status": "error", "message": "Seeds data directory not found"}

        logger.info(f"[static_seeder] Initializing database from baseline static JSON files at: {data_dir}...")
        payload = load_static_seed_payload(data_dir)
        initial_result = DatabaseExportImportService.import_database(payload, mode="merge")

        # Record initial hashes for all core seed files so future boots know baseline
        for sub in ["content", "settings", "smash_or_pass", "users"]:
            subfolder = data_dir / sub
            if not subfolder.exists():
                continue
            for json_file in sorted(subfolder.rglob("*.json")):
                rel_id = f"seed:{json_file.relative_to(data_dir).as_posix()}"
                try:
                    chash = compute_file_hash(json_file)
                    _record_file_update(rel_id, chash, {"initial": True})
                except Exception:
                    pass

        _sync_all_postgres_sequences()
        try:
            from app.services.perk_service import PerkService
            PerkService().reload_data()
        except Exception:
            pass

        logger.info(f"[static_seeder] Initial seeding completed: {initial_result.get('summary', {})}")

    # Now apply any pending updates from updates/ folder or modified seed files
    updates_result = apply_pending_updates()

    return {
        "status": "success",
        "initial_seed": initial_result.get("summary", {}) if initial_result else None,
        "updates": updates_result,
    }


if __name__ == "__main__":
    import sys
    from app import create_app
    from app.core.config import Config

    app = create_app(Config)
    with app.app_context():
        if len(sys.argv) > 1:
            target_path = Path(sys.argv[1])
            res = import_update_file(target_path)
            print(f"Update applied successfully: {res}")
        else:
            res = seed_from_static_json(force=False)
            print(f"Seeder/Updater result: {res}")
