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
        return self.service.abandon_run(user_id, *self.variant)

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


def _logged_attempts(mode: ModeAdapter, user_id: int) -> list[int]:
    run = db.session.scalars(select(mode.service.run_model).where(mode.service.run_model.user_id == user_id)).one()
    return [log.attempt for log in sorted(run.match_logs, key=lambda log: log.id)]


def _stored_run(mode: ModeAdapter, user_id: int):
    db.session.expire_all()
    return db.session.scalars(select(mode.service.run_model).where(mode.service.run_model.user_id == user_id)).one()


@pytest.mark.unit
class TestAttemptGroups:
    def test_a_loss_stays_in_the_attempt_it_ended(self, mode: ModeAdapter, user_id: int) -> None:
        run = mode.get_run(user_id)
        mode.submit(user_id, run, "loss", KILLERS[0])
        mode.submit(user_id, run, "loss", KILLERS[0])

        assert _logged_attempts(mode, user_id) == [1, 2]
        stored = _stored_run(mode, user_id)
        assert (stored.attempt, stored.attempts) == (3, 2)

    def test_abandoning_keeps_the_matches_and_opens_a_new_attempt(self, mode: ModeAdapter, user_id: int) -> None:
        run = mode.get_run(user_id)
        mode.submit(user_id, run, "win", KILLERS[0])
        reset = mode.reset(user_id)

        assert reset["id"] == run["id"]
        assert reset["completed_killers" if "completed_killers" in reset else "completed_characters"] == []
        stored = _stored_run(mode, user_id)
        assert (stored.attempt, stored.attempts) == (2, 1)
        assert stored.status == "in_progress"
        assert (stored.total_wins, stored.total_losses, stored.playthrough_matches) == (1, 0, 0)
        assert _logged_attempts(mode, user_id) == [1]

        mode.submit(user_id, reset, "win", KILLERS[1])
        assert _logged_attempts(mode, user_id) == [1, 2]

    def test_replaying_after_a_completion_restarts_the_count_but_not_the_groups(
        self, mode: ModeAdapter, user_id: int
    ) -> None:
        run = mode.get_run(user_id)
        mode.submit(user_id, run, "loss", KILLERS[0])
        _clear_roster(mode, user_id, run)
        assert _logged_attempts(mode, user_id) == [1, 2, 2]

        replay = mode.reset(user_id)
        stored = _stored_run(mode, user_id)
        assert (stored.attempt, stored.attempts) == (3, 0)

        _clear_roster(mode, user_id, replay)
        assert _logged_attempts(mode, user_id) == [1, 2, 2, 3, 3]
        records = db.session.scalars(
            select(ChallengeCompletionRecord)
            .where(ChallengeCompletionRecord.user_id == user_id)
            .order_by(ChallengeCompletionRecord.id)
        ).all()
        assert [(r.attempts_taken, r.matches_played) for r in records] == [(2, 3), (1, 2)]


@pytest.mark.unit
class TestMatchLogRetention:
    def _play(self, mode: ModeAdapter, user_id: int, run: dict[str, Any], results: list[str]) -> None:
        for result in results:
            mode.submit(user_id, run, result, KILLERS[0])

    def test_lifetime_totals_count_every_match(self, mode: ModeAdapter, user_id: int) -> None:
        run = mode.get_run(user_id)
        self._play(mode, user_id, run, ["loss", "loss"])
        stored = _stored_run(mode, user_id)
        assert (stored.total_wins, stored.total_losses, stored.playthrough_matches) == (0, 2, 2)

    def test_whole_old_attempts_are_dropped_first(
        self, mode: ModeAdapter, user_id: int, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("app.services.match_log_retention.MAX_LOGGED_MATCHES", 3)
        run = mode.get_run(user_id)
        self._play(mode, user_id, run, ["loss", "loss", "loss"])
        assert _logged_attempts(mode, user_id) == [1, 2, 3]

        self._play(mode, user_id, run, ["loss"])
        # Attempt 1 is gone as a whole; the rest are intact.
        assert _logged_attempts(mode, user_id) == [2, 3, 4]
        stored = _stored_run(mode, user_id)
        assert (stored.total_losses, stored.playthrough_matches) == (4, 4)

    def test_an_attempt_over_the_cap_loses_only_its_oldest_matches(
        self, mode: ModeAdapter, user_id: int, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("app.services.match_log_retention.MAX_LOGGED_MATCHES", 1)
        run = mode.get_run(user_id)
        mode.submit(user_id, run, "win", KILLERS[0])
        mode.submit(user_id, run, "loss", KILLERS[1])  # attempt 1 now holds two matches

        assert _logged_attempts(mode, user_id) == [1]
        stored = _stored_run(mode, user_id)
        assert (stored.total_wins, stored.total_losses) == (1, 1)

    def test_a_completion_reports_the_playthrough_even_after_pruning(
        self, mode: ModeAdapter, user_id: int, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("app.services.match_log_retention.MAX_LOGGED_MATCHES", 2)
        run = mode.get_run(user_id)
        self._play(mode, user_id, run, ["loss", "loss"])
        _clear_roster(mode, user_id, run)

        record = _record(user_id)
        assert (record.attempts_taken, record.matches_played) == (3, 4)
        assert _stored_run(mode, user_id).playthrough_matches == 0
