# backend/app/services/match_log_retention.py
"""Keeps a challenge run's match log short. The lifetime totals live on the run, so only the list is pruned."""
from sqlalchemy import delete, func, select

from app.core.extensions import db
from app.services.streak_stats import StreakLog, StreakRun

#: Match logs kept per challenge run.
MAX_LOGGED_MATCHES = 100


def add_match_log(run: StreakRun, log: StreakLog) -> None:
    """Record a match: count it on the run, file the log, then drop old matches past the cap.

    Whole attempts go oldest first, so every attempt left is complete. The attempt the new
    match belongs to is never dropped; only if it alone is over the cap are its oldest matches.
    """
    db.session.add(log)
    run.record_match(log.result)
    db.session.flush()

    model = type(log)
    per_attempt = db.session.execute(
        select(model.attempt, func.count(model.id))
        .where(model.run_id == run.id)
        .group_by(model.attempt)
        .order_by(model.attempt)
    ).all()
    excess = sum(count for _, count in per_attempt) - MAX_LOGGED_MATCHES
    for attempt, count in per_attempt:
        if excess <= 0 or attempt >= log.attempt:
            break
        db.session.execute(delete(model).where(model.run_id == run.id, model.attempt == attempt))
        excess -= count
    if excess > 0:
        oldest = select(model.id).where(model.run_id == run.id, model.attempt == log.attempt).order_by(model.id).limit(excess)
        db.session.execute(delete(model).where(model.id.in_(oldest.scalar_subquery())))
