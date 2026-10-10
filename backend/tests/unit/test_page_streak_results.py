# backend/tests/unit/test_page_streak_results.py
"""Page-streak results, completions, resets and inactivity losses."""
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Perk, PageStreakPageLog
from app.services.ownership_service import OwnershipService
from app.services.page_streak_service import PageStreakService
from app.services.page_streak.runs import apply_inactivity_loss
from tests.unit.page_streak_support import (
    FakePerkService,
    make_perks,
    seed_perks,
)
from tests.unit.page_streak_support import (  # noqa: F401  (pytest fixtures)
    user_service,
    ownership_service,
    streak_user,
)


@pytest.mark.unit
class TestPageStreakResults:
    """Tests for Page Streak result submission, win/loss state shifts, and resets."""

    @pytest.fixture(autouse=True)
    def setup_streak_results(self, streak_user: int) -> None:
        self.user_id = streak_user
        self.perks = make_perks(32, character="Nurse")
        seed_perks(self.perks)
        self.service = PageStreakService(perk_service=FakePerkService(self.perks))
        self.run = self.service.start_run(self.user_id, "Nurse")

    def build_for(self, page_number: int) -> list[str]:
        page = self.run["pages"][page_number - 1]
        return page[: self.service.expected_build_size(page)]

    def test_win_advances_to_next_page_and_records_best(self) -> None:
        updated = self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        assert updated["current_page"] == 2
        assert updated["best_page"] == 1
        assert updated["status"] == "in_progress"
        assert len(updated["history"]) == 1
        assert updated["history"][0]["result"] == "win"
        assert updated["history"][0]["page_number"] == 1

    def test_winning_last_page_completes_the_run(self) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        updated = self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        assert updated["status"] == "completed"
        assert updated["best_page"] == 3
        assert updated["current_page"] == updated["page_count"]

    def test_loss_resets_page_keeps_history_and_best(self) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        updated = self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "loss")
        assert updated["current_page"] == 1
        assert updated["attempt"] == 2
        assert updated["best_page"] == 1
        assert len(updated["history"]) == 2
        assert updated["pages"] == self.run["pages"]

    def test_short_last_page_accepts_a_short_build(self) -> None:
        page3 = self.run["pages"][2]
        assert len(page3) == 2
        assert self.service.expected_build_size(page3) == 2
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        updated = self.service.submit_result(self.user_id, "Nurse", 3, page3, "win")
        assert updated["status"] == "completed"

    def test_rejects_wrong_page(self) -> None:
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")

    def test_rejects_perk_from_another_page(self) -> None:
        bad = self.build_for(1)[:3] + [self.run["pages"][1][0]]
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, bad, "win")

    def test_rejects_wrong_perk_count(self) -> None:
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1)[:3], "win")

    def test_rejects_duplicate_perks(self) -> None:
        first = self.run["pages"][0][0]
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, [first, first, first, first], "win")

    def test_rejects_invalid_result_value(self) -> None:
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "draw")

    def test_rejects_result_on_completed_run(self) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")

    def test_get_completions_returns_this_killers_past_wins(self) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")

        completions = self.service.get_completions(self.user_id, "Nurse")
        assert len(completions) == 1
        assert completions[0]["variant"] == "Nurse"
        assert completions[0]["attempts_taken"] == 1
        assert completions[0]["matches_played"] == 3

    def test_winning_last_page_records_a_completion(self) -> None:
        from app.core.extensions import db
        from app.models import ChallengeCompletionRecord

        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")

        record = db.session.scalars(
            select(ChallengeCompletionRecord).where(ChallengeCompletionRecord.user_id == self.user_id)
        ).first()
        assert record is not None
        assert record.mode == "page_streak"
        assert record.variant == "Nurse"
        assert record.attempts_taken == 1
        assert record.matches_played == 3

    def test_completion_survives_a_per_killer_reset(self) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")

        self.service.abandon_run(self.user_id, "Nurse")

        roster = {entry["killer"]: entry for entry in self.service.get_roster(self.user_id)}
        assert roster["Nurse"]["status"] == "in_progress"
        assert roster["Nurse"]["ever_completed"] is True

    def test_reset_all_wipes_runs_and_completion_badges(self) -> None:
        from app.core.extensions import db
        from app.models import ChallengeCompletionRecord

        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")

        self.service.reset_all(self.user_id)

        assert self.service.get_run(self.user_id, "Nurse") is None
        roster = {entry["killer"]: entry for entry in self.service.get_roster(self.user_id)}
        assert roster["Nurse"]["status"] == "not_started"
        assert roster["Nurse"]["ever_completed"] is False
        assert db.session.scalars(
            select(ChallengeCompletionRecord).where(ChallengeCompletionRecord.user_id == self.user_id)
        ).first() is None

    def test_reset_restarts_with_fresh_snapshot_and_keeps_history(self, ownership_service: OwnershipService) -> None:
        from app.core.extensions import db

        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        for i in range(1, 18):
            perk = db.session.scalars(select(Perk).where(Perk.name == f"Perk {i:03d}")).first()
            ownership_service.set_perk_ownership(self.user_id, perk.id, is_unlocked=False)

        updated = self.service.abandon_run(self.user_id, "Nurse")
        assert updated["current_page"] == 1
        assert updated["attempt"] == 2
        assert updated["status"] == "in_progress"
        assert updated["page_count"] == 1
        assert len(updated["history"]) == 1
        assert updated["best_page"] == 1

    def test_reset_reopens_a_completed_run(self) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        updated = self.service.abandon_run(self.user_id, "Nurse")
        assert updated["status"] == "in_progress"
        assert updated["current_page"] == 1

    def test_replay_restarts_the_attempt_count_but_not_the_attempt_groups(self) -> None:
        from app.core.extensions import db
        from app.models import ChallengeCompletionRecord

        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "loss")
        for page in (1, 2, 3):
            self.service.submit_result(self.user_id, "Nurse", page, self.build_for(page), "win")
        completed = self.service.get_run(self.user_id, "Nurse")
        assert (completed["attempts"], completed["attempt"]) == (0, 2)

        replay = self.service.abandon_run(self.user_id, "Nurse")
        assert (replay["attempts"], replay["attempt"]) == (0, 3)
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "loss")

        updated = self.service.get_run(self.user_id, "Nurse")
        assert (updated["attempts"], updated["attempt"]) == (1, 4)
        assert [entry["attempt"] for entry in reversed(updated["history"])] == [1, 2, 2, 2, 3]
        record = db.session.scalars(
            select(ChallengeCompletionRecord).where(ChallengeCompletionRecord.user_id == self.user_id)
        ).first()
        assert (record.attempts_taken, record.matches_played) == (2, 4)

    def test_reset_without_a_run_is_rejected(self) -> None:
        with pytest.raises(ValueError):
            self.service.abandon_run(self.user_id, "Trapper")

    def test_apply_inactivity_loss_resets_page_and_increments_attempt(self) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        apply_inactivity_loss(self.run["id"])
        updated = self.service.get_run(self.user_id, "Nurse")
        assert updated["current_page"] == 1
        assert updated["attempt"] == 2

    def test_apply_inactivity_loss_writes_a_flagged_page_log(self, db_session: Session) -> None:
        apply_inactivity_loss(self.run["id"])
        log = db_session.scalars(
            select(PageStreakPageLog).where(PageStreakPageLog.run_id == self.run["id"])
        ).first()
        assert log.result == "loss"
        assert log.triggered_by == "inactivity"

    def test_apply_inactivity_loss_is_a_noop_on_a_completed_run(self, db_session: Session) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        before_count = db_session.query(PageStreakPageLog).count()
        apply_inactivity_loss(self.run["id"])
        assert db_session.query(PageStreakPageLog).count() == before_count
        reloaded = self.service.get_run(self.user_id, "Nurse")
        assert reloaded["status"] == "completed"
