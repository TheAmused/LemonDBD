# backend/app/services/challenge_completions.py
from typing import Any
from sqlalchemy import delete, select

from app.core.extensions import db
from app.models import ChallengeCompletionRecord


def record_challenge_completion(
    user_id: int,
    mode: str,
    variant: str,
    attempts_taken: int,
    matches_played: int,
    unlocked_characters_count: int,
) -> None:
    """Snapshot a fully-completed challenge run so it survives the run's own reset.

    Added to the session only -- the caller's existing commit (right after the
    run row itself is updated) persists this in the same transaction.
    """
    db.session.add(
        ChallengeCompletionRecord(
            user_id=user_id,
            mode=mode,
            variant=variant,
            attempts_taken=attempts_taken,
            matches_played=matches_played,
            unlocked_characters_count=unlocked_characters_count,
        )
    )


def fetch_challenge_completions(
    user_id: int, mode: str, variant: str, limit: int = 25
) -> list[dict[str, Any]]:
    """Retrieve past completions for a user/mode/variant, newest first."""
    records = db.session.scalars(
        select(ChallengeCompletionRecord)
        .where(
            ChallengeCompletionRecord.user_id == user_id,
            ChallengeCompletionRecord.mode == mode,
            ChallengeCompletionRecord.variant == variant,
        )
        .order_by(ChallengeCompletionRecord.completed_at.desc())
        .limit(limit)
    ).all()
    return [r.to_dict() for r in records]


def fetch_completed_variants(user_id: int, mode: str) -> set[str]:
    """Every distinct variant this user has ever fully completed for one mode."""
    rows = db.session.scalars(
        select(ChallengeCompletionRecord.variant)
        .where(
            ChallengeCompletionRecord.user_id == user_id,
            ChallengeCompletionRecord.mode == mode,
        )
        .distinct()
    ).all()
    return set(rows)


def fetch_completed_variants_by_mode(user_id: int) -> dict[str, list[str]]:
    """Every distinct (mode, variant) this user has ever fully completed, grouped by mode.

    Drives "already won" badges (challenge cards, difficulty tiles, page-streak
    killer roster) -- these survive a run's own reset because they read this
    table, not the run row itself.
    """
    rows = db.session.execute(
        select(ChallengeCompletionRecord.mode, ChallengeCompletionRecord.variant)
        .where(ChallengeCompletionRecord.user_id == user_id)
        .distinct()
    ).all()
    result: dict[str, list[str]] = {}
    for mode, variant in rows:
        result.setdefault(mode, []).append(variant)
    return result


def delete_completions(user_id: int, mode: str) -> None:
    """Wipe every completion record for a user/mode -- used only by page streak's
    "reset everything" flow, which intentionally also clears the win badges
    (unlike a normal per-run reset elsewhere, which leaves this table alone)."""
    db.session.execute(
        delete(ChallengeCompletionRecord).where(
            ChallengeCompletionRecord.user_id == user_id,
            ChallengeCompletionRecord.mode == mode,
        )
    )
