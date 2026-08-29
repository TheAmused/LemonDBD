# backend/app/services/streak_cleanup_service.py
import logging
from datetime import timedelta

from sqlalchemy import select, text

from app.core.extensions import db
from app.models import ChaosRun, GauntletRun, HistoryRun, PageStreakRun
from app.models.base import utcnow
from app.services.chaos_service import ChaosService
from app.services.gauntlet_service import GauntletService
from app.services.history_service import HistoryService
from app.services.page_streak.runs import apply_inactivity_loss as apply_page_streak_inactivity_loss

logger = logging.getLogger(__name__)

_ADVISORY_LOCK_KEY = 851193001


def apply_inactivity_losses(inactive_after_days: int = 90) -> dict[str, int]:
    """Finds in-progress streak runs whose updated_at is older than
    inactive_after_days and applies an inactivity loss. Guarded by a dedicated
    Postgres advisory lock connection to prevent race conditions across Gunicorn workers."""
    is_postgres = db.engine.dialect.name in ("postgresql", "postgres")
    lock_conn = None
    if is_postgres:
        lock_conn = db.engine.connect().execution_options(isolation_level="AUTOCOMMIT")
        got_lock = lock_conn.execute(
            text("SELECT pg_try_advisory_lock(:key)"), {"key": _ADVISORY_LOCK_KEY}
        ).scalar()
        if not got_lock:
            logger.warning("Inactivity cleanup skipped: advisory lock already held by another worker")
            lock_conn.close()
            return {}

    try:
        cutoff = utcnow() - timedelta(days=inactive_after_days)
        affected: dict[str, int] = {}

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
