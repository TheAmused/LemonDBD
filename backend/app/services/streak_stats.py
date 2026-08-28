# backend/app/services/streak_stats.py
from collections.abc import Callable, Sequence
from typing import Any, Type

from sqlalchemy import func, select

from app.core.extensions import db
from app.models import ChaosRun, GauntletRun, HistoryRun, PageStreakRun


def fetch_streak_stats(
    run_ids: Sequence[int],
    match_log_model: Type,
    post_process: Callable[[dict[str, Any], Any], dict[str, Any]] | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    """Shared match-log aggregation for every streak mode's stats endpoint."""
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

    recent_logs: list[dict[str, Any]] = []
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


def _total_completion_counts(model: Type) -> dict[str, int]:
    """completed_runs and unique_users in a single aggregate query."""
    completed_runs, unique_users = db.session.execute(
        select(func.count(model.id), func.count(func.distinct(model.user_id)))
        .where(model.status == "completed")
    ).one()
    return {"completed_runs": completed_runs or 0, "unique_users": unique_users or 0}


def _variant_breakdown(model: Type, variant_col: Any, variant_keys: Sequence[str]) -> dict[str, dict[str, int]]:
    """Per-variant completed_runs/unique_users in one GROUP BY query."""
    by_variant = {key: {"completed_runs": 0, "unique_users": 0} for key in variant_keys}
    rows = db.session.execute(
        select(variant_col, func.count(model.id), func.count(func.distinct(model.user_id)))
        .where(model.status == "completed")
        .group_by(variant_col)
    ).all()
    for variant_value, completed_runs, unique_users in rows:
        if variant_value in by_variant:
            by_variant[variant_value] = {"completed_runs": completed_runs, "unique_users": unique_users}
    return by_variant


def fetch_challenge_completion_counts() -> dict[str, dict[str, Any]]:
    """Admin-facing overview of challenge completions per mode and variant."""
    return {
        "gauntlet": {
            "total": _total_completion_counts(GauntletRun),
            "by_variant": _variant_breakdown(GauntletRun, GauntletRun.role, ("survivor", "killer")),
        },
        "chaos": {
            "total": _total_completion_counts(ChaosRun),
            "by_variant": _variant_breakdown(ChaosRun, ChaosRun.difficulty, ("easy", "medium", "hell")),
        },
        "history": {
            "total": _total_completion_counts(HistoryRun),
            "by_variant": _variant_breakdown(HistoryRun, HistoryRun.mode, ("medium", "hell")),
        },
        "page_streak": {
            "total": _total_completion_counts(PageStreakRun),
            "by_variant": {},
        },
    }
