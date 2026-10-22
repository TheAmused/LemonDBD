"""Standalone APScheduler runner for LemonDBD.

Runs the periodic housekeeping jobs (app/services/maintenance_jobs.py: inactive streaks, expired
report evidence, moderation emails, the ban-evasion list) in a dedicated process, so the multi-worker
gunicorn web processes never each start their own scheduler.
"""
import logging
import os
import signal
import sys
from pathlib import Path

from apscheduler.schedulers.blocking import BlockingScheduler

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app  # noqa: E402
from app.core.config import Config  # noqa: E402
from app.core.logging_setup import configure_logging  # noqa: E402
from app.services.maintenance_jobs import register_jobs  # noqa: E402

configure_logging()
logger = logging.getLogger("scheduler")

#: Touched every HEARTBEAT_SECONDS while the scheduler runs; the container healthcheck
#: (docker-compose.base.yml) fails once it is older than three beats.
HEARTBEAT_FILE = Path("/tmp/scheduler.heartbeat")
HEARTBEAT_SECONDS = 60


def beat() -> None:
    HEARTBEAT_FILE.touch()


class SchedulerProcessConfig(Config):
    """This process schedules the jobs itself; the app must not start a second, in-app scheduler."""

    SCHEDULER_ENABLED = False


def main():
    app = create_app(SchedulerProcessConfig)

    scheduler = BlockingScheduler()
    register_jobs(scheduler, app)
    beat()
    scheduler.add_job(beat, "interval", seconds=HEARTBEAT_SECONDS, id="heartbeat", replace_existing=True)

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
