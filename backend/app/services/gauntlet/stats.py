# backend/app/services/gauntlet/stats.py
from typing import Any, Dict

from sqlalchemy import select

from app.core.extensions import db
from app.models import GauntletMatchLog, GauntletRun
from app.services.streak_stats import fetch_streak_stats


def fetch_gauntlet_user_stats(user_id: int, role: str) -> Dict[str, Any]:
    run_ids = db.session.scalars(
        select(GauntletRun.id).where(GauntletRun.user_id == user_id, GauntletRun.role == role)
    ).all()
    return fetch_streak_stats(run_ids, GauntletMatchLog)
