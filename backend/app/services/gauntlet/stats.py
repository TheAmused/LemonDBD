# backend/app/services/gauntlet/stats.py
from sqlalchemy import select

from app.core.extensions import db
from app.models import GauntletMatchLog, GauntletRun
from app.schemas.gauntlet import GauntletMatchLogDict
from app.schemas.streak import StreakStats
from app.services.streak_stats import fetch_streak_stats


def fetch_gauntlet_user_stats(
    user_id: int, role: str, game_mode: str = "original"
) -> StreakStats[GauntletMatchLogDict]:
    run_ids = db.session.scalars(
        select(GauntletRun.id).where(
            GauntletRun.user_id == user_id, GauntletRun.role == role, GauntletRun.game_mode == game_mode
        )
    ).all()
    return fetch_streak_stats(run_ids, GauntletMatchLog, GauntletMatchLog.to_dict)
