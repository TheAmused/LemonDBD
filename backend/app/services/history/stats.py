# backend/app/services/history/stats.py
from typing import Any
from sqlalchemy import select

from app.core.extensions import db
from app.models import HistoryMatchLog, HistoryRun
from app.services.streak_stats import fetch_streak_stats


def fetch_history_user_stats(user_id: int, mode: str) -> dict[str, Any]:
    run_ids = db.session.scalars(
        select(HistoryRun.id).where(HistoryRun.user_id == user_id, HistoryRun.mode == mode)
    ).all()
    return fetch_streak_stats(run_ids, HistoryMatchLog)
