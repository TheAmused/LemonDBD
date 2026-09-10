# backend/run.py
import logging
import os
import threading
from sqlalchemy import func, select
from app import create_app
from app.core.config import Config
from app.core.extensions import db
from app.models.character import Character
from app.services.perk_service import PerkService
from app.services.scraper_service import ScraperService

logger = logging.getLogger(__name__)
app = create_app()


def _seed_static_db_if_needed() -> None:
    """Seeds the database from offline static JSON data if characters table is empty.
    Wiki.gg scraper is completely disabled."""
    char_count = 0
    with app.app_context():
        try:
            char_count = db.session.scalar(select(func.count(Character.id))) or 0
        except Exception as e:
            logger.debug(f"[startup-check] char_count check notice: {e}")
            char_count = 0

    if char_count == 0:
        logger.info("[startup] No characters found. Seeding database from offline static JSON...")
        from app.seeds.static_db_seeder import seed_from_static_json
        with app.app_context():
            try:
                seed_from_static_json()
            except Exception:
                logger.exception("[startup] Error running static JSON seeder:")
    else:
        logger.info(f"[startup] Database is initialized with {char_count} characters. Wiki.gg scraper is disabled.")


_seed_static_db_if_needed()

if __name__ == "__main__":
    host = app.config.get("HOST", "0.0.0.0")
    port = int(app.config.get("PORT", 5000))
    debug = bool(app.config.get("DEBUG", False))
    logger.info(f"Starting LemonDBD server on {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)
