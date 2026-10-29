# backend/app/services/streak_cleanup_service.py
import logging
from collections.abc import Callable
from datetime import datetime, timedelta

from sqlalchemy import select, text

from app.core.extensions import db
from app.core.transaction import end_transaction
from app.models import ChaosRun, GauntletRun, HistoryRun, IdPleaseRun, PageStreakRun
from app.models.base import utcnow
from app.services.chaos_service import ChaosService
from app.services.gauntlet_service import GauntletService
from app.services.history_service import HistoryService
from app.services.id_please_service import IdPleaseService
from app.services.page_streak.runs import apply_inactivity_loss as apply_page_streak_inactivity_loss

logger = logging.getLogger(__name__)

_ADVISORY_LOCK_KEY = 851193001

type _RunModel = type[GauntletRun] | type[ChaosRun] | type[HistoryRun] | type[IdPleaseRun] | type[PageStreakRun]


def _sweep(model: _RunModel, apply_loss: Callable[[int, datetime], bool], cutoff: datetime) -> int:
    """Applies an inactivity loss to every in-progress run of `model` idle since before `cutoff`; returns how many
    it applied. The list is built before any run is locked, so `apply_loss` checks the run is still idle once it
    holds the lock. One run failing is logged and skipped, it does not stop the rest of the sweep."""
    run_ids = db.session.scalars(
        select(model.id).where(model.status == "in_progress", model.updated_at < cutoff)
    ).all()
    end_transaction()  # the listing opened one; each run below starts its own
    applied = 0
    for run_id in run_ids:
        try:
            applied += apply_loss(run_id, cutoff)
        except Exception:
            db.session.rollback()
            logger.exception("Inactivity loss failed for %s run %d", model.__tablename__, run_id)
    return applied


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
        affected = {
            "gauntlet_runs": _sweep(GauntletRun, GauntletService().apply_inactivity_loss, cutoff),
            "chaos_runs": _sweep(ChaosRun, ChaosService().apply_inactivity_loss, cutoff),
            "history_runs": _sweep(HistoryRun, HistoryService().apply_inactivity_loss, cutoff),
            "id_please_runs": _sweep(IdPleaseRun, IdPleaseService().apply_inactivity_loss, cutoff),
            "page_streak_runs": _sweep(PageStreakRun, apply_page_streak_inactivity_loss, cutoff),
        }

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
