# backend/app/services/streak_stats.py
from typing import Any, Callable, Dict, List, Optional, Sequence, Type

from sqlalchemy import func, select

from app.core.extensions import db


def fetch_streak_stats(
    run_ids: Sequence[int],
    match_log_model: Type,
    post_process: Optional[Callable[[Dict[str, Any], Any], Dict[str, Any]]] = None,
    limit: int = 10,
) -> Dict[str, Any]:
    """Shared match-log aggregation for every streak mode's stats endpoint:
    total/wins/losses/win_rate plus the most recent N match logs. Gauntlet,
    Chaos, History, and Page Streak each used to hand-roll an identical copy
    of this query against their own MatchLog model; this is the one place
    it lives now, so a future change to the shape only has to happen once.

    `post_process(entry, log)` lets a mode enrich each serialized log dict
    with fields that aren't on the match-log row itself (e.g. Page Streak's
    `killer` name, which lives on the run, not the log).
    """
    if not run_ids:
        return {"total_matches": 0, "wins": 0, "losses": 0, "win_rate": 0.0, "recent_logs": []}

    run_id_col = match_log_model.run_id

    total = db.session.scalar(
        select(func.count(match_log_model.id)).where(run_id_col.in_(run_ids))
    ) or 0
    wins = db.session.scalar(
        select(func.count(match_log_model.id)).where(
            run_id_col.in_(run_ids), match_log_model.result == "win"
        )
    ) or 0
    win_rate = round((wins / total * 100), 1) if total > 0 else 0.0

    recent = db.session.scalars(
        select(match_log_model).where(run_id_col.in_(run_ids))
        .order_by(match_log_model.id.desc()).limit(limit)
    ).all()

    recent_logs: List[Dict[str, Any]] = []
    for log in recent:
        entry = log.to_dict()
        if post_process:
            entry = post_process(entry, log)
        recent_logs.append(entry)

    return {
        "total_matches": total,
        "wins": wins,
        "losses": total - wins,
        "win_rate": win_rate,
        "recent_logs": recent_logs,
    }
