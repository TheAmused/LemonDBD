# backend/tests/unit/test_gauntlet_service.py
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Character, GauntletMatchLog, GauntletRun, Perk
from app.services.gauntlet import CHECKPOINT_INTERVAL, get_owned_character_names
from app.services.gauntlet_service import GauntletService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


def seed_killer(name: str, perk_count: int = 3) -> Character:
    from app.core.extensions import db

    character = Character(name=name, role="Killer")
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


def seed_survivor(name: str = "Meg Thomas", perk_count: int = 1) -> Character:
    from app.core.extensions import db

    character = Character(name=name, role="Survivor")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(
            Perk(
                name=f"{name} Perk {i}",
                character_id=character.id,
                is_teachable=True,
                category="Survivor",
            )
        )
    db.session.commit()
    return character


@pytest.fixture
def user_service() -> UserService:
    return UserService()


@pytest.fixture
def ownership_service() -> OwnershipService:
    return OwnershipService()


@pytest.fixture
def gauntlet_service() -> GauntletService:
    return GauntletService()


@pytest.fixture
def gauntlet_user(user_service: UserService) -> int:
    user, err = user_service.register_user("gauntlet_master", "master@example.com", "Password123!")
    assert err is None
    return user.id


@pytest.mark.unit
class TestGauntletTiers:
    """Tests for Gauntlet streak tiers, perk restrictions, and role thresholds."""

    @pytest.mark.parametrize(
        "streak, expected_limit",
        [
            (0, 4),
            (9, 4),
            (10, 3),
            (19, 3),
            (20, 2),
            (29, 2),
            (30, 1),
            (39, 1),
            (40, 0),
            (999, 0),
        ],
    )
    def test_survivor_tier_perk_limits(self, gauntlet_service: GauntletService, streak: int, expected_limit: int) -> None:
        info = gauntlet_service.get_tier_info(streak, "survivor")
        assert info["perk_limit"] == expected_limit

    @pytest.mark.parametrize(
        "streak, expected_limit",
        [
            (0, 3),
            (9, 3),
            (10, 2),
            (19, 2),
            (20, 1),
            (29, 1),
            (30, 0),
            (999, 0),
        ],
    )
    def test_killer_tier_perk_limits_start_at_three(self, gauntlet_service: GauntletService, streak: int, expected_limit: int) -> None:
        info = gauntlet_service.get_tier_info(streak, "killer")
        assert info["perk_limit"] == expected_limit

    def test_tier_steps_up_on_checkpoint_it_banks(self, gauntlet_service: GauntletService) -> None:
        for role in ("killer", "survivor"):
            below = gauntlet_service.get_tier_info(CHECKPOINT_INTERVAL - 1, role)
            at = gauntlet_service.get_tier_info(CHECKPOINT_INTERVAL, role)
            assert at["tier_level"] == below["tier_level"] + 1
            assert at["perk_limit"] == below["perk_limit"] - 1

    def test_tier_info_hides_the_internal_threshold(self, gauntlet_service: GauntletService) -> None:
        assert "min_streak" not in gauntlet_service.get_tier_info(0, "killer")
        assert "min_streak" not in gauntlet_service.get_tier_info(0, "survivor")

    def test_tier_info_carries_the_roster_limit(self, gauntlet_service: GauntletService) -> None:
        assert gauntlet_service.get_tier_info(0, "killer")["roster_limit"] == 43
        assert gauntlet_service.get_tier_info(0, "survivor")["roster_limit"] == 52

    def test_only_killers_are_restricted_to_their_own_perks(self, gauntlet_service: GauntletService) -> None:
        assert gauntlet_service.get_tier_info(0, "killer")["character_perks_only"] is True
        assert gauntlet_service.get_tier_info(0, "survivor")["character_perks_only"] is False

    def test_killer_tier_names_differ_from_survivor(self, gauntlet_service: GauntletService) -> None:
        survivor = gauntlet_service.get_tier_info(10, "survivor")
        killer = gauntlet_service.get_tier_info(10, "killer")
        assert survivor["name"] == "The Thinning"
        assert killer["name"] == "The Obsession"


