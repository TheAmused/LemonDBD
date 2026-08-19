import logging
import os
import threading
from app import create_app
from app.services.perk_service import PerkService
from app.services.scraper_service import ScraperService

logger = logging.getLogger(__name__)
app = create_app()

LOCK_FILE = "/tmp/dbd_initial_scrape.lock"


def _run_initial_scrape_if_needed():
    with app.app_context():
        from sqlalchemy import select, func
        from app.core.extensions import db
        from app.models import Character
        try:
            char_count = db.session.scalar(select(func.count(Character.id))) or 0
        except Exception:
            char_count = 0

    perk_service = PerkService()
    if char_count == 0 and not perk_service.data_path.exists():
        try:
            # Atomic file creation across Gunicorn workers
            fd = os.open(LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.close(fd)

            def background_task():
                logger.info("No character records found on startup. Triggering initial scrape & seed...")
                with app.app_context():
                    scraper = ScraperService()
                    scraper.run_sync_pipeline()
                    perk_service.reload_data()

            thread = threading.Thread(target=background_task, daemon=True)
            thread.start()
        except OSError:
            # Other Gunicorn workers fail gracefully without launching duplicate threads
            pass


_run_initial_scrape_if_needed()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)