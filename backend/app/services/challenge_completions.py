# backend/app/services/challenge_completions.py
from typing import Any
from sqlalchemy import delete, select

from app.core.extensions import db
from app.models import ChallengeCompletionRecord, ChaosRun, GauntletRun, HistoryRun


def record_challenge_completion(
    user_id: int,
    mode: str,
    variant: str,
    attempts_taken: int,
    matches_played: int,
    unlocked_characters_count: int,
    full_roster: bool = False,
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
            full_roster=full_roster,
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


def _fetch_counts_by_mode(user_id: int, *, full_roster_only: bool) -> dict[str, dict[str, int]]:
    """Shared query behind `fetch_completion_counts_by_mode` and
    `fetch_full_roster_counts_by_mode` -- every (mode, variant) this user has
    completed (optionally restricted to full-roster clears), grouped by mode,
    with the roster size frozen at the most recent such completion."""
    conditions = [ChallengeCompletionRecord.user_id == user_id]
    if full_roster_only:
        conditions.append(ChallengeCompletionRecord.full_roster.is_(True))

    rows = db.session.execute(
        select(
            ChallengeCompletionRecord.mode,
            ChallengeCompletionRecord.variant,
            ChallengeCompletionRecord.unlocked_characters_count,
        )
        .where(*conditions)
        .order_by(ChallengeCompletionRecord.completed_at.desc(), ChallengeCompletionRecord.id.desc())
    ).all()
    result: dict[str, dict[str, int]] = {}
    for mode, variant, count in rows:
        result.setdefault(mode, {})
        result[mode].setdefault(variant, count)
    return result


def fetch_completion_counts_by_mode(user_id: int) -> dict[str, dict[str, int]]:
    """Every (mode, variant) this user has ever completed, grouped by mode,
    with the roster size frozen at the most recent such completion --
    regardless of whether it was a full-roster clear. Drives the killer
    count shown next to the normal (gold) "already beaten" badge; see
    `fetch_full_roster_counts_by_mode` for the red variant's own count."""
    return _fetch_counts_by_mode(user_id, full_roster_only=False)


def fetch_full_roster_counts_by_mode(user_id: int) -> dict[str, dict[str, int]]:
    """Every (mode, variant) this user has ever completed with a full-roster
    pool, grouped by mode, with the roster size frozen at the most recent
    such completion -- permanent, like `fetch_completed_variants_by_mode`.
    Drives the red "full roster" card badge (a variant's presence as a key
    means it's earned) and the killer-count shown next to it."""
    return _fetch_counts_by_mode(user_id, full_roster_only=True)


def fetch_active_run_variants_by_mode(user_id: int) -> dict[str, list[str]]:
    """Every mode+variant this user currently has an in-progress run for.

    A completion record is permanent by design (it must survive a reset), but
    that means a tier cleared once in the past would otherwise keep looking
    "already completed" forever -- including while the player is mid-way
    through a brand new attempt on that same tier after resetting. This lets
    the frontend tell those two cases apart and only reopen the difficulty
    picker when there's no run actually in progress.
    """
    result: dict[str, list[str]] = {}

    gauntlet_rows = db.session.execute(
        select(GauntletRun.role, GauntletRun.game_mode).where(
            GauntletRun.user_id == user_id, GauntletRun.status == "in_progress"
        )
    ).all()
    if gauntlet_rows:
        result["gauntlet"] = [f"{role}_{game_mode}" for role, game_mode in gauntlet_rows]

    chaos_rows = db.session.scalars(
        select(ChaosRun.difficulty).where(ChaosRun.user_id == user_id, ChaosRun.status == "in_progress")
    ).all()
    if chaos_rows:
        result["chaos"] = list(chaos_rows)

    history_rows = db.session.scalars(
        select(HistoryRun.mode).where(HistoryRun.user_id == user_id, HistoryRun.status == "in_progress")
    ).all()
    if history_rows:
        result["history"] = list(history_rows)

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
