# backend/scripts/import_database_updates.py
"""
Production Database Update & Seed Importer

Usage:
  # 1. Apply all pending updates from seeds/updates/ and modified seeds/data/:
  python scripts/import_database_updates.py

  # 2. Directly import an explicit .json patch file:
  python scripts/import_database_updates.py path/to/my_patch.json
"""
import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.core.config import Config
from app.seeds.static_db_seeder import import_update_file, seed_from_static_json

logging.basicConfig(level=logging.INFO, format="[db_updates] %(message)s")
logger = logging.getLogger("db_updates")


def main() -> int:
    app = create_app(Config)
    with app.app_context():
        if len(sys.argv) > 1:
            target = Path(sys.argv[1])
            if not target.exists():
                logger.error(f"Target file not found: {target}")
                return 1
            logger.info(f"Applying explicit update file: {target}")
            res = import_update_file(target)
            logger.info(f"Update applied successfully: {res.get('summary', {})}")
        else:
            logger.info("Scanning for pending database updates...")
            res = seed_from_static_json(force=False)
            updates_info = res.get("updates", {})
            applied_count = updates_info.get("applied_count", 0)
            if applied_count > 0:
                logger.info(f"Successfully applied {applied_count} update file(s): {updates_info.get('applied_files')}")
                logger.info(f"Summaries: {updates_info.get('summaries')}")
            else:
                logger.info("Database is already up to date. Zero pending updates.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
