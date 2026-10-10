# backend/tests/unit/test_gauntlet_lemon_killer.py
"""Gauntlet Lemon Killer mode and its token / boost rules."""
import pytest
from pytest import MonkeyPatch
from sqlalchemy import select
from app.models import GauntletMatchLog, GauntletRun
from app.services.gauntlet import TOKEN_CAP, TOKEN_ROLLS, base_perk_slots, get_boost_config, get_tier_info, roll_tokens
from app.schemas.gauntlet import GauntletRunState
from app.services.gauntlet_service import GauntletService
from tests.unit.gauntlet_support import (
    seed_killer,
)
from tests.unit.gauntlet_support import (  # noqa: F401  (pytest fixtures)
    user_service,
    gauntlet_service,
    gauntlet_user,
)


@pytest.mark.unit
class TestLemonKillerMode:
    """The Lemon killer variant: checkpoints every 10 wins like the original, plus tokens (see TestLemonKillerTokens)."""

    MODE = "lemon_killer"

    @pytest.fixture(autouse=True)
    def setup_run(self, gauntlet_service: GauntletService, gauntlet_user: int) -> None:
        for index in range(12):
            seed_killer(f"Killer {index}", perk_count=3)
        self.user_id = gauntlet_user
        self.service = gauntlet_service
        self.run = gauntlet_service.get_or_create_run(self.user_id, "killer", self.MODE)

    def test_checkpoint_banks_every_10_wins_like_the_original(self) -> None:
        for _ in range(9):
            assert self.service.submit_result(self.user_id, self.run["id"], "win")["last_checkpoint_streak"] == 0
        tenth = self.service.submit_result(self.user_id, self.run["id"], "win")
        assert tenth["last_checkpoint_streak"] == 10
        assert tenth["tier_info"]["tier_level"] == 1
        assert self.service.submit_result(self.user_id, self.run["id"], "loss")["current_streak"] == 10

    def test_killer_tiers_keep_their_original_thresholds(self) -> None:
        levels = {streak: self.service.get_tier_info(streak, "killer", self.MODE)["tier_level"] for streak in (9, 10, 19, 20, 29, 30)}
        assert levels == {9: 0, 10: 1, 19: 1, 20: 2, 29: 2, 30: 3}

    def test_the_character_is_still_rolled_by_the_server(self) -> None:
        self.service.reveal_target(self.user_id, self.run["id"])
        assert self.service.prepare_next_match(self.user_id, "killer", self.MODE)["target_revealed"] is True


