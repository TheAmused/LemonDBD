# backend/tests/unit/test_gauntlet_results.py
"""Gauntlet match results, lazy freeze, character perks, completion and stats."""
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import GauntletMatchLog, GauntletRun
from app.services.gauntlet_service import GauntletService
from app.services.user_service import UserService
from tests.unit.gauntlet_support import (
    seed_killer,
    seed_survivor,
)
from tests.unit.gauntlet_support import (  # noqa: F401  (pytest fixtures)
    user_service,
    gauntlet_service,
    gauntlet_user,
)


@pytest.mark.unit
class TestGauntletResults:
    """Tests for Gauntlet match outcomes, streak preservation, and inactivity logs."""

    @pytest.fixture(autouse=True)
    def setup_run(self, gauntlet_service: GauntletService, gauntlet_user: int) -> None:
        seed_killer("Nurse")
        seed_killer("Trapper")
        self.user_id = gauntlet_user
        self.service = gauntlet_service
        self.run = gauntlet_service.get_or_create_run(self.user_id, "killer")

    def test_win_increments_streak_and_records_checkpoint(self) -> None:
        for expected in range(1, 10):
            updated = self.service.submit_result(self.user_id, self.run["id"], "win")
            assert updated["current_streak"] == expected
            assert updated["last_checkpoint_streak"] == 0

        tenth = self.service.submit_result(self.user_id, self.run["id"], "win")
        assert tenth["current_streak"] == 10
        assert tenth["last_checkpoint_streak"] == 10

    def test_loss_reverts_to_last_checkpoint(self) -> None:
        for _ in range(10):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss")
        assert after_loss["current_streak"] == 10

    def test_loss_before_any_checkpoint_resets_to_zero(self) -> None:
        for _ in range(3):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss")
        assert after_loss["current_streak"] == 0

    def test_win_marks_character_completed(self) -> None:
        target = self.run["current_character_id"]
        updated = self.service.submit_result(self.user_id, self.run["id"], "win")
        assert target in updated["completed_characters"]

    def test_loss_increments_attempts_regardless_of_checkpoint(self) -> None:
        assert self.run["attempts"] == 0
        after_first_loss = self.service.submit_result(self.user_id, self.run["id"], "loss")
        assert after_first_loss["attempts"] == 1
        for _ in range(10):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        after_checkpoint_loss = self.service.submit_result(self.user_id, self.run["id"], "loss")
        assert after_checkpoint_loss["current_streak"] == 10
        assert after_checkpoint_loss["attempts"] == 2

    def test_win_does_not_increment_attempts(self) -> None:
        updated = self.service.submit_result(self.user_id, self.run["id"], "win")
        assert updated["attempts"] == 0

    def test_inactivity_loss_increments_attempts(self) -> None:
        updated = self.service.submit_result(
            self.user_id, self.run["id"], "loss", triggered_by="inactivity"
        )
        assert updated["attempts"] == 1

    def test_best_streak_is_never_decreased_by_a_loss(self) -> None:
        for _ in range(3):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        updated = self.service.submit_result(self.user_id, self.run["id"], "loss")
        assert updated["best_streak"] == 3

    def test_rejects_result_for_another_users_run(self, user_service: UserService) -> None:
        other_user, _ = user_service.register_user("intruder_g", "intruder_g@test.com", "Pass123!")
        with pytest.raises(ValueError):
            self.service.submit_result(other_user.id, self.run["id"], "win")

    def test_new_character_mid_run_is_not_immediately_rollable(self) -> None:
        seed_killer("Huntress")
        for _ in range(20):
            run = self.service.roll(self.user_id, "killer")
            assert run["current_character_id"] != "Huntress"

    def test_completion_check_ignores_a_character_owned_mid_run(self) -> None:
        seed_killer("Huntress")
        run = self.service.get_or_create_run(self.user_id, "killer")
        for _ in range(2):
            run = self.service.submit_result(self.user_id, run["id"], "win")
            if run["status"] != "completed":
                run = self.service.roll(self.user_id, "killer")
        assert run["status"] == "completed"

    def test_loss_to_zero_refreezes_the_pool(self) -> None:
        seed_killer("Huntress")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss")
        assert "Huntress" in after_loss["owned_characters"]

    def test_completing_the_run_refreezes_the_pool(self) -> None:
        run = self.run
        self.service.submit_result(self.user_id, run["id"], "win")
        run = self.service.roll(self.user_id, "killer")
        seed_killer("Huntress")
        run = self.service.submit_result(self.user_id, run["id"], "win")
        assert run["status"] == "completed"
        assert "Huntress" in run["owned_characters"]

    def test_submit_result_records_triggered_by_player_by_default(self, db_session: Session) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "win")
        log = db_session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == self.run["id"])
        ).first()
        assert log.triggered_by == "player"

    def test_submit_result_records_triggered_by_inactivity_when_passed(self, db_session: Session) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "loss", triggered_by="inactivity")
        log = db_session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == self.run["id"])
        ).first()
        assert log.triggered_by == "inactivity"


