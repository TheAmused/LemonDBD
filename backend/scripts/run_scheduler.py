"""Standalone APScheduler runner for LemonDBD.

Runs the periodic housekeeping jobs (app/services/maintenance_jobs.py: inactive streaks, expired
report evidence, moderation emails, the ban-evasion list) in a dedicated process, so the multi-worker
gunicorn web processes never each start their own scheduler.
"""
import logging
import os
import signal
import sys

from apscheduler.schedulers.blocking import BlockingScheduler

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app  # noqa: E402
from app.core.config import Config  # noqa: E402
from app.services.maintenance_jobs import register_jobs  # noqa: E402

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] [scheduler] %(message)s")
logger = logging.getLogger("scheduler")


class SchedulerProcessConfig(Config):
    """This process schedules the jobs itself; the app must not start a second, in-app scheduler."""

    SCHEDULER_ENABLED = False


def main():
    app = create_app(SchedulerProcessConfig)

    scheduler = BlockingScheduler()
    register_jobs(scheduler, app)

    def _shutdown(signum, frame):
        logger.info("Received termination signal, shutting down scheduler...")
        scheduler.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    logger.info("LemonDBD Scheduler started with jobs: %s", ", ".join(job.id for job in scheduler.get_jobs()))
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped.")


if __name__ == "__main__":
    main()
