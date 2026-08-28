# backend/tests/unit/test_history_service.py
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Character, HistoryMatchLog, Perk, User
from app.services.history_service import HistoryService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


def seed_killer(name: str, release_number: int, perk_count: int = 2) -> Character:
    from app.core.extensions import db

    character = Character(name=name, role="Killer", release_number=release_number)
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(
            Perk(
                name=f"{name} Perk {i}",
                character_id=character.id,
                is_teachable=True,
                category="Killer",
            )
        )
    db.session.commit()
    return character


def seed_general_perk(name: str = "Whispers") -> None:
    from app.core.extensions import db

    db.session.add(Perk(name=name, character_id=None, category="Killer"))
    db.session.commit()


@pytest.fixture
def user_service() -> UserService:
    return UserService()


@pytest.fixture
def ownership_service() -> OwnershipService:
    return OwnershipService()


@pytest.fixture
def history_service(ownership_service: OwnershipService) -> HistoryService:
    return HistoryService(ownership_service=ownership_service)


@pytest.fixture
def history_user(user_service: UserService) -> int:
    user, err = user_service.register_user("history_player", "history@example.com", "SecurePass123!")
    assert err is None
    return user.id


@pytest.mark.unit
class TestGetOrCreateRun:
    """Tests for initializing History mode runs and establishing starting perk pools."""

    @pytest.fixture(autouse=True)
    def setup_roster(self) -> None:
        seed_general_perk("Whispers")
        for i, name in enumerate(["The Trapper", "The Wraith", "The Hillbilly"], start=1):
            seed_killer(name, release_number=i)

    def test_creates_a_fresh_run_with_general_perks_unlocked(
        self, history_service: HistoryService, history_user: int
    ) -> None:
        run = history_service.get_or_create_run(history_user, "medium")
        assert run["status"] == "in_progress"
        assert run["current_row_index"] == 0
        assert run["unlocked_perk_names"] == ["Whispers"]
        assert run["current_row_killers"] == ["The Trapper", "The Wraith", "The Hillbilly"]
        assert run["row_size"] == 5
        assert run["total_rows"] == 1
        assert run["total_owned_killers"] == 3

    def test_medium_and_hell_runs_are_independent(
        self, history_service: HistoryService, history_user: int
    ) -> None:
        medium_run = history_service.get_or_create_run(history_user, "medium")
        hell_run = history_service.get_or_create_run(history_user, "hell")
        assert medium_run["id"] != hell_run["id"]

    def test_getting_twice_returns_the_same_run(
        self, history_service: HistoryService, history_user: int
    ) -> None:
        first = history_service.get_or_create_run(history_user, "medium")
        second = history_service.get_or_create_run(history_user, "medium")
        assert first["id"] == second["id"]


@pytest.mark.unit
class TestSubmitResultWithinARow:
    """Tests for per-row killer clears, perk unlocking, and match auditing."""

    @pytest.fixture(autouse=True)
    def setup_state(self, history_service: HistoryService, history_user: int) -> None:
        seed_general_perk("Whispers")
        for i, name in enumerate(["The Trapper", "The Wraith", "The Hillbilly"], start=1):
            seed_killer(name, release_number=i)
        self.user_id = history_user
        self.service = history_service
        self.run = history_service.get_or_create_run(self.user_id, "hell")

    def test_win_adds_killer_and_unlocks_their_perks(self) -> None:
        updated = self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        assert "The Trapper" in updated["completed_killers"]
        assert "The Trapper Perk 1" in updated["unlocked_perk_names"]
        assert "The Trapper Perk 2" in updated["unlocked_perk_names"]
        assert set(updated["newly_unlocked_perks"]) == {"The Trapper Perk 1", "The Trapper Perk 2"}
        assert updated["row_cleared"] is False
        assert updated["total_killers_beaten"] == 1

    def test_cannot_win_with_a_killer_outside_the_active_row(self) -> None:
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, self.run["id"], "win", "Someone Else")

    def test_cannot_win_with_an_already_completed_killer_in_the_row(self) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")

    def test_clearing_every_killer_in_the_row_advances_and_completes(self) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Hillbilly")
        assert final["row_cleared"] is True
        assert final["status"] == "completed"
        assert final["completed_killers"] == []
        assert final["total_killers_beaten"] == 3

    def test_match_log_records_the_row_played(self, db_session: Session) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Hillbilly")
        assert final["row_cleared"] is True

        logs = db_session.scalars(
            select(HistoryMatchLog).where(
                HistoryMatchLog.run_id == self.run["id"],
                HistoryMatchLog.killer_id == "The Hillbilly",
            )
        ).all()
        assert len(logs) == 1
        assert logs[0].row_index == 0

    def test_apply_inactivity_loss_writes_a_flagged_match_log(self, db_session: Session) -> None:
        self.service.apply_inactivity_loss(self.run["id"])
        log = db_session.scalars(
            select(HistoryMatchLog).where(HistoryMatchLog.run_id == self.run["id"])
        ).first()
        assert log.result == "loss"
        assert log.triggered_by == "inactivity"

    def test_apply_inactivity_loss_is_a_noop_on_a_completed_run(self, db_session: Session) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Hillbilly")
        assert final["status"] == "completed"

        before_count = db_session.query(HistoryMatchLog).count()
        self.service.apply_inactivity_loss(self.run["id"])
        assert db_session.query(HistoryMatchLog).count() == before_count


