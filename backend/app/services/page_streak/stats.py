# backend/app/services/page_streak/stats.py
from typing import Any, Dict

from sqlalchemy import select

from app.core.extensions import db
from app.models import PageStreakPageLog, PageStreakRun
from app.services.streak_stats import fetch_streak_stats


def fetch_page_streak_user_stats(user_id: int) -> Dict[str, Any]:
    """Aggregates match history across every killer's Page Streak run for
    this user. Unlike the other three modes, one user has multiple
    concurrent runs (one per killer) feeding a single stats view, so each
    recent log is enriched with which killer it belongs to."""
    runs = db.session.execute(
        select(PageStreakRun.id, PageStreakRun.killer).where(PageStreakRun.user_id == user_id)
    ).all()
    killer_by_run_id = dict(runs)

    def attach_killer(entry: Dict[str, Any], log: PageStreakPageLog) -> Dict[str, Any]:
        entry["killer"] = killer_by_run_id.get(log.run_id)
        return entry

    return fetch_streak_stats(list(killer_by_run_id.keys()), PageStreakPageLog, post_process=attach_killer)
