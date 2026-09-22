# backend/tests/unit/test_gauntlet_service.py
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import GauntletMatchLog, GauntletRun, Killer, Perk, Survivor
from app.services.gauntlet import CHECKPOINT_INTERVAL, get_owned_character_names, is_checkpoint
from app.services.challenge_completions import record_challenge_completion
from app.services.gauntlet_service import GauntletService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService
from tests.unit.conftest import make_chapter


def seed_killer(name: str, perk_count: int = 3, id: int | None = None) -> Killer:
    from app.core.extensions import db

    character = Killer(id=id, name=name, chapter_id=make_chapter(db.session).id, power_name=f"{name} Power")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(
            Perk(
                name=f"{name} Perk {i}",
                killer_id=character.id,
                is_teachable=True,
                role="Killer",
            )
        )
    db.session.commit()
    return character


def seed_survivor(name: str = "Meg Thomas", perk_count: int = 1) -> Survivor:
    from app.core.extensions import db

    character = Survivor(name=name, chapter_id=make_chapter(db.session).id)
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(
            Perk(
                name=f"{name} Perk {i}",
                survivor_id=character.id,
                is_teachable=True,
                role="Survivor",
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

    def test_get_or_create_run_is_idempotent(
        self, gauntlet_service: GauntletService, gauntlet_user: int
    ) -> None:
        first = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        second = gauntlet_service.get_or_create_run(gauntlet_user, "killer")
        assert first["id"] == second["id"]

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
        fresh = gauntlet_service.reset_run(gauntlet_user, "killer", "lemon_solo")
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

    def test_completing_the_run_records_completion_and_resets_attempts(self) -> None:
        from app.core.extensions import db
        from app.models import ChallengeCompletionRecord

        run = self.service.get_or_create_run(self.user_id, "killer")
        self.service.submit_result(self.user_id, run["id"], "loss")  # attempts -> 1

        self._clear("Trapper")
        final = self._clear("Nurse")
        assert final["status"] == "completed"
        assert final["attempts"] == 0

        record = db.session.scalars(
            select(ChallengeCompletionRecord).where(ChallengeCompletionRecord.user_id == self.user_id)
        ).first()
        assert record is not None
        assert record.mode == "gauntlet"
        assert record.variant == "killer_original"
        assert record.attempts_taken == 2
        assert record.matches_played == 3
        assert record.unlocked_characters_count == 2
        assert record.full_roster is True

    def test_a_character_becoming_owned_mid_run_does_not_inflate_the_completion_count(self) -> None:
        """Regression: a character un-kill-switched (or otherwise newly
        owned) after this run's pool was already frozen at 2 must not
        inflate the count recorded for a run that only had to clear those 2."""
        from app.core.extensions import db
        from app.models import ChallengeCompletionRecord

        self.service.get_or_create_run(self.user_id, "killer")  # freezes the pool at 2
        seed_killer("Ghostface")  # owned by default; the frozen pool stays at 2

        self._clear("Trapper")
        final = self._clear("Nurse")
        assert final["status"] == "completed"

        record = db.session.scalars(
            select(ChallengeCompletionRecord).where(ChallengeCompletionRecord.user_id == self.user_id)
        ).first()
        assert record.unlocked_characters_count == 2

    def test_full_roster_is_false_when_a_killer_exists_that_is_not_owned(
        self, ownership_service: OwnershipService
    ) -> None:
        from datetime import datetime, timezone
        from app.core.extensions import db
        from app.models import ChallengeCompletionRecord

        # Predates the owned killers -- it was already in the game all along,
        # the player just never picked it up. Must count against "full".
        ghostface = seed_killer("Ghostface")
        ghostface.created_at = datetime(2020, 1, 1, tzinfo=timezone.utc)
        db.session.commit()
        ownership_service.set_character_ownership(self.user_id, ghostface.id, is_owned=False, role="Killer")

        self.service.get_or_create_run(self.user_id, "killer")
        self._clear("Trapper")
        final = self._clear("Nurse")
        assert final["status"] == "completed"

        record = db.session.scalars(
            select(ChallengeCompletionRecord).where(ChallengeCompletionRecord.user_id == self.user_id)
        ).first()
        assert record.full_roster is False
        assert record.unlocked_characters_count == 2

    def test_completing_the_run_with_no_losses_records_one_attempt(self) -> None:
        from app.core.extensions import db
        from app.models import ChallengeCompletionRecord

        self.service.get_or_create_run(self.user_id, "killer")
        self._clear("Trapper")
        final = self._clear("Nurse")
        assert final["status"] == "completed"

        record = db.session.scalars(
            select(ChallengeCompletionRecord).where(ChallengeCompletionRecord.user_id == self.user_id)
        ).first()
        assert record is not None
        assert record.attempts_taken == 1


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