@pytest.mark.unit
class TestHellModeLoss:
    """Tests for Hell mode total wipe mechanics upon defeat."""

    @pytest.fixture(autouse=True)
    def setup_hell_state(self, history_service: HistoryService, history_user: int) -> None:
        seed_general_perk("Whispers")
        for i, name in enumerate([f"Killer {n}" for n in range(7)], start=1):
            seed_killer(name, release_number=i)
        self.user_id = history_user
        self.service = history_service
        self.run = history_service.get_or_create_run(self.user_id, "hell")

    def test_any_loss_resets_everything(self) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "win", "Killer 0")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 1")
        assert after_loss["current_row_index"] == 0
        assert after_loss["completed_killers"] == []
        assert after_loss["unlocked_perk_names"] == ["Whispers"]
        assert after_loss["total_killers_beaten"] == 0

    def test_loss_after_clearing_a_row_still_resets_to_zero(self, db_session: Session) -> None:
        for name in ["Killer 0", "Killer 1", "Killer 2", "Killer 3", "Killer 4"]:
            self.service.submit_result(self.user_id, self.run["id"], "win", name)
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 5")
        assert after_loss["current_row_index"] == 0
        assert after_loss["total_killers_beaten"] == 0

        logs = db_session.scalars(
            select(HistoryMatchLog).where(
                HistoryMatchLog.run_id == self.run["id"],
                HistoryMatchLog.killer_id == "Killer 5",
            )
        ).all()
        assert len(logs) == 1
        assert logs[0].row_index == 1


@pytest.mark.unit
class TestMediumModeCheckpoint:
    """Tests for Medium mode checkpointing at row boundaries."""

    @pytest.fixture(autouse=True)
    def setup_medium_state(self, history_service: HistoryService, history_user: int) -> None:
        seed_general_perk("Whispers")
        for i, name in enumerate([f"Killer {n}" for n in range(10)], start=1):
            seed_killer(name, release_number=i)
        self.user_id = history_user
        self.service = history_service
        self.run = history_service.get_or_create_run(self.user_id, "medium")

    def _win(self, name: str) -> dict[str, object]:
        return self.service.submit_result(self.user_id, self.run["id"], "win", name)

    def test_loss_within_a_row_falls_back_to_start_of_that_row(self) -> None:
        self._win("Killer 0")
        self._win("Killer 1")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 2")
        assert after_loss["current_row_index"] == 0
        assert after_loss["completed_killers"] == []
        assert after_loss["total_killers_beaten"] == 0

    def test_loss_after_clearing_a_row_falls_back_to_that_rows_checkpoint(self) -> None:
        for name in ["Killer 0", "Killer 1", "Killer 2", "Killer 3", "Killer 4"]:
            self._win(name)
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 5")
        assert after_loss["current_row_index"] == 1
        assert after_loss["completed_killers"] == []
        assert after_loss["total_killers_beaten"] == 5
        assert "Killer 0 Perk 1" in after_loss["unlocked_perk_names"]


