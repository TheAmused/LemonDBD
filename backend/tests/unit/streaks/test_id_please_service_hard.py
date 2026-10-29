# backend/tests/unit/streaks/test_id_please_service_hard.py
"""Hardcore and Hardcore+: no checkpoints, a one-time badge, and (Hardcore+) a character memory."""
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.extensions import db
from app.models import ChallengeCompletionRecord, IdPleaseRun
from app.services.id_please_service import IdPleaseConflict, IdPleaseService
from tests.unit.streaks.id_please_support import make_user, new_run, play, seed_roster, start


@pytest.fixture
def service() -> IdPleaseService:
    return IdPleaseService()


def badge_count(user_id: int, variant: str) -> int:
    return len(db.session.scalars(select(ChallengeCompletionRecord).where(
        ChallengeCompletionRecord.user_id == user_id, ChallengeCompletionRecord.variant == variant
    )).all())


@pytest.mark.unit
class TestHardcore:
    @pytest.fixture
    def user(self, db_session: Session) -> int:
        seed_roster(killers=20, survivors=25)
        return make_user()

    def test_the_exact_minimum_unlocks_it(self, service: IdPleaseService, user: int) -> None:
        assert new_run(service, user, "hardcore")["eligibility"]["met"] is True
        assert new_run(service, user, "hardcore_plus")["eligibility"]["met"] is False

    def test_hardcore_plus_is_closed_below_its_minimum(self, service: IdPleaseService, user: int) -> None:
        run = new_run(service, user, "hardcore_plus")
        with pytest.raises(IdPleaseConflict) as caught:
            service.submit_opening(user, run["id"], "survivor", [0, 1, 2, 3])
        assert caught.value.code == "roster_below_minimum"

    def test_there_are_no_checkpoints(self, service: IdPleaseService, user: int) -> None:
        run = play(service, user, start(service, user, "hardcore"), ["win"] * 12)
        assert run["last_checkpoint_streak"] == 0 and run["checkpoint_loadout"] == {}
        run = play(service, user, run, ["loss"])
        assert (run["current_streak"], run["current_match"], run["best_streak"]) == (0, 0, 12)

    def test_the_badge_comes_at_thirty(self, service: IdPleaseService, user: int) -> None:
        run = play(service, user, start(service, user, "hardcore"), ["win"] * 29)
        assert badge_count(user, "hardcore") == 0
        run = play(service, user, run, ["win"])
        assert badge_count(user, "hardcore") == 1 and run["badge_earned"] is True
        run = play(service, user, run, ["win", "win"])
        assert badge_count(user, "hardcore") == 1 and run["current_streak"] == 32

    def test_losing_after_the_badge_keeps_it(self, service: IdPleaseService, user: int) -> None:
        run = play(service, user, start(service, user, "hardcore"), ["win"] * 30 + ["loss"])
        assert run["current_streak"] == 0 and run["badge_earned"] is True and run["best_streak"] == 30

    def test_a_badge_does_not_unlock_another_difficulty(self, service: IdPleaseService, user: int) -> None:
        play(service, user, start(service, user, "hardcore"), ["win"] * 30)
        assert badge_count(user, "milestones") == 0 and badge_count(user, "hardcore_plus") == 0

    def test_the_chain_is_the_plain_one(self, service: IdPleaseService, user: int) -> None:
        hard = play(service, user, start(service, user, "hardcore"), ["win"] * 5)
        soft = play(service, user, start(service, user, "milestones"), ["win"] * 5)
        assert hard["current_loadout"] == soft["current_loadout"]


@pytest.mark.unit
class TestHardcorePlus:
    @pytest.fixture
    def user(self, db_session: Session) -> int:
        seed_roster(killers=30, survivors=30)
        return make_user()

    def test_the_minimum_unlocks_every_difficulty(self, service: IdPleaseService, user: int) -> None:
        result = service.get_eligibility(user)["difficulties"]
        assert all(v["met"] for v in result.values())

    def test_the_opening_character_is_remembered(self, service: IdPleaseService, user: int) -> None:
        run = start(service, user, "hardcore_plus")
        assert run["used_character_ids"] == {"killer": [], "survivor": [run["current_loadout"]["character_id"]]}

    def test_memory_grows_with_every_match_and_never_repeats(self, service: IdPleaseService, user: int) -> None:
        run = start(service, user, "hardcore_plus")
        seen = {"killer": [], "survivor": [run["current_loadout"]["character_id"]]}
        for _ in range(20):
            run = service.submit_result(user, run["id"], run["current_match"], "win")
            side, character = run["current_loadout"]["side"], run["current_loadout"]["character_id"]
            assert character not in seen[side]
            seen[side].append(character)
        assert run["used_character_ids"] == seen

    def test_a_full_round_starts_a_new_one(self, service: IdPleaseService, user: int) -> None:
        run = start(service, user, "hardcore_plus")
        run = play(service, user, run, ["win"] * 59)
        used = run["used_character_ids"]
        assert len(used["survivor"]) == len(set(used["survivor"])) == 30
        assert len(used["killer"]) == len(set(used["killer"])) == 30
        run = service.submit_result(user, run["id"], run["current_match"], "win")
        assert run["current_loadout"]["side"] == "survivor"
        assert run["used_character_ids"]["survivor"] == [run["current_loadout"]["character_id"]]
        assert len(run["used_character_ids"]["killer"]) == 30

    def test_the_badge_comes_at_twenty_five(self, service: IdPleaseService, user: int) -> None:
        run = play(service, user, start(service, user, "hardcore_plus"), ["win"] * 24)
        assert badge_count(user, "hardcore_plus") == 0
        run = play(service, user, run, ["win"])
        assert badge_count(user, "hardcore_plus") == 1 and run["badge_earned"] is True and run["status"] == "in_progress"

    def test_a_loss_resets_the_memory(self, service: IdPleaseService, user: int, db_session: Session) -> None:
        run = play(service, user, start(service, user, "hardcore_plus"), ["win"] * 5 + ["loss"])
        row = db_session.get(IdPleaseRun, run["id"])
        assert row.used_character_ids == {} and row.before_loadout == {} and row.current_match == 0

    def test_it_differs_from_the_plain_chain_from_match_three(self, service: IdPleaseService, user: int) -> None:
        plus = play(service, user, start(service, user, "hardcore_plus"), ["win"] * 4)
        base = play(service, user, start(service, user, "hardcore"), ["win"] * 4)
        assert plus["current_loadout"] != base["current_loadout"]
