# backend/app/services/history/stats.py
from sqlalchemy import select

from app.core.extensions import db
from app.models import HistoryMatchLog, HistoryRun
from app.schemas.history import HistoryMatchLogDict
from app.schemas.streak import StreakStats
from app.services.streak_stats import fetch_streak_stats


def fetch_history_user_stats(user_id: int, mode: str) -> StreakStats[HistoryMatchLogDict]:
    run_ids = db.session.scalars(
        select(HistoryRun.id).where(HistoryRun.user_id == user_id, HistoryRun.mode == mode)
    ).all()
    return fetch_streak_stats(run_ids, HistoryMatchLog, HistoryMatchLog.to_dict)
