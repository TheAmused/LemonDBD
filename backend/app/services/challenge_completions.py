# backend/app/services/challenge_completions.py
from typing import Any
from sqlalchemy import select

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
