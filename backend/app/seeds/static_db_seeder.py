# backend/app/seeds/static_db_seeder.py
import hashlib
import json
import os
import logging
from pathlib import Path
from typing import Any
from sqlalchemy import func, select, text

from app.core.extensions import db
from app.core.redis_cache import bump_catalog_version
from app.models.character import Killer, Survivor
from app.models.admin import SeedUpdateLog
from app.services.db.export_import import DatabaseExportImportService

logger = logging.getLogger(__name__)

#: The baseline seed data: 10 JSON files, the only copy of them, and the only
#: thing that writes seed content into the database.
#:
#: There used to be a second copy at the repository root, in
#: `data/static_export/`, reached through a three-entry fallback chain. It was
#: never read in a container: `backend/Dockerfile` builds from the `backend/`
#: directory alone, so nothing above it is in the image, and `/app/data` is an
#: empty named volume. Editing that copy changed nothing, which is exactly the
#: sort of thing a fallback chain hides. There is no chain now -- if this
#: directory is missing, seeding fails loudly rather than quietly reading
#: something else.
SEEDS_DATA_DIR = Path(__file__).resolve().parent / "data"

#: Patch files, dropped in without a rebuild.
#:
#: `docker-compose.base.yml` bind-mounts the repository's `data/updates/` here,
#: which is the whole point: a `.json` patch copied into that folder is picked
#: up on the next boot. Baking a second updates folder into the image would
#: need a rebuild to change, so there is only this one.
UPDATES_DIR = Path(os.environ.get("SEED_UPDATES_DIR", "/app/updates"))

#: Where `UPDATES_DIR` lives when the app runs outside a container.
LOCAL_UPDATES_DIR = Path(__file__).resolve().parents[3] / "data" / "updates"


def compute_file_hash(path: Path) -> str:
    """Computes SHA256 checksum of file contents."""
    sha = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


#: Tables the seeder inserts explicit ids into. Postgres does not advance a
#: sequence when the id is supplied, so without this the next INSERT that lets
#: the sequence pick would collide with seeded row 1.
_SEQUENCE_TABLES = (
    "survivors",
    "killers",
    "perks",
    "items",
    "killer_addons",
    "item_addons",
    "offerings",
    "chapters",
    "realms",
    "map_realms",
    "map_sources",
    "item_categories",
    "users",
    "rosters",
    "seed_update_logs",
)


def _integer_sequence_tables(names: tuple[str, ...]) -> list[tuple[str, str]]:
    """Of `names`, the tables whose `id` is an integer backed by a sequence.

    `rosters.id` is TEXT. `pg_get_serial_sequence('rosters', 'id')` returns
    NULL for it, and the setval below then reads
    `COALESCE(NULL, 1)` against a text MAX(id) -- "COALESCE types text and
    integer cannot be matched". That error aborted the whole transaction, so
    the *next* table in the loop failed too ("current transaction is aborted"),
    and its per-table `except` could not save it: in Postgres, catching the
    Python exception does not un-abort the transaction.

    Asking the catalog which tables actually have an integer sequence means the
    statement is never issued for one that cannot answer it.
    """
    rows = db.session.execute(
        text(
            """
            SELECT c.table_name,
                   pg_get_serial_sequence(quote_ident(c.table_name), 'id') AS seq
            FROM information_schema.columns AS c
            WHERE c.table_schema = current_schema()
              AND c.column_name = 'id'
              AND c.data_type IN ('smallint', 'integer', 'bigint')
              AND c.table_name = ANY(:names)
            """
        ),
        {"names": list(names)},
    ).all()
    return [(name, seq) for name, seq in rows if seq]


def _sync_all_postgres_sequences() -> None:
    """Advances each id sequence to MAX(id) after a bulk seed or update."""
    try:
        if db.engine.dialect.name not in ("postgresql", "postgres"):
            return

        syncable = _integer_sequence_tables(_SEQUENCE_TABLES)
        skipped = sorted(set(_SEQUENCE_TABLES) - {name for name, _ in syncable})
        if skipped:
            logger.debug(
                "[static_seeder] No integer id sequence, nothing to sync: %s",
                ", ".join(skipped),
            )

        for table, sequence in syncable:
            # A savepoint per table, so that a failure here still cannot poison
            # the transaction for the tables after it.
            savepoint = db.session.begin_nested()
            try:
                db.session.execute(
                    text(
                        "SELECT setval(:seq, COALESCE((SELECT MAX(id) FROM "
                        + f'"{table}"'
                        + "), 1), true)"
                    ),
                    {"seq": sequence},
                )
                savepoint.commit()
            except Exception as seq_err:
                savepoint.rollback()
                logger.warning(
                    "[static_seeder] Sequence sync failed for %s: %s", table, seq_err
                )

        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.warning(f"[static_seeder] Failed syncing postgres sequences: {e}")


def _find_data_dir() -> Path | None:
    """The seed data directory, or None if it is missing."""
    return SEEDS_DATA_DIR if SEEDS_DATA_DIR.exists() else None


def _find_updates_dirs() -> list[Path]:
    """The patch-drop folder: the bind mount in a container, the repository
    folder it is mounted from otherwise. Both spellings of one directory."""
    for candidate in (UPDATES_DIR, LOCAL_UPDATES_DIR):
        if candidate.exists():
            return [candidate]
    return []


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
        # PerkService().reload_data() only refreshes this process. The catalog
        # cache is shared by every worker, and it has just been made wrong.
        bump_catalog_version()
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
        # "Has this database been seeded?" -- survivors alone answer it, but
        # both are counted so a half-applied import still reads as unseeded.
        char_count = (
            (db.session.scalar(select(func.count(Survivor.id))) or 0)
            + (db.session.scalar(select(func.count(Killer.id))) or 0)
        )
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

        # Anything cached before this point was computed against an empty or
        # stale catalog, so it is discarded here rather than left to its TTL.
        bump_catalog_version()

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
