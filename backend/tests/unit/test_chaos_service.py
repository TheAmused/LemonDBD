# backend/tests/unit/test_chaos_service.py
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import ChaosMatchLog, Character, Perk, User
from app.services.chaos_service import ChaosService
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


def seed_new_perk(name: str, character_name: str = "The Trapper") -> Perk:
    from app.core.extensions import db

    character = db.session.scalars(select(Character).where(Character.name == character_name)).first()
    perk = Perk(name=name, character_id=character.id, is_teachable=True, category="Killer")
    db.session.add(perk)
    db.session.commit()
    return perk


@pytest.fixture
def chaos_service() -> ChaosService:
    ownership_service = OwnershipService()
    return ChaosService(ownership_service=ownership_service)


@pytest.fixture
def user_service() -> UserService:
    return UserService()


@pytest.fixture
def chaos_user(user_service: UserService) -> int:
    user, err = user_service.register_user("chaos_challenger", "challenger@example.com", "SecurePass123!")
    assert err is None
    return user.id


@pytest.mark.unit
class TestGetOrCreateRun:
    """Tests for initializing and retrieving active Chaos runs."""

    @pytest.fixture(autouse=True)
    def setup_killers(self) -> None:
        seed_killer("The Trapper")
        seed_killer("The Wraith")

    def test_creates_a_run_with_a_fresh_unrevealed_build(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        run = chaos_service.get_or_create_run(chaos_user, "hell")
        assert run["status"] == "in_progress"
        assert run["difficulty"] == "hell"
        assert run["current_streak"] == 0
        assert run["perks_revealed"] is False
        assert len(run["current_perks"]) == 4
        assert len(run["current_addon_rarities"]) == 2
        assert run["checkpoint_interval"] == 0

    def test_runs_for_different_difficulties_are_isolated(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        hell_run = chaos_service.get_or_create_run(chaos_user, "hell")
        easy_run = chaos_service.get_or_create_run(chaos_user, "easy")
        medium_run = chaos_service.get_or_create_run(chaos_user, "medium")

        assert hell_run["id"] != easy_run["id"] != medium_run["id"]
        assert easy_run["checkpoint_interval"] == 5
        assert medium_run["checkpoint_interval"] == 10

    def test_getting_twice_returns_the_same_run(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        first = chaos_service.get_or_create_run(chaos_user, "medium")
        second = chaos_service.get_or_create_run(chaos_user, "medium")
        assert first["id"] == second["id"]

    def test_unknown_difficulty_defaults_checkpoint_to_zero(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        run = chaos_service.get_or_create_run(chaos_user, "custom_mode")
        assert run["difficulty"] == "custom_mode"
        assert run["checkpoint_interval"] == 0


@pytest.mark.unit
class TestReveal:
    """Tests for perk build reveal functionality and authorization."""

    @pytest.fixture(autouse=True)
    def setup_killers(self) -> None:
        seed_killer("The Trapper")

    def test_reveal_flips_the_flag(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        run = chaos_service.get_or_create_run(chaos_user, "hell")
        revealed = chaos_service.reveal(chaos_user, run["id"])
        assert revealed["perks_revealed"] is True

    def test_reveal_idempotent_when_already_revealed(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        run = chaos_service.get_or_create_run(chaos_user, "hell")
        r1 = chaos_service.reveal(chaos_user, run["id"])
        r2 = chaos_service.reveal(chaos_user, run["id"])
        assert r1["perks_revealed"] is True
        assert r2["perks_revealed"] is True

    def test_reveal_missing_run_raises_value_error(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        with pytest.raises(ValueError):
            chaos_service.reveal(chaos_user, 999999)

    def test_reveal_carries_the_frozen_perk_pool_names(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        run = chaos_service.get_or_create_run(chaos_user, "hell")
        revealed = chaos_service.reveal(chaos_user, run["id"])
        assert sorted(revealed["unlocked_perks"]) == sorted(run["unlocked_perks"])


@pytest.mark.unit
class TestHellDifficulty:
    """Tests for Hell mode rules, per-death wipes, and frozen rosters."""

    @pytest.fixture(autouse=True)
    def setup_hell_state(self, chaos_service: ChaosService, chaos_user: int) -> None:
        seed_killer("The Trapper")
        seed_killer("The Wraith")
        self.user_id = chaos_user
        self.service = chaos_service
        self.run = chaos_service.get_or_create_run(self.user_id, "hell")

    def test_new_killer_mid_run_is_not_in_the_completion_check(self) -> None:
        seed_killer("The Huntress")
        run = self.run
        remaining = list(run["owned_killers"])
        for killer in remaining:
            run = self.service.submit_result(self.user_id, run["id"], "win", killer)
        assert run["status"] == "completed"

    def test_new_perk_mid_run_is_not_drawn(self) -> None:
        run = self.service.submit_result(self.user_id, self.run["id"], "win", self.run["owned_killers"][0])
        unlocked_names_before = set(run["unlocked_perks"])
        seed_new_perk("Brand New Perk")
        drawn_names = {p["name"] for p in run["current_perks"]}
        assert not (drawn_names - unlocked_names_before)

    def test_loss_to_zero_refreezes_both_pools(self) -> None:
        seed_killer("The Huntress")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", self.run["owned_killers"][0])
        assert "The Huntress" in after_loss["owned_killers"]

    def test_win_advances_streak_and_completes_killer(self) -> None:
        updated = self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        assert updated["current_streak"] == 1
        assert updated["best_streak"] == 1
        assert "The Trapper" in updated["completed_killers"]
        assert len(updated["current_perks"]) == 4
        assert updated["perks_revealed"] is False

    def test_win_with_every_owned_killer_completes_the_run(self) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        assert final["status"] == "completed"
        assert final["current_streak"] == 2

    def test_one_loss_resets_everything_in_hell(self) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "The Wraith")
        assert after_loss["current_streak"] == 0
        assert after_loss["best_streak"] == 1
        assert after_loss["completed_killers"] == []

    def test_cannot_win_with_an_already_completed_killer(self) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        run = self.service.get_or_create_run(self.user_id, "hell")
        with pytest.raises(ValueError, match=r"already been cleared"):
            self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")

    def test_submit_result_on_completed_run_raises_value_error(self) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")

    def test_submit_invalid_result_string_raises_value_error(self) -> None:
        with pytest.raises(ValueError, match=r"must be 'win' or 'loss'"):
            self.service.submit_result(self.user_id, self.run["id"], "tie", "The Trapper")

    def test_apply_inactivity_loss_resets_to_zero(self, db_session: Session) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.apply_inactivity_loss(self.run["id"])
        reloaded = self.service.get_or_create_run(self.user_id, "hell")
        assert reloaded["current_streak"] == 0
        assert reloaded["completed_killers"] == []

        log = db_session.scalars(
            select(ChaosMatchLog).where(ChaosMatchLog.run_id == self.run["id"])
        ).all()
        inactivity_logs = [l for l in log if l.triggered_by == "inactivity"]
        assert len(inactivity_logs) == 1
        assert inactivity_logs[0].result == "loss"

    def test_apply_inactivity_loss_is_noop_on_completed_run(self, db_session: Session) -> None:
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        before_count = db_session.query(ChaosMatchLog).count()
        self.service.apply_inactivity_loss(self.run["id"])
        assert db_session.query(ChaosMatchLog).count() == before_count


@pytest.mark.unit
class TestCheckpointsEasyAndMedium:
    """Tests for checkpoint banking on Easy (5) and Medium (10) difficulties."""

    def test_easy_banks_checkpoint_every_five_wins(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        for i in range(7):
            seed_killer(f"Easy Killer {i}")

        run = chaos_service.get_or_create_run(chaos_user, "easy")
        for i in range(5):
            run = chaos_service.submit_result(chaos_user, run["id"], "win", f"Easy Killer {i}")

        assert run["current_streak"] == 5
        assert run["last_checkpoint_streak"] == 5
        assert len(run["checkpoint_killers"]) == 5

        after_loss = chaos_service.submit_result(chaos_user, run["id"], "loss", "Easy Killer 5")
        assert after_loss["current_streak"] == 5
        assert len(after_loss["completed_killers"]) == 5

    def test_medium_banks_checkpoint_every_ten_wins(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        for i in range(12):
            seed_killer(f"Medium Killer {i}")

        run = chaos_service.get_or_create_run(chaos_user, "medium")
        for i in range(9):
            run = chaos_service.submit_result(chaos_user, run["id"], "win", f"Medium Killer {i}")

        assert run["current_streak"] == 9
        assert run["last_checkpoint_streak"] == 0

        # Loss before 10 wins drops back to 0
        after_loss = chaos_service.submit_result(chaos_user, run["id"], "loss", "Medium Killer 9")
        assert after_loss["current_streak"] == 0
        assert after_loss["completed_killers"] == []


@pytest.mark.unit
class TestResetRunAndStats:
    """Tests for manually resetting active Chaos runs and querying summary stats."""

    def test_reset_wipes_and_starts_over(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        seed_killer("The Trapper")
        run = chaos_service.get_or_create_run(chaos_user, "hell")
        chaos_service.submit_result(chaos_user, run["id"], "win", "The Trapper")

        reset = chaos_service.reset_run(chaos_user, "hell")
        assert reset["current_streak"] == 0
        assert reset["completed_killers"] == []
        assert reset["perks_revealed"] is False

    def test_reset_missing_run_raises_value_error(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        with pytest.raises(ValueError):
            chaos_service.reset_run(chaos_user, "medium")

    def test_stats_reflect_submitted_results(
        self, chaos_service: ChaosService, chaos_user: int
    ) -> None:
        seed_killer("The Trapper")
        run = chaos_service.get_or_create_run(chaos_user, "hell")
        chaos_service.submit_result(chaos_user, run["id"], "win", "The Trapper")

        stats = chaos_service.get_stats(chaos_user, "hell")
        assert stats["total_matches"] == 1
        assert stats["wins"] == 1
        assert stats["losses"] == 0
        assert stats["win_rate"] == 100.0
