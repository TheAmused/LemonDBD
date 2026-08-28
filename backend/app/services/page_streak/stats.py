# backend/app/services/page_streak/stats.py
from typing import Any
from sqlalchemy import select

from app.core.extensions import db
from app.models import PageStreakPageLog, PageStreakRun
from app.services.streak_stats import fetch_streak_stats


def fetch_page_streak_user_stats(user_id: int) -> dict[str, Any]:
    """Aggregates match history across every killer's Page Streak run for this user."""
    runs = db.session.execute(
        select(PageStreakRun.id, PageStreakRun.killer).where(PageStreakRun.user_id == user_id)
    ).all()
    killer_by_run_id = dict(runs)

    def attach_killer(entry: dict[str, Any], log: PageStreakPageLog) -> dict[str, Any]:
        entry["killer"] = killer_by_run_id.get(log.run_id)
        return entry

    return fetch_streak_stats(list(killer_by_run_id.keys()), PageStreakPageLog, post_process=attach_killer)
