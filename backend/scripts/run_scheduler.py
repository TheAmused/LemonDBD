"""Standalone APScheduler runner for LemonDBD.

Runs periodic jobs (inactivity streak losses, cache cleanup, etc.) in a dedicated process,
avoiding duplicated scheduler instances across multi-worker Gunicorn web processes.
"""
import logging
import os
import signal
import sys
from apscheduler.schedulers.blocking import BlockingScheduler
from sqlalchemy import text

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, db
from app.services.site_settings import streak_prune_days
from app.services.streak_cleanup_service import apply_inactivity_losses

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] [scheduler] %(message)s")
logger = logging.getLogger("scheduler")


def run_inactivity_job(app):
    with app.app_context():
        logger.info("Executing scheduled inactivity streak loss cleanup...")
        is_pg = False
        try:
            is_pg = db.engine.dialect.name in ("postgresql", "postgres")
        except Exception:
            pass

        if is_pg:
            with db.engine.connect() as conn:
                acquired = conn.execute(text("SELECT pg_try_advisory_lock(8882027);")).scalar()
                if acquired:
                    try:
                        apply_inactivity_losses(streak_prune_days())
                        logger.info("Inactivity losses applied successfully.")
                    finally:
                        conn.execute(text("SELECT pg_advisory_unlock(8882027);"))
                else:
                    logger.warning("Could not acquire advisory lock; another runner active.")
        else:
            apply_inactivity_losses(streak_prune_days())
            logger.info("Inactivity losses applied successfully.")


def main():
    os.environ["SCHEDULER_ENABLED"] = "false"  # Don't boot in-app scheduler inside create_app
    app = create_app()

    scheduler = BlockingScheduler()
    scheduler.add_job(
        lambda: run_inactivity_job(app),
        trigger="cron",
        hour=3,
        minute=0,
        id="apply_inactivity_streak_losses",
        replace_existing=True,
    )

    def _shutdown(signum, frame):
        logger.info("Received termination signal, shutting down scheduler...")
        scheduler.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    logger.info("LemonDBD Scheduler started. Running jobs...")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped.")


if __name__ == "__main__":
    main()
