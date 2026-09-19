# backend/app/services/page_streak/stats.py
from sqlalchemy import select

from app.core.extensions import db
from app.models import PageStreakPageLog, PageStreakRun
from app.schemas.page_streak import PageStreakStatsLog
from app.schemas.streak import StreakStats
from app.services.streak_stats import fetch_streak_stats


def fetch_page_streak_user_stats(user_id: int) -> StreakStats[PageStreakStatsLog]:
    """Aggregates match history across every killer's Page Streak run for this user."""
    runs = db.session.execute(
        select(PageStreakRun.id, PageStreakRun.killer).where(PageStreakRun.user_id == user_id)
    ).all()
    killer_by_run_id: dict[int, str] = {run_id: killer for run_id, killer in runs}

    def with_killer(log: PageStreakPageLog) -> PageStreakStatsLog:
        return {**log.to_dict(), "killer": killer_by_run_id.get(log.run_id)}

    return fetch_streak_stats(list(killer_by_run_id), PageStreakPageLog, with_killer)
