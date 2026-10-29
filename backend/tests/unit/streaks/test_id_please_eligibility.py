# backend/tests/unit/streaks/test_id_please_eligibility.py
import pytest
from app.services.id_please.eligibility import evaluate, evaluate_difficulty, perks_needed
from app.services.id_please.roster import Roster

ALWAYS_ON = {"survivor": 17, "killer": 19}


def roster(killers: int, survivors: int, killer_perks: int, survivor_perks: int) -> Roster:
    return Roster(tuple(range(killers)), tuple(range(survivors)), tuple(range(killer_perks)), tuple(range(survivor_perks)))


@pytest.mark.unit
class TestPerksNeeded:
    def test_milestones_needs_a_loadout_worth(self) -> None:
        assert perks_needed("mixed", "milestones", "killer", ALWAYS_ON) == 4

    def test_hardcore_is_always_on_plus_three_per_character(self) -> None:
        assert perks_needed("mixed", "hardcore", "survivor", ALWAYS_ON) == 17 + 75
        assert perks_needed("mixed", "hardcore", "killer", ALWAYS_ON) == 19 + 60

    def test_hardcore_plus_needs_thirty_each(self) -> None:
        assert perks_needed("mixed", "hardcore_plus", "survivor", ALWAYS_ON) == 17 + 90 == 107
        assert perks_needed("mixed", "hardcore_plus", "killer", ALWAYS_ON) == 19 + 90 == 109


@pytest.mark.unit
class TestEvaluate:
    def test_milestones_met_with_one_character_and_four_perks(self) -> None:
        assert evaluate_difficulty("mixed", "milestones", roster(1, 1, 4, 4), ALWAYS_ON)["met"] is True

    def test_milestones_missing_perks(self) -> None:
        result = evaluate_difficulty("mixed", "milestones", roster(1, 1, 3, 4), ALWAYS_ON)
        assert result["met"] is False
        assert result["killer"]["perks"] == {"have": 3, "need": 4}
        assert result["survivor"]["perks"] == {"have": 4, "need": 4}

    def test_milestones_missing_a_side_entirely(self) -> None:
        assert evaluate_difficulty("mixed", "milestones", roster(0, 3, 10, 10), ALWAYS_ON)["met"] is False

    def test_hardcore_exact_boundary_is_met(self) -> None:
        assert evaluate_difficulty("mixed", "hardcore", roster(20, 25, 79, 92), ALWAYS_ON)["met"] is True

    @pytest.mark.parametrize("args", [(19, 25, 79, 92), (20, 24, 79, 92), (20, 25, 78, 92), (20, 25, 79, 91)])
    def test_hardcore_one_short_is_not_met(self, args: tuple) -> None:
        assert evaluate_difficulty("mixed", "hardcore", roster(*args), ALWAYS_ON)["met"] is False

    def test_hardcore_plus_boundary(self) -> None:
        assert evaluate_difficulty("mixed", "hardcore_plus", roster(30, 30, 109, 107), ALWAYS_ON)["met"] is True
        assert evaluate_difficulty("mixed", "hardcore_plus", roster(29, 30, 109, 107), ALWAYS_ON)["met"] is False

    def test_evaluate_covers_every_difficulty(self) -> None:
        result = evaluate("mixed", roster(30, 30, 109, 107), ALWAYS_ON)
        assert list(result) == ["milestones", "hardcore", "hardcore_plus"]
        assert all(r["met"] for r in result.values())

    def test_a_small_account_only_meets_milestones(self) -> None:
        result = evaluate("mixed", roster(3, 3, 30, 30), ALWAYS_ON)
        assert {k: v["met"] for k, v in result.items()} == {"milestones": True, "hardcore": False, "hardcore_plus": False}


@pytest.mark.unit
class TestSingleSideLanes:
    def test_a_lane_asks_nothing_of_the_other_side(self) -> None:
        result = evaluate_difficulty("survivor", "hardcore", roster(0, 25, 0, 92), ALWAYS_ON)
        assert result["met"] is True
        assert result["killer"] == {"characters": {"have": 0, "need": 0}, "perks": {"have": 0, "need": 0}}

    def test_milestones_on_one_side_needs_ten_characters(self) -> None:
        assert evaluate_difficulty("killer", "milestones", roster(10, 0, 30, 0), ALWAYS_ON)["met"] is True
        assert evaluate_difficulty("killer", "milestones", roster(9, 0, 30, 0), ALWAYS_ON)["met"] is False

    def test_hardcore_thresholds_are_per_side(self) -> None:
        assert evaluate_difficulty("killer", "hardcore", roster(20, 0, 79, 0), ALWAYS_ON)["met"] is True
        assert evaluate_difficulty("survivor", "hardcore", roster(0, 24, 0, 92), ALWAYS_ON)["met"] is False

    def test_hardcore_plus_needs_thirty_of_the_one_side(self) -> None:
        assert evaluate_difficulty("survivor", "hardcore_plus", roster(0, 30, 0, 107), ALWAYS_ON)["met"] is True
        assert evaluate_difficulty("survivor", "hardcore_plus", roster(0, 29, 0, 107), ALWAYS_ON)["met"] is False

    def test_a_player_with_only_one_rich_side_opens_that_lane_but_not_the_mixed_one(self) -> None:
        rich_survivors = roster(5, 30, 34, 107)
        assert evaluate_difficulty("survivor", "hardcore_plus", rich_survivors, ALWAYS_ON)["met"] is True
        assert evaluate_difficulty("mixed", "hardcore_plus", rich_survivors, ALWAYS_ON)["met"] is False

    def test_a_side_the_lane_does_not_play_needs_no_perks(self) -> None:
        assert perks_needed("survivor", "hardcore", "killer", ALWAYS_ON) == 0
        assert perks_needed("killer", "hardcore", "killer", ALWAYS_ON) == 19 + 60