@pytest.mark.unit
class TestOriginalKillerRosterCap:
    """Tests for Gauntlet original mode 43-character cap enforcement."""

    @pytest.fixture(autouse=True)
    def setup_cap_roster(self, db_session: Session) -> None:
        self.trapper = seed_killer("Trapper")
        self.trapper.release_number = 1
        self.slasher = seed_killer("The Slasher")
        self.slasher.release_number = 43
        self.newer = seed_killer("The Judgment")
        self.newer.release_number = 44
        db_session.commit()

    def test_pool_excludes_killers_past_the_original_cutoff(
        self, gauntlet_user: int, ownership_service: OwnershipService
    ) -> None:
        names = get_owned_character_names(gauntlet_user, "killer", ownership_service)
        assert "Trapper" in names
        assert "The Slasher" in names
        assert "The Judgment" not in names

    def test_a_killer_past_the_cutoff_is_never_drawn(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        for _ in range(20):
            run = gauntlet_service.roll(gauntlet_user, "killer")
            assert run["current_character_id"] != "The Judgment"

    def test_gauntlet_can_be_won_without_the_newer_killer(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        run = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        for _ in range(2):
            run = gauntlet_service.submit_result(gauntlet_user, run["id"], "win")
            if run["status"] != "completed":
                run = gauntlet_service.roll(gauntlet_user, "killer")
        assert run["status"] == "completed"
        assert "The Judgment" not in run["completed_characters"]


@pytest.mark.unit
class TestGauntletRun:
    """Tests for Gauntlet run creation, persistence, and rolling."""

    @pytest.fixture(autouse=True)
    def setup_characters(self, db_session: Session) -> None:
        self.nurse = seed_killer("Nurse")
        self.trapper = seed_killer("Trapper")

    def test_get_or_create_run_targets_an_owned_character(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        run = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        assert run["status"] == "in_progress"
        assert run["current_character_id"] in ["Nurse", "Trapper"]
        assert run["current_streak"] == 0
        assert run["tier_info"]["perk_limit"] == 3

    def test_new_run_defaults_to_original_mode_and_unrevealed_target(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        run = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        assert run["game_mode"] == "original"
        assert run["target_revealed"] is False

    def test_get_or_create_run_is_idempotent(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        first = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        second = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        assert first["id"] == second["id"]

    def test_runs_are_isolated_per_role(
        self, gauntlet_service: GauntletService, gauntlet_user: int, db_session: Session
    ) -> None:
        seed_survivor = Character(name="Meg Thomas", role="Survivor")
        db_session.add(seed_survivor)
        db_session.commit()

        killer_run = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        survivor_run = gauntlet_service.get_or_create_run(gauntlet_user, "survivor")
        assert killer_run["id"] != survivor_run["id"]
        assert killer_run["role"] == "killer"
        assert survivor_run["role"] == "survivor"

    def test_runs_are_isolated_per_user(
        self, gauntlet_service: GauntletService, gauntlet_user: int, user_service: UserService
    ) -> None:
        other_user, _ = user_service.register_user("other_g_user", "other_g@example.com", "Pass123!")
        run1 = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        run2 = gauntlet_service.get_or_create_run(other_user.id, "killer")
        assert run1["id"] != run2["id"]

    def test_roll_never_targets_a_locked_character(
        self, gauntlet_service: GauntletService, gauntlet_user: int, ownership_service: OwnershipService
    ) -> None:
        ownership_service.set_character_ownership(gauntlet_user, self.nurse.id, is_owned=False)
        for _ in range(10):
            run = gauntlet_service.roll(gauntlet_user, "killer")
            assert run["current_character_id"] == "Trapper"

    def test_roll_loadout_assigns_character_teachables(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        run = gauntlet_service.roll(gauntlet_user, "killer", target_character="Trapper")
        assert "perks" not in run["current_loadout"]
        assert all(p["character"] == "Trapper" for p in run["current_loadout"]["character_perks"])

    def test_reveal_target_flips_flag_without_changing_character(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        run = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        target = run["current_character_id"]
        assert run["target_revealed"] is False
        revealed = gauntlet_service.reveal_target(gauntlet_user, run["id"])
        assert revealed["target_revealed"] is True
        assert revealed["current_character_id"] == target


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

    def test_best_streak_is_never_decreased_by_a_loss(self) -> None:
        for _ in range(3):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        updated = self.service.submit_result(self.user_id, self.run["id"], "loss")
        assert updated["best_streak"] == 3

    def test_rejects_invalid_result_string(self) -> None:
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, self.run["id"], "draw")

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
        r.owned_characters_json = "[]"
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

    def test_completed_run_rejects_further_results(self) -> None:
        self.service.get_or_create_run(self.user_id, "killer")
        self._clear("Trapper")
        self._clear("Nurse")

        run = self.service.get_or_create_run(self.user_id, "killer")
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, run["id"], "win")

    def test_reset_starts_a_fresh_run(self) -> None:
        self.service.get_or_create_run(self.user_id, "killer")
        self._clear("Trapper")
        self._clear("Nurse")

        fresh = self.service.reset_run(self.user_id, "killer")
        assert fresh["status"] == "in_progress"
        assert fresh["current_streak"] == 0
        assert fresh["completed_characters"] == []
        assert fresh["target_revealed"] is False


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
        db_session.add(Character(name="Meg Thomas", role="Survivor"))
        db_session.commit()

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
