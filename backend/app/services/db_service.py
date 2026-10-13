# backend/app/services/db_service.py
import logging
from pathlib import Path
from flask import current_app
from sqlalchemy import create_engine

from app.core.extensions import db
from app.services.db.connection import MemConnectionWrapper, create_sqlite_connection
from app.services.db.maintenance import prune_stale_character_rows as _prune_rows
from app.services.db.seeders import seed_default_configs

logger = logging.getLogger(__name__)


class DatabaseService:
    def __init__(self, db_path: str = ":memory:"):
        self.db_path = db_path
        self._mem_conn = None

        if self.db_path == ":memory:":
            raw = create_sqlite_connection(":memory:")
            self._mem_conn = MemConnectionWrapper(raw)
            try:
                engine = create_engine("sqlite://", creator=lambda: raw)
                try:
                    db.metadata.create_all(bind=engine)
                finally:
                    engine.dispose()
            except Exception as e:
                logger.debug(f"In-memory declarative schema init notice: {e}")

    def get_connection(self):
        """SQLite connection helper for standalone scripts and backwards-compatibility."""
        if self.db_path == ":memory:":
            return self._mem_conn
        return create_sqlite_connection(self.db_path)

    def init_db(self) -> None:
        """Initializes database schema, baseline configurations and seed data. Content text, including every locale's
        `translations`, comes only from the seed JSON files (seeds/data/content)."""
        if self.db_path != ":memory:":
            try:
                p = Path(self.db_path)
                p.parent.mkdir(parents=True, exist_ok=True)
                engine = create_engine(f"sqlite:///{self.db_path}")
                try:
                    db.metadata.create_all(bind=engine)
                finally:
                    engine.dispose()
            except Exception as schema_e:
                logger.debug(f"Declarative sqlite schema init notice: {schema_e}")

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
        except Exception as e:
            logger.debug(f"SQLAlchemy init_db skipped or failed (falling back): {e}")

    def prune_stale_character_rows(self, valid_names: set[str] | None) -> dict[str, int]:
        """Delete run rows pinned to characters that no longer exist."""
        return _prune_rows(valid_names, self.get_connection)
