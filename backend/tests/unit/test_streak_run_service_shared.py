# backend/tests/unit/test_streak_run_service_shared.py
"""Service scenarios that are identical across the chaos, gauntlet and history modes.

Every test here drives a two-killer roster through the shared run lifecycle
(`StreakRunService`). Mode-specific rules (checkpoints, rows, tiers, perk
pools) stay in `test_<mode>_service.py`.
"""
from datetime import datetime, timezone
from typing import Any, Callable

import pytest
from sqlalchemy import select

from app.core.extensions import db
from app.models import ChallengeCompletionRecord, Killer, Perk
from app.services.chaos_service import ChaosService
from app.services.gauntlet_service import GauntletService
from app.services.history_service import HistoryService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService
from tests.unit.conftest import make_chapter

KILLERS = ("The Trapper", "The Wraith")


class ModeAdapter:
    """How to drive one mode through the shared scenarios."""

    def __init__(self, name: str, make_service: Callable[[], Any], variant: tuple[str, ...], record_variant: str):
        self.name = name
        self.service = make_service()
        self.variant = variant
        self.record_variant = record_variant

    def get_run(self, user_id: int) -> dict[str, Any]:
        return self.service.get_or_create_run(user_id, *self.variant)

    def reset(self, user_id: int) -> dict[str, Any]:
        return self.service.reset_run(user_id, *self.variant)

    def submit(self, user_id: int, run: dict[str, Any], result: str, killer: str) -> dict[str, Any]:
        if self.name == "gauntlet":
            # Gauntlet deals its own target; aim it, then report the result.
            if result == "win":
                self.service.roll(user_id, *self.variant, target_character=killer)
            return self.service.submit_result(user_id, run["id"], result)
        return self.service.submit_result(user_id, run["id"], result, killer)


ADAPTERS = {
    "chaos": lambda: ModeAdapter("chaos", lambda: ChaosService(OwnershipService()), ("hell",), "hell"),
    "gauntlet": lambda: ModeAdapter("gauntlet", GauntletService, ("killer",), "killer_original"),
    "history": lambda: ModeAdapter("history", lambda: HistoryService(OwnershipService()), ("hell",), "hell"),
}


def seed_killer(name: str, killer_id: int | None = None, perk_count: int = 2) -> Killer:
    # `killer_id` doubles as the release number (release_number == id).
    killer = Killer(id=killer_id, name=name, chapter_id=make_chapter(db.session).id, power_name=f"{name} Power")
    db.session.add(killer)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(name=f"{name} Perk {i}", killer_id=killer.id, is_teachable=True, role="Killer"))
    db.session.commit()
    return killer


@pytest.fixture(params=sorted(ADAPTERS))
def mode(request, db_session) -> ModeAdapter:
    seed_killer(KILLERS[0], killer_id=1)
    seed_killer(KILLERS[1], killer_id=2)
    return ADAPTERS[request.param]()


@pytest.fixture
def user_id() -> int:
    user, err = UserService().register_user("streak_player", "streak@example.com", "SecurePass123!")
    assert err is None
    return user.id


def _record(user_id: int) -> ChallengeCompletionRecord:
    record = db.session.scalars(
        select(ChallengeCompletionRecord).where(ChallengeCompletionRecord.user_id == user_id)
    ).first()
    assert record is not None
    return record


def _clear_roster(mode: ModeAdapter, user_id: int, run: dict[str, Any]) -> dict[str, Any]:
    for killer in KILLERS:
        run = mode.submit(user_id, run, "win", killer)
    return run


@pytest.mark.unit
class TestSharedStreakRunService:
    def test_getting_twice_returns_the_same_run(self, mode: ModeAdapter, user_id: int) -> None:
        assert mode.get_run(user_id)["id"] == mode.get_run(user_id)["id"]

    def test_reset_missing_run_raises_value_error(self, mode: ModeAdapter, user_id: int) -> None:
        with pytest.raises(ValueError, match="Run not found"):
            mode.reset(user_id)

    def test_submit_invalid_result_string_raises_value_error(self, mode: ModeAdapter, user_id: int) -> None:
        run = mode.get_run(user_id)
        with pytest.raises(ValueError, match=r"must be 'win' or 'loss'"):
            mode.submit(user_id, run, "tie", KILLERS[0])

    def test_completed_run_rejects_further_results(self, mode: ModeAdapter, user_id: int) -> None:
        run = _clear_roster(mode, user_id, mode.get_run(user_id))
        assert run["status"] == "completed"
        with pytest.raises(ValueError, match="already completed"):
            mode.submit(user_id, run, "win", KILLERS[0])

    def test_completing_the_run_records_completion_and_resets_attempts(
        self, mode: ModeAdapter, user_id: int
    ) -> None:
        run = mode.get_run(user_id)
        mode.submit(user_id, run, "loss", KILLERS[0])  # attempts -> 1
        final = _clear_roster(mode, user_id, run)
        assert final["status"] == "completed"
        assert final["attempts"] == 0

        record = _record(user_id)
        assert record.mode == mode.name
        assert record.variant == mode.record_variant
        assert record.attempts_taken == 2
        assert record.matches_played == 3
        assert record.unlocked_characters_count == 2
        assert record.full_roster is True

    def test_completing_the_run_with_no_losses_records_one_attempt(self, mode: ModeAdapter, user_id: int) -> None:
        final = _clear_roster(mode, user_id, mode.get_run(user_id))
        assert final["status"] == "completed"
        assert _record(user_id).attempts_taken == 1

    def test_a_character_becoming_owned_mid_run_does_not_inflate_the_completion_count(
        self, mode: ModeAdapter, user_id: int
    ) -> None:
        """Regression: a killer newly owned after the pool was frozen at 2 must
        not inflate the count recorded for a run that only had to clear those 2."""
        run = mode.get_run(user_id)  # freezes the pool at 2
        seed_killer("Ghostface", killer_id=3)  # owned by default; the frozen pool stays at 2

        assert _clear_roster(mode, user_id, run)["status"] == "completed"
        assert _record(user_id).unlocked_characters_count == 2

    def test_full_roster_is_false_when_a_killer_exists_that_is_not_owned(
        self, mode: ModeAdapter, user_id: int
    ) -> None:
        # Predates the owned killers: it was in the game all along and the
        # player never picked it up, so it counts against "full".
        ghostface = seed_killer("Ghostface", killer_id=3)
        ghostface.created_at = datetime(2020, 1, 1, tzinfo=timezone.utc)
        db.session.commit()
        OwnershipService().set_character_ownership(user_id, ghostface.id, is_owned=False, role="Killer")

        assert _clear_roster(mode, user_id, mode.get_run(user_id))["status"] == "completed"
        record = _record(user_id)
        assert record.full_roster is False
        assert record.unlocked_characters_count == 2
