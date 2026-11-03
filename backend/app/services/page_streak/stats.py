# backend/app/services/page_streak/stats.py
from sqlalchemy import select

from app.core.extensions import db
from app.models import PageStreakPageLog, PageStreakRun
from app.schemas.page_streak import PageStreakStatsLog
from app.schemas.streak import StreakStats
from app.services.streak_stats import fetch_streak_stats


def fetch_page_streak_user_stats(user_id: int, killer: str) -> StreakStats[PageStreakStatsLog]:
    """Match history of one killer's Page Streak run. Every killer keeps its own stats."""
    run_ids = db.session.scalars(
        select(PageStreakRun.id).where(PageStreakRun.user_id == user_id, PageStreakRun.killer == killer)
    ).all()

    def with_killer(log: PageStreakPageLog) -> PageStreakStatsLog:
        return {**log.to_dict(), "killer": killer}

    return fetch_streak_stats(run_ids, PageStreakRun, PageStreakPageLog, with_killer)
