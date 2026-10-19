# backend/app/services/maintenance_jobs.py
"""The housekeeping jobs and their schedule, defined once for the in-app scheduler, the standalone
scheduler process (scripts/run_scheduler.py) and the admin's "Run now".

Each job returns how many records it touched. `run_locked` takes the job's Postgres advisory lock
first, so a manual run and the scheduled one (or two processes) never overlap; on SQLite (tests,
local runs) there is nothing to lock and the job simply runs. Every finished run is recorded in
`maintenance_job_runs`, which is how the admin panel knows the scheduler is alive.
"""
import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select, text

from app.core.extensions import db
from app.core.transaction import transaction
from app.models.admin import MaintenanceJobRun

logger = logging.getLogger(__name__)


def _streak_inactivity() -> int:
    from app.services.site_settings import streak_prune_days
    from app.services.streak_cleanup_service import apply_inactivity_losses

    return sum(apply_inactivity_losses(streak_prune_days()).values())


def _content_evidence() -> int:
    from app.services.content_moderation_service import purge_expired_evidence

    return purge_expired_evidence()


def _sanction_emails() -> int:
    from app.services.sanction_outbox import retry_pending_notifications

    return retry_pending_notifications()


def _ban_list() -> int:
    from app.services.ban_list import purge_expired

    return purge_expired()


def _minigame_sessions() -> int:
    from app.services.minigames import purge_expired_repeatables

    return purge_expired_repeatables()


def _catalog_cache() -> int:
    from app.core.redis_cache import bump_catalog_version

    bump_catalog_version()
    return 0


@dataclass(frozen=True)
class MaintenanceJob:
    key: str
    run: Callable[[], int]
    #: Postgres advisory lock shared with the scheduled run (None: nothing to serialise).
    lock_id: int | None
    #: Logged after a scheduled run that touched something ("%d" is the count).
    log_message: str


JOBS: tuple[MaintenanceJob, ...] = (
    MaintenanceJob("streak_inactivity", _streak_inactivity, 8882027, "Ended %d inactive streak run(s)"),
    MaintenanceJob("content_evidence", _content_evidence, 8882028, "Wiped evidence of %d unreviewed content report(s) past the 14-day limit"),
    MaintenanceJob("sanction_emails", _sanction_emails, 8882029, "Sent %d queued moderation email(s)"),
    MaintenanceJob("ban_list", _ban_list, 8882030, "Removed %d expired entr(ies) from the ban-evasion list"),
    MaintenanceJob("minigame_sessions", _minigame_sessions, 8882031, "Deleted %d expired practice minigame session(s)"),
    MaintenanceJob("catalog_cache", _catalog_cache, None, "Cleared the catalog cache"),
)
JOB_BY_KEY: dict[str, MaintenanceJob] = {job.key: job for job in JOBS}


class JobBusyError(Exception):
    """Another worker is running the same job right now."""


def _record(job: MaintenanceJob, affected: int, trigger: str) -> None:
    """Remember this run; a failure here never undoes the job itself."""
    try:
        with transaction():
            row = db.session.get(MaintenanceJobRun, job.key)
            if row is None:
                row = MaintenanceJobRun(key=job.key, last_trigger=trigger)
                db.session.add(row)
            row.last_run_at = datetime.now(timezone.utc)
            row.last_affected = affected
            row.last_trigger = trigger
    except Exception as err:
        db.session.rollback()
        logger.warning("Could not record the run of %s: %s", job.key, err)


def run_locked(job: MaintenanceJob, trigger: str = "admin") -> int:
    """Run `job` once across processes and record it; raises JobBusyError when its lock is taken."""
    is_pg = False
    try:
        is_pg = db.engine.dialect.name in ("postgresql", "postgres")
    except Exception:
        pass
    if job.lock_id is None or not is_pg:
        affected = job.run()
    else:
        with db.engine.connect() as conn:
            acquired = conn.execute(text("SELECT pg_try_advisory_lock(:id);"), {"id": job.lock_id}).scalar()
            if not acquired:
                raise JobBusyError(job.key)
            try:
                affected = job.run()
            finally:
                conn.execute(text("SELECT pg_advisory_unlock(:id);"), {"id": job.lock_id})
    _record(job, affected, trigger)
    return affected


def run_scheduled(key: str) -> None:
    """Scheduler entry point (call inside an app context): a busy lock just skips this tick."""
    job = JOB_BY_KEY[key]
    try:
        affected = run_locked(job, trigger="schedule")
    except JobBusyError:
        return
    if affected:
        logger.info(job.log_message, affected)


def last_runs() -> dict[str, dict[str, Any]]:
    """`{job_key: {last_run_at, last_affected, last_trigger}}` for every job that has run at least once."""
    return {
        row.key: {
            "last_run_at": row.last_run_at.isoformat() if row.last_run_at else None,
            "last_affected": row.last_affected,
            "last_trigger": row.last_trigger,
        }
        for row in db.session.scalars(select(MaintenanceJobRun)).all()
    }


def last_scheduled_run() -> datetime | None:
    """The most recent run the scheduler (not an admin) made, of any job."""
    value = db.session.scalar(
        select(MaintenanceJobRun.last_run_at)
        .where(MaintenanceJobRun.last_trigger == "schedule")
        .order_by(MaintenanceJobRun.last_run_at.desc())
        .limit(1)
    )
    if value is not None and value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


#: (scheduler job id, maintenance job key, APScheduler trigger arguments). The moderation-email job
#: runs every few minutes, so a scheduler that is alive has always recorded a run within the hour.
SCHEDULE: tuple[tuple[str, str, dict[str, Any]], ...] = (
    ("apply_inactivity_streak_losses", "streak_inactivity", {"trigger": "cron", "hour": 3, "minute": 0}),
    # Zero-retention guarantee: unreviewed reported content never outlives its 14-day window.
    ("purge_expired_content_evidence", "content_evidence", {"trigger": "cron", "minute": 17}),
    # Moderation emails owed but not yet delivered (SMTP down, process restarted mid-send) and the
    # "your suspension has ended" notices; claim-based so it never double-sends.
    ("retry_sanction_notifications", "sanction_emails", {"trigger": "interval", "minutes": 3}),
    # Ban-evasion list entries past their retention (daily; the list is off by default and empty).
    ("purge_expired_ban_list_entries", "ban_list", {"trigger": "cron", "hour": 3, "minute": 20}),
    # Practice (repeatable) minigame sessions live 24h; every page load of a practice mode makes one.
    ("purge_expired_minigame_sessions", "minigame_sessions", {"trigger": "cron", "minute": 41}),
)
SCHEDULER_STALE_AFTER = timedelta(hours=1)


def register_jobs(scheduler: Any, app: Any) -> None:
    """Add every scheduled job to an APScheduler instance, each running inside `app`'s context."""

    def _scheduled(key: str) -> Callable[[], None]:
        def _run() -> None:
            with app.app_context():
                run_scheduled(key)

        return _run

    for job_id, key, trigger in SCHEDULE:
        scheduler.add_job(_scheduled(key), id=job_id, replace_existing=True, **trigger)
    # Once shortly after boot too, so a restart never leaves expired evidence waiting.
    scheduler.add_job(
        _scheduled("content_evidence"),
        trigger="date",
        run_date=datetime.now(timezone.utc) + timedelta(seconds=60),
        id="purge_expired_content_evidence_boot",
        replace_existing=True,
    )