@pytest.mark.unit
class TestGauntletLazyFreeze:
    """Tests for retroactive snapshot generation on runs missing initial frozen roster."""

    def test_existing_run_with_empty_snapshot_freezes_on_read(
        self, gauntlet_service: GauntletService, gauntlet_user: int, db_session: Session
    ) -> None:
        seed_killer("Nurse")
        seed_killer("Trapper")
        run = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        r = db_session.scalars(select(GauntletRun).where(GauntletRun.id == run["id"])).first()
        r.owned_character_ids = []
        db_session.commit()

        reloaded = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        assert sorted(reloaded["owned_characters"]) == ["Nurse", "Trapper"]


@pytest.mark.unit
class TestGauntletCharacterPerks:
    """Tests for populating native teachables into active loadouts."""

    def test_loadout_carries_the_targets_own_teachable_perks(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        seed_killer("Trapper", perk_count=3)
        seed_killer("Nurse", perk_count=3)
        gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        run = gauntlet_service.roll(gauntlet_user, "killer", target_character="Trapper")

        names = {p["name"] for p in run["current_loadout"]["character_perks"]}
        assert names == {"Trapper Perk 1", "Trapper Perk 2", "Trapper Perk 3"}

    def test_character_perks_are_present_on_brand_new_run(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        seed_killer("Trapper", perk_count=3)
        run = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        target = run["current_character_id"]

        perks = run["current_loadout"]["character_perks"]
        assert len(perks) == 3
        assert all(p["character"] == target for p in perks)


@pytest.mark.unit
class TestGauntletCompletion:
    """Tests for clearing full roster, completed run locking, and manual restarts."""

    @pytest.fixture(autouse=True)
    def setup_completion(self, gauntlet_service: GauntletService, gauntlet_user: int) -> None:
        seed_killer("Trapper")
        seed_killer("Nurse")
        self.user_id = gauntlet_user
        self.service = gauntlet_service

    def _clear(self, name: str) -> dict[str, object]:
        self.service.roll(self.user_id, "killer", target_character=name)
        run = self.service.get_or_create_run(self.user_id, "killer")
        return self.service.submit_result(self.user_id, run["id"], "win")

    def test_run_completes_once_every_owned_character_is_cleared(self) -> None:
        self.service.get_or_create_run(self.user_id, "killer")
        after_first = self._clear("Trapper")
        assert after_first["status"] == "in_progress"

        after_last = self._clear("Nurse")
        assert after_last["status"] == "completed"
        assert sorted(after_last["completed_characters"]) == ["Nurse", "Trapper"]

    def test_reset_starts_a_fresh_run(self) -> None:
        self.service.get_or_create_run(self.user_id, "killer")
        self._clear("Trapper")
        self._clear("Nurse")

        fresh = self.service.abandon_run(self.user_id, "killer")
        assert fresh["status"] == "in_progress"
        assert fresh["current_streak"] == 0
        assert fresh["completed_characters"] == []
        assert fresh["target_revealed"] is False

    def test_reset_keeps_the_best_streak(self) -> None:
        self.service.get_or_create_run(self.user_id, "killer")
        self._clear("Trapper")

        fresh = self.service.abandon_run(self.user_id, "killer")
        assert fresh["current_streak"] == 0
        assert fresh["best_streak"] == 1


@pytest.mark.unit
class TestGauntletStats:
    """Tests for Gauntlet match statistics and role isolation."""

    def test_stats_reflect_wins_and_losses(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        seed_killer("Nurse")
        seed_killer("Trapper")
        run = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        gauntlet_service.submit_result(gauntlet_user, run["id"], "win")
        gauntlet_service.submit_result(gauntlet_user, run["id"], "loss")

        stats = gauntlet_service.get_stats(gauntlet_user, "killer")
        assert stats["total_matches"] == 2
        assert stats["wins"] == 1
        assert stats["losses"] == 1
        assert stats["win_rate"] == 50.0
        assert len(stats["recent_logs"]) == 2

    def test_stats_are_isolated_per_role(
        self, gauntlet_service: GauntletService, gauntlet_user: int, db_session: Session
    ) -> None:
        seed_killer("Nurse")
        seed_survivor("Meg Thomas")

        run = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        gauntlet_service.submit_result(gauntlet_user, run["id"], "win")

        killer_stats = gauntlet_service.get_stats(gauntlet_user, "killer")
        survivor_stats = gauntlet_service.get_stats(gauntlet_user, "survivor")
        assert killer_stats["total_matches"] == 1
        assert survivor_stats["total_matches"] == 0


@pytest.mark.unit
class TestGauntletLoadoutHasNoGear:
    """Tests that Gauntlet loadouts do not inject items or equipment add-ons."""

    def test_survivor_loadout_carries_no_item(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        seed_survivor()
        gauntlet_service.get_or_create_run(gauntlet_user, "survivor")
        run = gauntlet_service.roll(gauntlet_user, "survivor")
        assert "item" not in run["current_loadout"]

    def test_killer_loadout_carries_no_gear(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        seed_killer("Trapper", perk_count=1)
        gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        run = gauntlet_service.roll(gauntlet_user, "killer", target_character="Trapper")
        loadout = run["current_loadout"]
        assert "item" not in loadout
        assert "addons" not in loadout
