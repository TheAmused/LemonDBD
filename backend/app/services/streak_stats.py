# backend/app/services/streak_stats.py
from collections.abc import Callable, Sequence

from sqlalchemy import func, select

from app.core.extensions import db
from app.models import (
    ChaosMatchLog,
    ChaosRun,
    GauntletMatchLog,
    GauntletRun,
    HistoryMatchLog,
    HistoryRun,
    IdPleaseMatchLog,
    IdPleaseRun,
    PageStreakPageLog,
    PageStreakRun,
)
from app.schemas.streak import StreakStats


#: Most recent matches returned with the stats, whatever the number of runs they come from.
RECENT_LOGS_LIMIT = 200


type StreakLog = ChaosMatchLog | GauntletMatchLog | HistoryMatchLog | IdPleaseMatchLog | PageStreakPageLog
type StreakRun = ChaosRun | GauntletRun | HistoryRun | IdPleaseRun | PageStreakRun


def fetch_streak_stats[LogModel: StreakLog, LogT](
    run_ids: Sequence[int],
    run_model: type[StreakRun],
    match_log_model: type[LogModel],
    serialize_log: Callable[[LogModel], LogT],
    limit: int = RECENT_LOGS_LIMIT,
) -> StreakStats[LogT]:
    """Shared stats for every streak mode's endpoint.

    The totals come from the runs, which count every match ever played. The logs are pruned
    (see `match_log_retention`), so `recent_logs` holds what is still kept, and the gap
    between it and `total_matches` is what the UI reports as no longer stored.
    """
    if not run_ids:
        return {"total_matches": 0, "wins": 0, "losses": 0, "win_rate": 0.0, "recent_logs": []}

    wins, losses = db.session.execute(
        select(func.sum(run_model.total_wins), func.sum(run_model.total_losses)).where(run_model.id.in_(run_ids))
    ).one()
    wins, losses = wins or 0, losses or 0
    total = wins + losses
    win_rate = round((wins / total * 100), 1) if total > 0 else 0.0

    kept = db.session.scalars(
        select(match_log_model).where(match_log_model.run_id.in_(run_ids)).order_by(match_log_model.id.desc()).limit(limit)
    ).all()

    return {
        "total_matches": total,
        "wins": wins,
        "losses": losses,
        "win_rate": win_rate,
        "recent_logs": [serialize_log(log) for log in kept],
    }
