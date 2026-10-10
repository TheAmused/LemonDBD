# backend/tests/unit/test_gauntlet_tiers_and_runs.py
"""Gauntlet tier limits, the original-killer roster cap and run lifecycle."""
import pytest
from sqlalchemy.orm import Session
from app.services.gauntlet import CHECKPOINT_INTERVAL, get_owned_character_names
from app.services.challenge_completions import record_challenge_completion
from app.services.gauntlet_service import GauntletService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService
from tests.unit.gauntlet_support import (
    seed_killer,
    seed_survivor,
)
from tests.unit.gauntlet_support import (  # noqa: F401  (pytest fixtures)
    user_service,
    ownership_service,
    gauntlet_service,
    gauntlet_user,
)


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
        # `release_number` is `== id` now, not a settable field, so cap
        # ordering is controlled by the id each killer is created with.
        self.trapper = seed_killer("Trapper", id=1)
        self.slasher = seed_killer("The Slasher", id=43)
        self.newer = seed_killer("The Judgment", id=44)
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

    def test_runs_are_isolated_per_role(
        self, gauntlet_service: GauntletService, gauntlet_user: int, db_session: Session
    ) -> None:
        seed_survivor()

        killer_run = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        survivor_run = gauntlet_service.get_or_create_run(gauntlet_user, "survivor")
        assert killer_run["id"] != survivor_run["id"]
        assert killer_run["role"] == "killer"
        assert survivor_run["role"] == "survivor"

    def test_runs_are_isolated_per_game_mode(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        original = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        solo = gauntlet_service.get_or_create_run(gauntlet_user, "killer", "lemon_solo")
        assert original["id"] != solo["id"]
        assert original["game_mode"] == "original"
        assert solo["game_mode"] == "lemon_solo"
        assert gauntlet_service.get_or_create_run(gauntlet_user, "killer", "lemon_solo")["id"] == solo["id"]

    def test_reset_only_touches_the_requested_game_mode(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        original = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        gauntlet_service.get_or_create_run(gauntlet_user, "killer", "lemon_solo")
        fresh = gauntlet_service.abandon_run(gauntlet_user, "killer", "lemon_solo")
        assert fresh["game_mode"] == "lemon_solo"
        assert gauntlet_service.get_or_create_run(gauntlet_user, "killer")["id"] == original["id"]

    def test_completions_are_read_per_game_mode(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        record_challenge_completion(
            user_id=gauntlet_user,
            mode="gauntlet",
            variant="killer_lemon_duo",
            attempts_taken=1,
            matches_played=1,
            unlocked_characters_count=1,
            full_roster=False,
        )
        assert len(gauntlet_service.get_completions(gauntlet_user, "killer", "lemon_duo")) == 1
        assert gauntlet_service.get_completions(gauntlet_user, "killer") == []

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
        ownership_service.set_character_ownership(gauntlet_user, self.nurse.id, is_owned=False, role="Killer")
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