@pytest.mark.unit
class TestTokenRules:
    def test_boost_config_exists_only_for_the_token_modes(self) -> None:
        assert get_boost_config("lemon_killer") == {
            "cap": 20,
            "max_perk_slots": 4,
            "prices": {"reroll": 2, "pick": 6, "slot": 4, "shield": 8},
        }
        assert get_boost_config("original") is None
        assert get_boost_config("lemon_solo") is None

    def test_rolls_are_one_two_three_or_five_and_two_is_the_most_common(self) -> None:
        assert sorted(amount for amount, _ in TOKEN_ROLLS) == [1, 2, 3, 5]
        assert max(TOKEN_ROLLS, key=lambda roll: roll[1])[0] == 2
        assert {roll_tokens() for _ in range(300)} <= {1, 2, 3, 5}
        assert TOKEN_CAP == 20

    def test_base_perk_slots_counts_the_dealt_perk_on_the_last_tier(self) -> None:
        assert base_perk_slots(get_tier_info(0, "killer", "lemon_killer")) == 3
        assert base_perk_slots(get_tier_info(20, "killer", "lemon_killer")) == 1
        assert base_perk_slots(get_tier_info(30, "killer", "lemon_killer")) == 1
        assert base_perk_slots(get_tier_info(30, "killer")) == 0

    def test_a_new_run_starts_with_no_tokens_and_exposes_the_boost_config(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        seed_killer("Nurse")
        token_run = gauntlet_service.get_or_create_run(gauntlet_user, "killer", "lemon_killer")
        assert (token_run["tokens"], token_run["last_token_roll"], token_run["bonus_perk_slots"]) == (0, 0, 0)
        assert token_run["boosts"] == get_boost_config("lemon_killer")
        original = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        assert original["boosts"] is None


@pytest.mark.unit
class TestLemonKillerTokens:
    MODE = "lemon_killer"

    @pytest.fixture(autouse=True)
    def setup_run(self, gauntlet_service: GauntletService, gauntlet_user: int) -> None:
        for index in range(12):
            seed_killer(f"Killer {index}", perk_count=3)
        self.user_id = gauntlet_user
        self.service = gauntlet_service
        self.run = gauntlet_service.get_or_create_run(self.user_id, "killer", self.MODE)
        gauntlet_service.reveal_target(self.user_id, self.run["id"])

    def _set(self, **fields: object) -> None:
        from app.core.extensions import db

        run = db.session.get(GauntletRun, self.run["id"])
        for name, value in fields.items():
            setattr(run, name, value)
        db.session.commit()

    def _submit(self, result: str, use_shield: bool = False) -> GauntletRunState:
        return self.service.submit_result(self.user_id, self.run["id"], result, use_shield=use_shield)

    def test_a_win_rolls_tokens(self, monkeypatch: MonkeyPatch) -> None:
        monkeypatch.setattr("app.services.gauntlet_service.roll_tokens", lambda: 3)
        won = self._submit("win")
        assert (won["tokens"], won["last_token_roll"]) == (3, 3)

    def test_the_balance_stops_at_the_cap(self, monkeypatch: MonkeyPatch) -> None:
        monkeypatch.setattr("app.services.gauntlet_service.roll_tokens", lambda: 5)
        self._set(tokens=19)
        won = self._submit("win")
        assert (won["tokens"], won["last_token_roll"]) == (20, 5)

    def test_a_win_at_the_cap_rolls_nothing(self, monkeypatch: MonkeyPatch) -> None:
        monkeypatch.setattr("app.services.gauntlet_service.roll_tokens", lambda: 5)
        self._set(tokens=20)
        won = self._submit("win")
        assert (won["tokens"], won["last_token_roll"]) == (20, 0)

    def test_a_loss_back_to_zero_starts_over_with_no_tokens(self) -> None:
        self._set(tokens=12, current_streak=4, last_checkpoint_streak=0)
        assert self._submit("loss")["tokens"] == 0

    def test_a_loss_back_to_a_checkpoint_keeps_the_tokens(self) -> None:
        self._set(tokens=12, current_streak=14, last_checkpoint_streak=10)
        lost = self._submit("loss")
        assert (lost["current_streak"], lost["tokens"]) == (10, 12)

    def test_a_shielded_loss_keeps_the_remaining_tokens(self) -> None:
        self._set(tokens=12, current_streak=4, last_checkpoint_streak=0)
        assert self._submit("loss", use_shield=True)["tokens"] == 4

    def test_a_loss_clears_the_roll(self) -> None:
        self._set(tokens=7, last_token_roll=3, current_streak=14, last_checkpoint_streak=10)
        lost = self._submit("loss")
        assert (lost["tokens"], lost["last_token_roll"], lost["current_streak"]) == (7, 0, 10)

    def test_the_original_mode_rolls_no_tokens(self) -> None:
        original = self.service.get_or_create_run(self.user_id, "killer")
        won = self.service.submit_result(self.user_id, original["id"], "win")
        assert (won["tokens"], won["last_token_roll"]) == (0, 0)

    def test_a_shield_cancels_the_loss_and_costs_tokens(self) -> None:
        self._set(tokens=9, current_streak=4, last_checkpoint_streak=0)
        shielded = self._submit("loss", use_shield=True)
        assert shielded["current_streak"] == 4
        assert shielded["attempts"] == 0
        assert shielded["tokens"] == 1
        from app.core.extensions import db

        log = db.session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == self.run["id"])
        ).all()[-1]
        assert (log.result, log.streak_before, log.streak_after) == ("loss", 4, 4)

    def test_a_shield_on_a_checkpoint_is_not_charged_and_the_loss_counts_normally(self) -> None:
        self._set(tokens=8)
        at_zero = self._submit("loss", use_shield=True)
        assert (at_zero["current_streak"], at_zero["attempts"], at_zero["tokens"]) == (0, 1, 0)
        self._set(current_streak=10, last_checkpoint_streak=10, tokens=8)
        at_checkpoint = self._submit("loss", use_shield=True)
        assert (at_checkpoint["current_streak"], at_checkpoint["attempts"], at_checkpoint["tokens"]) == (10, 2, 8)

    def test_a_shield_needs_the_tokens(self) -> None:
        self._set(tokens=7, current_streak=4)
        with pytest.raises(ValueError, match="Not enough tokens"):
            self._submit("loss", use_shield=True)
        assert self.service.get_or_create_run(self.user_id, "killer", self.MODE)["current_streak"] == 4

    def test_a_shield_only_cancels_a_loss(self) -> None:
        self._set(tokens=20)
        with pytest.raises(ValueError, match="A shield only cancels a loss"):
            self._submit("win", use_shield=True)

    def test_a_shield_is_refused_in_a_mode_without_boosts(self) -> None:
        original = self.service.get_or_create_run(self.user_id, "killer")
        with pytest.raises(ValueError, match="This mode has no boosts"):
            self.service.submit_result(self.user_id, original["id"], "loss", use_shield=True)

    def _buy(self, boost: str, character: str | None = None) -> GauntletRunState:
        return self.service.buy_boost(self.user_id, self.run["id"], boost, character)

    def _state(self) -> GauntletRunState:
        return self.service.get_or_create_run(self.user_id, "killer", self.MODE)

    def test_reroll_costs_two_and_lands_on_a_different_killer(self) -> None:
        self._set(tokens=5)
        before = self._state()["current_character_id"]
        after = self._buy("reroll")
        assert after["current_character_id"] != before
        assert after["current_loadout"]["character"] == after["current_character_id"]
        assert after["tokens"] == 3

    def test_reroll_is_refused_when_no_other_killer_is_left(self) -> None:
        state = self._state()
        others = [name for name in state["owned_characters"] if name != state["current_character_id"]]
        self._set(tokens=5, completed_characters=others)
        with pytest.raises(ValueError, match="There is no other character to roll"):
            self._buy("reroll")
        assert self._state()["tokens"] == 5

    def test_pick_costs_six_and_sets_the_character(self) -> None:
        self._set(tokens=6)
        state = self._state()
        wanted = next(name for name in state["owned_characters"] if name != state["current_character_id"])
        picked = self._buy("pick", wanted)
        assert picked["current_character_id"] == wanted
        assert picked["current_loadout"]["character"] == wanted
        assert (picked["tokens"], picked["target_revealed"]) == (0, True)

    def test_a_rejected_pick_costs_nothing(self) -> None:
        state = self._state()
        beaten = next(name for name in state["owned_characters"] if name != state["current_character_id"])
        self._set(tokens=6, completed_characters=[beaten])
        with pytest.raises(ValueError, match="You already beat that character"):
            self._buy("pick", beaten)
        with pytest.raises(ValueError, match="That character is not in your roster"):
            self._buy("pick", "Nobody")
        assert self._state()["tokens"] == 6

    def test_a_boost_needs_the_tokens(self) -> None:
        self._set(tokens=1)
        with pytest.raises(ValueError, match="Not enough tokens"):
            self._buy("reroll")

    def test_the_first_tier_takes_one_extra_slot_and_the_last_takes_three(self) -> None:
        self._set(tokens=20)
        assert self._buy("slot")["bonus_perk_slots"] == 1
        with pytest.raises(ValueError, match="No free perk slots left"):
            self._buy("slot")
        assert self._state()["tokens"] == 16
        self._set(tokens=20, bonus_perk_slots=0, current_streak=30)
        for expected in (1, 2, 3):
            assert self._buy("slot")["bonus_perk_slots"] == expected
        with pytest.raises(ValueError, match="No free perk slots left"):
            self._buy("slot")

    def test_bought_slots_survive_a_reroll_and_reset_after_the_result(self) -> None:
        self._set(tokens=20)
        self._buy("slot")
        assert self._buy("reroll")["bonus_perk_slots"] == 1
        assert self._submit("win")["bonus_perk_slots"] == 0

    def test_boosts_need_a_started_match_and_a_mode_that_has_them(self) -> None:
        self._set(tokens=20, target_revealed=False)
        with pytest.raises(ValueError, match="Start the match first"):
            self._buy("slot")
        original = self.service.get_or_create_run(self.user_id, "killer")
        with pytest.raises(ValueError, match="This mode has no boosts"):
            self.service.buy_boost(self.user_id, original["id"], "slot")

    def test_unknown_boosts_are_refused(self) -> None:
        with pytest.raises(ValueError, match="Unknown boost"):
            self._buy("teleport")

    def test_run_lookups_lock_the_row_so_two_requests_cannot_spend_the_same_tokens(self) -> None:
        from sqlalchemy.dialects import postgresql

        statement = self.service._run_by_id_query(self.user_id, self.run["id"])
        assert "FOR UPDATE" in str(statement.compile(dialect=postgresql.dialect()))

    def test_picking_the_killer_already_in_play_is_refused_and_free(self) -> None:
        self._set(tokens=6)
        with pytest.raises(ValueError, match="That character is already in play"):
            self._buy("pick", self._state()["current_character_id"])
        assert self._state()["tokens"] == 6

    def test_boosts_follow_the_admin_kill_switch(self) -> None:
        from app.core.extensions import db
        from app.models import ChallengeModeSetting

        db.session.add(ChallengeModeSetting(mode="gauntlet", is_enabled=False))
        db.session.commit()
        self._set(tokens=20)
        with pytest.raises(ValueError, match="temporarily disabled"):
            self._buy("slot")
        assert self._state()["tokens"] == 20
