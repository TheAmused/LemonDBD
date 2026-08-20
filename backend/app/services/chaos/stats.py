# backend/app/services/chaos/stats.py
from typing import Any, Dict

from sqlalchemy import func, select

from app.core.extensions import db
from app.models import ChaosMatchLog, ChaosRun


def fetch_chaos_user_stats(user_id: int, difficulty: str) -> Dict[str, Any]:
    run_ids = db.session.scalars(
        select(ChaosRun.id).where(ChaosRun.user_id == user_id, ChaosRun.difficulty == difficulty)
    ).all()
    if not run_ids:
        return {"total_matches": 0, "wins": 0, "losses": 0, "win_rate": 0.0, "recent_logs": []}

    total = db.session.scalar(
        select(func.count(ChaosMatchLog.id)).where(ChaosMatchLog.run_id.in_(run_ids))
    ) or 0
    wins = db.session.scalar(
        select(func.count(ChaosMatchLog.id)).where(
            ChaosMatchLog.run_id.in_(run_ids), ChaosMatchLog.result == "win"
        )
    ) or 0
    win_rate = round((wins / total * 100), 1) if total > 0 else 0.0

    recent = db.session.scalars(
        select(ChaosMatchLog).where(ChaosMatchLog.run_id.in_(run_ids))
        .order_by(ChaosMatchLog.id.desc()).limit(10)
    ).all()

    return {
        "total_matches": total,
        "wins": wins,
        "losses": total - wins,
        "win_rate": win_rate,
        "recent_logs": [log.to_dict() for log in recent],
    }
