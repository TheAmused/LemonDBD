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
    """Triggers an asynchronous initial scrape if the character table is empty."""
    if not app.config.get("INITIAL_SCRAPE_ENABLED", True):
        return

    char_count = 0
    count_error: Exception | None = None
    with app.app_context():
        try:
            char_count = db.session.scalar(select(func.count(Character.id))) or 0
        except Exception as e:
            count_error = e
            char_count = 0

    perk_service = PerkService()
    lock_file = app.config.get("SCRAPE_LOCK_FILE", Config.SCRAPE_LOCK_FILE)
    # TEMPORARY DIAGNOSTIC (remove once the scrape trigger is confirmed
    # working reliably): print exactly what this check sees on every single
    # startup, unconditionally, so a silent "nothing happened" is never
    # ambiguous again.
    logger.info(
        f"[scrape-trigger-check] char_count={char_count} "
        f"count_error={count_error!r} "
        f"cache_file_exists={perk_service.data_path.exists()} "
        f"cache_file_path={perk_service.data_path} "
        f"lock_file={lock_file} "
        f"lock_file_exists={os.path.exists(lock_file)} "
        f"INITIAL_SCRAPE_ENABLED={app.config.get('INITIAL_SCRAPE_ENABLED', True)}"
    )

    # Gate purely on the DB row count, not on whether a perks.json cache file
    # happens to exist on disk. The cache lives on the backend_data Docker
    # volume, which has its own lifecycle separate from postgres_data -- if
    # the two ever get out of sync (e.g. the DB volume gets wiped/reset for
    # testing without also wiping backend_data, or vice versa), a leftover
    # cache file used to permanently block the scrape from ever re-running
    # even though the database it's supposed to gate was actually empty.
    # char_count == 0 is the one signal that actually matters here.
    if char_count == 0:
        try:
            fd = os.open(lock_file, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.close(fd)

            def background_task() -> None:
                logger.info("No character records found on startup. Triggering initial scrape & seed...")
                with app.app_context():
                    try:
                        scraper = ScraperService()
                        scraper.run_sync_pipeline()
                        perk_service.reload_data()
                        logger.info("[scrape-trigger-check] background scrape thread finished without raising.")
                    except Exception:
                        logger.exception("[scrape-trigger-check] background scrape thread raised an exception:")

            thread = threading.Thread(target=background_task, daemon=True)
            thread.start()
        except OSError as lock_err:
            logger.warning(f"[scrape-trigger-check] could not acquire scrape lock file (already held?): {lock_err}")


_run_initial_scrape_if_needed()

if __name__ == "__main__":
    host = app.config.get("HOST", "0.0.0.0")
    port = int(app.config.get("PORT", 5000))
    debug = bool(app.config.get("DEBUG", False))
    logger.info(f"Starting LemonDBD server on {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)
