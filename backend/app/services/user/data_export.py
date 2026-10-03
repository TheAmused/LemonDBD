# backend/app/services/user/data_export.py
"""Self-service export of everything the server holds about one account."""
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import inspect, select

from app.core.extensions import db
from app.models import (
    BugReport,
    ChallengeCompletionRecord,
    ChaosMatchLog,
    ChaosRun,
    GauntletMatchLog,
    GauntletRun,
    HistoryMatchLog,
    HistoryRun,
    MinigameUserStat,
    PageStreakPageLog,
    PageStreakRun,
    User,
    UserCharacterOwnership,
    UserPerkOwnership,
    UserShowcase,
    Vote,
)

#: Credentials and one-time codes: never part of an export.
_USER_SECRET_COLUMNS = frozenset(
    {
        "password_hash",
        "verification_code",
        "verification_code_expires_at",
        "verification_attempts",
        "reset_token",
        "reset_token_expires_at",
    }
)

# (run model, its match-log model): logs belong to the user through their run.
_RUNS_WITH_LOGS = (
    ("chaos", ChaosRun, ChaosMatchLog),
    ("gauntlet", GauntletRun, GauntletMatchLog),
    ("history", HistoryRun, HistoryMatchLog),
    ("page_streak", PageStreakRun, PageStreakPageLog),
)


def _plain(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def row_to_dict(row: Any, exclude: frozenset[str] = frozenset()) -> dict[str, Any]:
    """Every column of an ORM row as JSON-safe values."""
    return {
        attr.key: _plain(getattr(row, attr.key))
        for attr in inspect(row).mapper.column_attrs
        if attr.key not in exclude
    }


def _rows(model: Any, *where: Any) -> list[dict[str, Any]]:
    return [row_to_dict(r) for r in db.session.scalars(select(model).where(*where))]


def export_user_data(user_id: int) -> dict[str, Any] | None:
    """Collect the account's own records; None when the user does not exist."""
    user = db.session.get(User, user_id)
    if not user:
        return None

    runs: dict[str, Any] = {}
    for name, run_model, log_model in _RUNS_WITH_LOGS:
        run_rows = list(db.session.scalars(select(run_model).where(run_model.user_id == user_id)))
        run_ids = [r.id for r in run_rows]
        logs = (
            [row_to_dict(r) for r in db.session.scalars(select(log_model).where(log_model.run_id.in_(run_ids)))]
            if run_ids
            else []
        )
        runs[name] = {"runs": [row_to_dict(r) for r in run_rows], "match_log": logs}

    return {
        "exported_at": datetime.now().astimezone().isoformat(),
        "account": row_to_dict(user, _USER_SECRET_COLUMNS),
        "character_ownership": _rows(UserCharacterOwnership, UserCharacterOwnership.user_id == user_id),
        "perk_ownership": _rows(UserPerkOwnership, UserPerkOwnership.user_id == user_id),
        "showcase": _rows(UserShowcase, UserShowcase.user_id == user_id),
        "streak_runs": runs,
        "challenge_completions": _rows(
            ChallengeCompletionRecord, ChallengeCompletionRecord.user_id == user_id
        ),
        "minigame_stats": _rows(MinigameUserStat, MinigameUserStat.user_id == user_id),
        "smash_or_pass_votes": _rows(Vote, Vote.user_id == user_id),
        "bug_reports": _rows(BugReport, BugReport.user_id == user_id),
    }
