# backend/app/services/db_service.py
import logging
from flask import current_app

from app.core.extensions import db
from app.services.db.connection import MemConnectionWrapper, create_sqlite_connection
from app.services.db.maintenance import prune_stale_character_rows as _prune_rows
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
        """Initializes database schema, baseline configurations, seed data, and multi-language translations."""
        if self.db_path != ":memory:":
            try:
                conn = self.get_connection()
                init_raw_sqlite_schema(conn)
                conn.close()
            except Exception as raw_e:
                logger.debug(f"Raw sqlite schema init notice: {raw_e}")

        try:
            if current_app:
                import os
                db.create_all()
                seed_default_configs(db)

                is_testing = current_app.config.get("TESTING", False) or ("PYTEST_CURRENT_TEST" in os.environ)
                if not is_testing:
                    try:
                        from app.services.perk_service import PerkService
                        perk_service = PerkService()
                        perk_service.reload_data()
                    except Exception as seed_err:
                        logger.debug(f"Baseline data seeding notice: {seed_err}")

                    try:
                        from app.services.translations import TranslationService
                        trans_service = TranslationService()
                        trans_service.sync_all_locales_to_db(locales=["en", "pl", "de", "es", "ja"])
                    except Exception as trans_err:
                        logger.warning(f"Auto-sync translations during init_db notice: {trans_err}")
        except Exception as e:
            logger.debug(f"SQLAlchemy init_db skipped or failed (falling back): {e}")

    def prune_stale_character_rows(self, valid_names: set[str] | None) -> dict[str, int]:
        """Delete run rows pinned to characters that no longer exist."""
        return _prune_rows(valid_names, self.get_connection)
