# backend/app/services/challenge_reset.py
"""An admin's view of one player's challenge progress, and the reset used when they cheated.

A challenge is a (mode, variant) pair: the same pair `ChallengeCompletionRecord` files its wins under.
Resetting one deletes the player's run in it (its match logs go with it) and every completion record,
so the "already won" badge and the best streak are gone too. The next visit starts a fresh run.
"""
from sqlalchemy import select
from sqlalchemy.sql.elements import ColumnElement

from app.core.extensions import db
from app.core.transaction import lock_for_update, transaction
from app.models import ChallengeCompletionRecord, ChaosRun, GauntletRun, HistoryRun, PageStreakRun
from app.models.admin import CHALLENGE_MODES
from app.schemas.streak import AdminChallengeEntry, ChallengeResetResult
from app.services.gauntlet.constants import get_characters_per_match

#: Longest note an admin may add for the player (it goes into the email).
CHALLENGE_RESET_NOTE_MAX = 500

type _Run = GauntletRun | ChaosRun | HistoryRun | PageStreakRun
type _RunModel = type[GauntletRun] | type[ChaosRun] | type[HistoryRun] | type[PageStreakRun]

#: Per mode: the run table and the expression that equals the `variant` its completions are recorded under.
_RUNS: dict[str, tuple[_RunModel, ColumnElement[str]]] = {
    "gauntlet": (GauntletRun, GauntletRun.role.concat("_").concat(GauntletRun.game_mode)),
    "chaos": (ChaosRun, ChaosRun.difficulty),
    "history": (HistoryRun, HistoryRun.mode),
    "page_streak": (PageStreakRun, PageStreakRun.killer),
}


def _progress(run: _Run) -> tuple[int, int | None]:
    """How far a run has got and how long it is, as the player's progress bar counts it. The length is None
    while the run has no frozen pool yet (nothing played), because it then follows the live roster."""
    if isinstance(run, GauntletRun):
        current, pool, per_match = run.current_streak, len(run.owned_character_ids), get_characters_per_match(run.game_mode)
        total = -(-pool // per_match)
    elif isinstance(run, ChaosRun):
        current, total = run.current_streak, len(run.owned_killer_ids)
    elif isinstance(run, HistoryRun):
        current, total = run.total_killers_beaten, len(run.owned_killer_ids)
    else:
        current, total = max(run.current_page - 1, 0), len(run.pages)
    if run.status == "completed" and total:
        current = total
    return current, total or None


def list_user_challenges(user_id: int) -> list[AdminChallengeEntry]:
    """Every challenge the player has a run or a past completion in, in mode order."""
    entries: dict[tuple[str, str], AdminChallengeEntry] = {}
    for mode, (model, variant_column) in _RUNS.items():
        for variant, run in db.session.execute(select(variant_column, model).where(model.user_id == user_id)):
            current, total = _progress(run)
            entries[(mode, variant)] = {"mode": mode, "variant": variant, "completed": False, "current": current, "total": total}

    record = ChallengeCompletionRecord
    completed = db.session.execute(
        select(record.mode, record.variant).where(record.user_id == user_id).distinct()
    )
    for mode, variant in completed:
        entries.setdefault(
            (mode, variant), {"mode": mode, "variant": variant, "completed": True, "current": None, "total": None}
        )["completed"] = True

    mode_order = {mode: index for index, mode in enumerate(CHALLENGE_MODES)}
    return sorted(entries.values(), key=lambda e: (mode_order.get(e["mode"], len(mode_order)), e["variant"]))


def reset_user_challenge(user_id: int, mode: str, variant: str) -> ChallengeResetResult:
    """Deletes the player's run and completion records in one challenge. `mode` must be one of `CHALLENGE_MODES`."""
    model, variant_column = _RUNS[mode]
    record = ChallengeCompletionRecord
    with transaction():
        runs = db.session.scalars(
            lock_for_update(select(model).where(model.user_id == user_id, variant_column == variant))
        ).all()
        completions = db.session.scalars(
            select(record).where(record.user_id == user_id, record.mode == mode, record.variant == variant)
        ).all()
        for row in (*runs, *completions):
            db.session.delete(row)
    return {"runs_deleted": len(runs), "completions_deleted": len(completions)}
