# backend/tests/unit/test_gauntlet_team_modes.py
"""Gauntlet solo, duo and squad modes."""
import pytest
from app.models import GauntletRun
from app.services.gauntlet import is_checkpoint
from app.services.gauntlet_service import GauntletService
from tests.unit.gauntlet_support import (
    seed_survivor,
)
from tests.unit.gauntlet_support import (  # noqa: F401  (pytest fixtures)
    user_service,
    gauntlet_service,
    gauntlet_user,
)


@pytest.mark.unit
class TestSoloMode:
    """The solo variant: picked characters, half wins, checkpoints every 5, a perk on the last tier."""

    MODE = "lemon_solo"

    @pytest.fixture(autouse=True)
    def setup_run(self, gauntlet_service: GauntletService, gauntlet_user: int) -> None:
        self.megs = seed_survivor("Meg Thomas", perk_count=3)
        seed_survivor("Dwight Fairfield", perk_count=3)
        self.user_id = gauntlet_user
        self.service = gauntlet_service
        self.run = gauntlet_service.get_or_create_run(self.user_id, "survivor", self.MODE)

    def _set_streak(self, streak: int) -> None:
        from app.core.extensions import db

        run = db.session.get(GauntletRun, self.run["id"])
        run.current_streak = streak
        db.session.commit()

    def test_last_tier_deals_a_random_unique_perk(self) -> None:
        info = self.service.get_tier_info(40, "survivor", self.MODE)
        assert info["perk_limit"] == 0
        assert info["random_perk_count"] == 1
        assert self.service.get_tier_info(39, "survivor", self.MODE)["random_perk_count"] == 0
        assert self.service.get_tier_info(40, "survivor")["random_perk_count"] == 0

    def test_lemon_killer_last_tier_deals_a_random_unique_perk(self) -> None:
        info = self.service.get_tier_info(30, "killer", "lemon_killer")
        assert info["perk_limit"] == 0
        assert info["random_perk_count"] == 1
        assert self.service.get_tier_info(29, "killer", "lemon_killer")["random_perk_count"] == 0
        assert self.service.get_tier_info(30, "killer")["random_perk_count"] == 0

    def test_checkpoint_banks_every_5_wins_but_tiers_still_step_every_10(self) -> None:
        for expected in range(1, 5):
            assert self.service.submit_result(self.user_id, self.run["id"], "win")["last_checkpoint_streak"] == 0
        fifth = self.service.submit_result(self.user_id, self.run["id"], "win")
        assert fifth["last_checkpoint_streak"] == 5
        assert fifth["tier_info"]["tier_level"] == 0
        assert self.service.submit_result(self.user_id, self.run["id"], "loss")["current_streak"] == 5

    def test_original_checkpoints_are_untouched(self) -> None:
        original = self.service.get_or_create_run(self.user_id, "survivor")
        for _ in range(5):
            updated = self.service.submit_result(self.user_id, original["id"], "win")
        assert updated["last_checkpoint_streak"] == 0

    def test_select_target_sets_the_character_and_reveals_it(self) -> None:
        picked = self.service.select_target(self.user_id, self.run["id"], "Dwight Fairfield")
        assert picked["current_character_id"] == "Dwight Fairfield"
        assert picked["target_revealed"] is True
        assert picked["current_loadout"]["character"] == "Dwight Fairfield"
        assert "random_perks" not in picked["current_loadout"]

    def test_select_target_rejects_unknown_and_finished_characters(self) -> None:
        with pytest.raises(ValueError):
            self.service.select_target(self.user_id, self.run["id"], "Nobody")
        self.service.select_target(self.user_id, self.run["id"], "Meg Thomas")
        self.service.submit_result(self.user_id, self.run["id"], "win")
        with pytest.raises(ValueError):
            self.service.select_target(self.user_id, self.run["id"], "Meg Thomas")

    def test_select_target_is_rejected_outside_solo(self) -> None:
        original = self.service.get_or_create_run(self.user_id, "survivor")
        with pytest.raises(ValueError):
            self.service.select_target(self.user_id, original["id"], "Meg Thomas")

    def test_next_match_waits_for_a_choice_in_solo_and_rolls_elsewhere(self) -> None:
        self.service.select_target(self.user_id, self.run["id"], "Meg Thomas")
        self.service.submit_result(self.user_id, self.run["id"], "win")
        waiting = self.service.prepare_next_match(self.user_id, "survivor", self.MODE)
        assert waiting["target_revealed"] is False

        original = self.service.get_or_create_run(self.user_id, "survivor")
        self.service.reveal_target(self.user_id, original["id"])
        rolled = self.service.prepare_next_match(self.user_id, "survivor")
        assert rolled["target_revealed"] is True

    def test_last_tier_loadout_carries_one_of_the_characters_own_perks(self) -> None:
        self._set_streak(40)
        picked = self.service.select_target(self.user_id, self.run["id"], "Meg Thomas")
        dealt = picked["current_loadout"]["random_perks"]
        own = {perk["name"] for perk in picked["current_loadout"]["character_perks"]}
        assert len(dealt) == 1
        assert dealt[0]["name"] in own


