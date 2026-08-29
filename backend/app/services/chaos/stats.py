# backend/app/services/chaos/stats.py
from typing import Any
from sqlalchemy import select

from app.core.extensions import db
from app.models import ChaosMatchLog, ChaosRun
from app.services.streak_stats import fetch_streak_stats


def fetch_chaos_user_stats(user_id: int, difficulty: str) -> dict[str, Any]:
    run_ids = db.session.scalars(
        select(ChaosRun.id).where(ChaosRun.user_id == user_id, ChaosRun.difficulty == difficulty)
    ).all()
    return fetch_streak_stats(run_ids, ChaosMatchLog)
