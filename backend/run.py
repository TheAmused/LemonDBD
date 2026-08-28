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


def _run_initial_scrape_if_needed() -> None:
    """Triggers an asynchronous initial scrape if database and perk cache are empty."""
    if not app.config.get("INITIAL_SCRAPE_ENABLED", True):
        return

    char_count = 0
    with app.app_context():
        try:
            char_count = db.session.scalar(select(func.count(Character.id))) or 0
        except Exception as e:
            logger.debug(f"Could not count characters on startup: {e}")
            char_count = 0

    perk_service = PerkService()
    if char_count == 0 and not perk_service.data_path.exists():
        lock_file = app.config.get("SCRAPE_LOCK_FILE", Config.SCRAPE_LOCK_FILE)
        try:
            fd = os.open(lock_file, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.close(fd)

            def background_task() -> None:
                logger.info("No character records found on startup. Triggering initial scrape & seed...")
                with app.app_context():
                    scraper = ScraperService()
                    scraper.run_sync_pipeline()
                    perk_service.reload_data()

            thread = threading.Thread(target=background_task, daemon=True)
            thread.start()
        except OSError:
            pass


_run_initial_scrape_if_needed()

if __name__ == "__main__":
    host = app.config.get("HOST", "0.0.0.0")
    port = int(app.config.get("PORT", 5000))
    debug = bool(app.config.get("DEBUG", False))
    logger.info(f"Starting LemonDBD server on {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)