@pytest.mark.unit
class TestDuoMode:
    """The duo variant: two different random characters per match, checkpoints and tiers every 6 wins."""

    MODE = "lemon_duo"

    @pytest.fixture(autouse=True)
    def setup_run(self, gauntlet_service: GauntletService, gauntlet_user: int) -> None:
        for name in ("Meg Thomas", "Dwight Fairfield", "Claudette Morel", "Jake Park"):
            seed_survivor(name, perk_count=3)
        self.user_id = gauntlet_user
        self.service = gauntlet_service
        self.run = gauntlet_service.get_or_create_run(self.user_id, "survivor", self.MODE)

    def _players(self, run: dict) -> list[str]:
        return [player["character"] for player in run["current_loadout"]["players"]]

    def test_a_match_deals_two_different_characters(self) -> None:
        players = self._players(self.run)
        assert len(players) == 2
        assert len(set(players)) == 2
        assert self.run["current_character_id"] == players[0]
        assert all(len(p["character_perks"]) == 3 for p in self.run["current_loadout"]["players"])

    def test_a_reroll_deals_two_different_characters_too(self) -> None:
        for _ in range(10):
            rolled = self.service.roll(self.user_id, "survivor", game_mode=self.MODE)
            assert len(set(self._players(rolled))) == 2

    def test_original_and_solo_matches_have_a_single_character(self) -> None:
        original = self.service.get_or_create_run(self.user_id, "survivor")
        assert "players" not in original["current_loadout"]

    def test_select_target_is_rejected_in_duo(self) -> None:
        with pytest.raises(ValueError):
            self.service.select_target(self.user_id, self.run["id"], "Meg Thomas")

    def test_a_win_completes_both_characters_and_logs_the_pair(self) -> None:
        players = self._players(self.run)
        updated = self.service.submit_result(self.user_id, self.run["id"], "win")
        assert set(players) <= set(updated["completed_characters"])
        assert updated["current_streak"] == 1
        logs = self.service.get_stats(self.user_id, "survivor", self.MODE)["recent_logs"]
        assert logs[0]["character_id"] == " + ".join(players)

    def test_the_next_roll_prefers_characters_not_yet_beaten(self) -> None:
        first = self._players(self.run)
        self.service.submit_result(self.user_id, self.run["id"], "win")
        rolled = self.service.roll(self.user_id, "survivor", game_mode=self.MODE)
        assert not set(self._players(rolled)) & set(first)

    def test_an_odd_roster_repeats_the_last_character_instead_of_a_beaten_one(self) -> None:
        seed_survivor("Nea Karlsson", perk_count=3)
        run = self.run
        for _ in range(2):
            self.service.submit_result(self.user_id, run["id"], "win")
            run = self.service.roll(self.user_id, "survivor", game_mode=self.MODE)
        completed = set(run["completed_characters"])
        assert len(completed) == 4
        remaining = {
            "Meg Thomas", "Dwight Fairfield", "Claudette Morel", "Jake Park", "Nea Karlsson"
        } - completed
        assert len(remaining) == 1
        assert set(self._players(run)) == remaining

    @pytest.mark.parametrize(
        "streak, level, limit",
        [(0, 0, 4), (5, 0, 4), (6, 1, 3), (11, 1, 3), (12, 2, 2), (17, 2, 2), (18, 3, 1), (25, 3, 1), (99, 3, 1)],
    )
    def test_tiers_step_every_6_wins(self, streak: int, level: int, limit: int) -> None:
        info = self.service.get_tier_info(streak, "survivor", self.MODE)
        assert info["tier_level"] == level
        assert info["perk_limit"] == limit

    def test_checkpoints_land_at_6_12_and_18_and_the_last_stage_runs_to_the_end(self) -> None:
        banked = [
            streak
            for streak in range(1, 60)
            if is_checkpoint(streak, self.MODE)
        ]
        assert banked == [6, 12, 18]

    def test_a_loss_falls_back_to_the_last_checkpoint(self) -> None:
        for _ in range(7):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        assert self.service.submit_result(self.user_id, self.run["id"], "loss")["current_streak"] == 6

    def test_the_last_stage_leaves_one_own_perk_to_pick_and_deals_none_at_random(self) -> None:
        from app.core.extensions import db

        run = db.session.get(GauntletRun, self.run["id"])
        run.current_streak = 18
        db.session.commit()
        rolled = self.service.roll(self.user_id, "survivor", game_mode=self.MODE)
        assert rolled["tier_info"]["perk_limit"] == 1
        assert rolled["tier_info"]["random_perk_count"] == 0
        for player in rolled["current_loadout"]["players"]:
            assert "random_perks" not in player
            assert len(player["character_perks"]) == 3