@pytest.mark.unit
class TestResetRun:
    """Tests for resetting in-progress History runs."""

    def test_reset_wipes_and_starts_over(
        self, history_service: HistoryService, history_user: int
    ) -> None:
        seed_general_perk("Whispers")
        seed_killer("The Trapper", release_number=1)
        run = history_service.get_or_create_run(history_user, "hell")
        history_service.submit_result(history_user, run["id"], "win", "The Trapper")

        reset = history_service.reset_run(history_user, "hell")
        assert reset["total_killers_beaten"] == 0
        assert reset["completed_killers"] == []
        assert reset["unlocked_perk_names"] == ["Whispers"]

    def test_reset_missing_run_raises(
        self, history_service: HistoryService, history_user: int
    ) -> None:
        with pytest.raises(ValueError):
            history_service.reset_run(history_user, "medium")


@pytest.mark.unit
class TestGetStats:
    """Tests for History mode match aggregation."""

    def test_stats_reflect_submitted_results(
        self, history_service: HistoryService, history_user: int
    ) -> None:
        seed_general_perk("Whispers")
        seed_killer("The Trapper", release_number=1)
        run = history_service.get_or_create_run(history_user, "hell")
        history_service.submit_result(history_user, run["id"], "win", "The Trapper")

        stats = history_service.get_stats(history_user, "hell")
        assert stats["total_matches"] == 1
        assert stats["wins"] == 1


@pytest.mark.unit
class TestFrozenKillerRoster:
    """Tests for History mode roster snapshots and dynamic refreezing."""

    @pytest.fixture(autouse=True)
    def setup_frozen(self, history_service: HistoryService, history_user: int) -> None:
        seed_general_perk("Whispers")
        for i, name in enumerate(["The Trapper", "The Wraith", "The Hillbilly"], start=1):
            seed_killer(name, release_number=i)
        self.user_id = history_user
        self.service = history_service

    def test_new_killer_mid_run_does_not_reshuffle_active_row(self) -> None:
        before = self.service.get_or_create_run(self.user_id, "hell")
        row_before = before["current_row_killers"]
        seed_killer("Some New Killer", release_number=99)
        after = self.service.get_or_create_run(self.user_id, "hell")
        assert after["current_row_killers"] == row_before

    def test_hell_loss_refreezes_the_roster(self) -> None:
        run = self.service.get_or_create_run(self.user_id, "hell")
        seed_killer("Some New Killer", release_number=99)
        refrozen = self.service.submit_result(
            self.user_id, run["id"], "loss", run["current_row_killers"][0]
        )
        assert "Some New Killer" in refrozen["owned_killers"]

    def test_medium_loss_before_any_checkpoint_refreezes_the_roster(self) -> None:
        run = self.service.get_or_create_run(self.user_id, "medium")
        seed_killer("Some New Killer", release_number=99)
        after_loss = self.service.submit_result(
            self.user_id, run["id"], "loss", run["current_row_killers"][0]
        )
        assert "Some New Killer" in after_loss["owned_killers"]


@pytest.mark.unit
class TestOwnershipShrinksMidRun:
    """Tests that unowning characters mid-run prevents deadlocks."""

    def test_unowning_the_only_killer_in_next_row_does_not_soft_lock(
        self, history_service: HistoryService, history_user: int, ownership_service: OwnershipService
    ) -> None:
        seed_general_perk("Whispers")
        killers = {}
        for i, name in enumerate([f"Killer {n}" for n in range(1, 7)], start=1):
            killers[name] = seed_killer(name, release_number=i)

        run = history_service.get_or_create_run(history_user, "hell")
        for name in ["Killer 1", "Killer 2", "Killer 3", "Killer 4", "Killer 5"]:
            history_service.submit_result(history_user, run["id"], "win", name)

        killer_6 = killers["Killer 6"]
        ownership_service.set_character_ownership(history_user, killer_6.id, is_owned=False)

        reloaded = history_service.get_or_create_run(history_user, "hell")
        assert reloaded["status"] == "in_progress"
        assert reloaded["current_row_index"] < reloaded["total_rows"]
        assert len(reloaded["current_row_killers"]) > 0
