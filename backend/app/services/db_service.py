# backend/app/services/db_service.py
import logging
from typing import Dict, Optional, Set
from flask import current_app

from app.core.extensions import db
from app.services.db.connection import MemConnectionWrapper, create_sqlite_connection
from app.services.db.maintenance import prune_stale_character_rows as _prune_rows
from app.services.db.migrations import migrate_runtime_columns
from app.services.db.raw_schema import init_raw_sqlite_schema
from app.services.db.seeders import seed_default_configs

logger = logging.getLogger(__name__)


class DatabaseService:
    def __init__(self, db_path: str = ":memory:"):
        self.db_path = db_path
        self._mem_conn = None

        if self.db_path == ":memory:":
            raw = create_sqlite_connection(":memory:")
            self._mem_conn = MemConnectionWrapper(raw)
            init_raw_sqlite_schema(self._mem_conn)

    def get_connection(self):
        """SQLite connection helper for standalone scripts and backwards-compatibility."""
        if self.db_path == ":memory:":
            return self._mem_conn
        return create_sqlite_connection(self.db_path)

    def init_db(self) -> None:
        """Initializes database schema and populates baseline configurations."""
        try:
            if current_app:
                db.create_all()
                migrate_runtime_columns(db)
                seed_default_configs(db)
        except Exception as e:
            logger.debug(f"SQLAlchemy init_db skipped or failed (falling back): {e}")

        # Fallback initialization for SQLite standalone runs
        try:
            conn = self.get_connection()
            init_raw_sqlite_schema(conn)
        except Exception as e:
            logger.debug(f"SQLite fallback init_db notice: {e}")

    def prune_stale_character_rows(self, valid_names: Optional[Set[str]]) -> Dict[str, int]:
        """Delete run rows pinned to characters that no longer exist."""
        return _prune_rows(valid_names, self.get_connection)