@pytest.mark.unit
class TestSquadMode:
    """The squad variant: two different random characters, each played by two people."""

    MODE = "lemon_squad"

    @pytest.fixture(autouse=True)
    def setup_run(self, gauntlet_service: GauntletService, gauntlet_user: int) -> None:
        for name in ("Meg Thomas", "Dwight Fairfield", "Claudette Morel", "Jake Park"):
            seed_survivor(name, perk_count=3)
        self.user_id = gauntlet_user
        self.service = gauntlet_service
        self.run = gauntlet_service.get_or_create_run(self.user_id, "survivor", self.MODE)

    def test_a_match_deals_two_different_characters_for_two_players_each(self) -> None:
        loadout = self.run["current_loadout"]
        names = [player["character"] for player in loadout["players"]]
        assert len(set(names)) == 2
        assert loadout["players_per_character"] == 2

    def test_select_target_is_rejected_in_squad(self) -> None:
        with pytest.raises(ValueError):
            self.service.select_target(self.user_id, self.run["id"], "Meg Thomas")

    def test_only_squad_shares_characters_between_players(self) -> None:
        duo = self.service.get_or_create_run(self.user_id, "survivor", "lemon_duo")
        assert "players_per_character" not in duo["current_loadout"]
        rolled = self.service.roll(self.user_id, "survivor", game_mode=self.MODE)
        assert rolled["current_loadout"]["players_per_character"] == 2

    def test_tiers_and_checkpoints_follow_the_duo_schedule(self) -> None:
        levels = {streak: self.service.get_tier_info(streak, "survivor", self.MODE) for streak in (0, 5, 6, 12, 18, 99)}
        assert [levels[s]["perk_limit"] for s in (0, 5, 6, 12, 18, 99)] == [4, 4, 3, 2, 1, 1]
        assert [s for s in range(1, 60) if is_checkpoint(s, self.MODE)] == [6, 12, 18]

    def test_a_win_completes_both_characters_once(self) -> None:
        names = [player["character"] for player in self.run["current_loadout"]["players"]]
        updated = self.service.submit_result(self.user_id, self.run["id"], "win")
        assert sorted(updated["completed_characters"]) == sorted(names)

    def test_an_odd_roster_repeats_the_last_character_instead_of_a_beaten_one(self) -> None:
        seed_survivor("Nea Karlsson", perk_count=3)
        run = self.run
        for _ in range(2):
            self.service.submit_result(self.user_id, run["id"], "win")
            run = self.service.roll(self.user_id, "survivor", game_mode=self.MODE)
        completed = set(run["completed_characters"])
        assert len(completed) == 4
        remaining = {
            "Meg Thomas", "Dwight Fairfield", "Claudette Morel", "Jake Park", "Nea Karlsson"
        } - completed
        assert len(remaining) == 1
        names = {player["character"] for player in run["current_loadout"]["players"]}
        assert names == remaining
