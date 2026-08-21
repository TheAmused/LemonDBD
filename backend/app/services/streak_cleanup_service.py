# backend/app/services/streak_cleanup_service.py
import logging
from datetime import timedelta
from typing import Dict

from sqlalchemy import select, text

from app.core.extensions import db
from app.models import ChaosRun, GauntletRun, HistoryRun, PageStreakRun
from app.models.base import utcnow
from app.services.chaos_service import ChaosService
from app.services.gauntlet_service import GauntletService
from app.services.history_service import HistoryService
from app.services.page_streak.runs import apply_inactivity_loss as apply_page_streak_inactivity_loss

logger = logging.getLogger(__name__)

# Arbitrary fixed key for this job's Postgres advisory lock -- any int works,
# it just has to be the same value every time this job runs.
_ADVISORY_LOCK_KEY = 851193001


def apply_inactivity_losses(inactive_after_days: int = 90) -> Dict[str, int]:
    """Finds in-progress streak runs whose updated_at is older than
    inactive_after_days and applies the same loss a real match would --
    checkpoint fallback or reset-to-zero, plus a match-log row flagged
    triggered_by='inactivity'. The run itself is never deleted; a
    completed run is never touched.

    Guarded by a Postgres advisory lock so that under gunicorn's multiple
    worker processes, only one worker's scheduler tick actually performs
    the pass. Skipped entirely on non-Postgres dialects (the test suite
    runs on in-memory SQLite, which has no advisory lock function), so this
    stays directly unit-testable without a Postgres fixture.

    The lock is held on a single dedicated connection for the whole call,
    independent of db.session's pooled connections -- session-level
    advisory locks are tied to the physical connection, and db.session's
    own commit() calls during the work below would otherwise risk the
    acquire and release landing on two different pooled connections,
    silently leaving the lock stuck forever on whichever one actually
    holds it.
    """
    is_postgres = db.engine.dialect.name == "postgresql"
    lock_conn = None
    if is_postgres:
        lock_conn = db.engine.connect().execution_options(isolation_level="AUTOCOMMIT")
        got_lock = lock_conn.execute(
            text("SELECT pg_try_advisory_lock(:key)"), {"key": _ADVISORY_LOCK_KEY}
        ).scalar()
        if not got_lock:
            logger.warning(
                "Inactivity cleanup skipped: advisory lock already held by another worker"
            )
            lock_conn.close()
            return {}

    try:
        cutoff = utcnow() - timedelta(days=inactive_after_days)
        affected: Dict[str, int] = {}

        gauntlet_service = GauntletService()
        stale_gauntlet = db.session.scalars(
            select(GauntletRun).where(GauntletRun.status == "in_progress", GauntletRun.updated_at < cutoff)
        ).all()
        for run in stale_gauntlet:
            gauntlet_service.submit_result(run.user_id, run.id, "loss", triggered_by="inactivity")
        affected["gauntlet_runs"] = len(stale_gauntlet)

        chaos_service = ChaosService()
        stale_chaos = db.session.scalars(
            select(ChaosRun).where(ChaosRun.status == "in_progress", ChaosRun.updated_at < cutoff)
        ).all()
        for run in stale_chaos:
            chaos_service.apply_inactivity_loss(run.id)
        affected["chaos_runs"] = len(stale_chaos)

        history_service = HistoryService()
        stale_history = db.session.scalars(
            select(HistoryRun).where(HistoryRun.status == "in_progress", HistoryRun.updated_at < cutoff)
        ).all()
        for run in stale_history:
            history_service.apply_inactivity_loss(run.id)
        affected["history_runs"] = len(stale_history)

        stale_page_streak = db.session.scalars(
            select(PageStreakRun).where(PageStreakRun.status == "in_progress", PageStreakRun.updated_at < cutoff)
        ).all()
        for run in stale_page_streak:
            apply_page_streak_inactivity_loss(run.id)
        affected["page_streak_runs"] = len(stale_page_streak)

        for table_name, count in affected.items():
            if count:
                logger.info(
                    "Applied an inactivity loss to %d %s rows (>%dd idle)",
                    count, table_name, inactive_after_days,
                )
        return affected
    finally:
        if lock_conn is not None:
            try:
                lock_conn.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": _ADVISORY_LOCK_KEY})
            finally:
                lock_conn.close()
