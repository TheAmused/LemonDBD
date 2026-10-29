# backend/tests/unit/streaks/test_id_please_service.py
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import ChallengeCompletionRecord, ChallengeModeSetting, IdPleaseMatchLog, IdPleaseRun, UserCharacterOwnership
from app.services.id_please_service import IdPleaseConflict, IdPleaseService
from tests.unit.streaks.id_please_support import make_user, new_run, play, seed_roster, start


@pytest.fixture
def service() -> IdPleaseService:
    return IdPleaseService()


@pytest.fixture
def small(db_session: Session) -> int:
    seed_roster(killers=3, survivors=3)
    return make_user()


def badges(user_id: int, difficulty: str) -> int:
    from app.core.extensions import db

    return len(db.session.scalars(select(ChallengeCompletionRecord).where(
        ChallengeCompletionRecord.user_id == user_id, ChallengeCompletionRecord.mode == "id_please", ChallengeCompletionRecord.variant == difficulty
    )).all())


@pytest.mark.unit
class TestRunLifecycle:
    def test_a_new_run_waits_in_setup(self, service: IdPleaseService, small: int) -> None:
        run = new_run(service, small)
        assert run["difficulty"] == "milestones"
        assert run["current_match"] == 0
        assert run["match"] is None
        assert run["status"] == "in_progress"
        assert run["badge_streak"] == 50
        assert run["checkpoint_interval"] == 10
        assert run["badge_earned"] is False
        assert run["eligibility"]["met"] is True

    def test_runs_are_per_difficulty(self, service: IdPleaseService, small: int) -> None:
        assert new_run(service, small, "milestones")["id"] != new_run(service, small, "hardcore")["id"]
        assert new_run(service, small, "hardcore")["eligibility"]["met"] is False

    def test_unknown_difficulty_is_rejected(self, service: IdPleaseService, small: int) -> None:
        with pytest.raises(ValueError):
            service.get_or_create_run(small, "nightmare")

    def test_a_disabled_mode_cannot_be_started_or_played(self, service: IdPleaseService, small: int, db_session: Session) -> None:
        run = start(service, small)
        db_session.add(ChallengeModeSetting(mode="id_please", is_enabled=False, disabled_reason="bug"))
        db_session.commit()
        with pytest.raises(ValueError, match="temporarily disabled"):
            service.submit_result(small, run["id"], 1, "win")
        with pytest.raises(ValueError, match="temporarily disabled"):
            service.submit_opening(small, run["id"], "survivor", [0, 1, 2, 3])
        with pytest.raises(ValueError, match="temporarily disabled"):
            service.abandon_run(small, "milestones")
        with pytest.raises(ValueError, match="temporarily disabled"):
            service.get_or_create_run(small, "hardcore")

    def test_abandon_returns_to_setup_and_keeps_the_best(self, service: IdPleaseService, small: int) -> None:
        run = play(service, small, start(service, small), ["win", "win", "win"])
        assert run["best_streak"] == 3
        fresh = service.abandon_run(small, "milestones")
        assert fresh["current_match"] == 0 and fresh["match"] is None
        assert fresh["current_streak"] == 0
        assert fresh["best_streak"] == 3
        assert fresh["attempt"] == run["attempt"] + 1
        assert fresh["total_wins"] == 3


@pytest.mark.unit
class TestOpening:
    def test_opening_sets_match_one(self, service: IdPleaseService, small: int) -> None:
        run = start(service, small, side="survivor", perks=(0, 1, 2, 3))
        assert run["current_match"] == 1
        assert run["match"]["side"] == "survivor"
        assert run["match"]["character"]["position"] == 6 % 3
        assert [p["position"] for p in run["match"]["perks"]] == [0, 1, 2, 3]
        assert run["opening_side"] == "survivor"

    @pytest.mark.parametrize("perks", [[0, 1, 2], [0, 1, 2, 2], [0, 1, 2, 99], [0, 1, 2, -1], "abcd", None])
    def test_malformed_openings_are_rejected(self, service: IdPleaseService, small: int, perks: object) -> None:
        run = new_run(service, small)
        with pytest.raises(ValueError):
            service.submit_opening(small, run["id"], "survivor", perks)

    def test_unknown_side_is_rejected(self, service: IdPleaseService, small: int) -> None:
        run = new_run(service, small)
        with pytest.raises(ValueError):
            service.submit_opening(small, run["id"], "entity", [0, 1, 2, 3])

    def test_a_started_run_cannot_be_reopened(self, service: IdPleaseService, small: int) -> None:
        run = start(service, small)
        with pytest.raises(IdPleaseConflict) as caught:
            service.submit_opening(small, run["id"], "killer", [0, 1, 2, 3])
        assert caught.value.code == "already_started"

    def test_below_the_minimum_is_a_conflict(self, service: IdPleaseService, db_session: Session) -> None:
        seed_roster(killers=3, survivors=3, general_perks=0)
        user = make_user()
        run = new_run(service, user, "hardcore")
        with pytest.raises(IdPleaseConflict) as caught:
            service.submit_opening(user, run["id"], "survivor", [0, 1, 2, 3])
        assert caught.value.code == "roster_below_minimum"
        assert caught.value.details["eligibility"]["met"] is False

    def test_stale_fingerprint_is_a_conflict(self, service: IdPleaseService, small: int) -> None:
        run = new_run(service, small)
        with pytest.raises(IdPleaseConflict) as caught:
            service.submit_opening(small, run["id"], "survivor", [0, 1, 2, 3], "0/0/0/0:deadbeef")
        assert caught.value.code == "roster_changed"

    def test_matching_fingerprint_is_accepted(self, service: IdPleaseService, small: int) -> None:
        run = new_run(service, small)
        done = service.submit_opening(small, run["id"], "survivor", [0, 1, 2, 3], run["roster_fingerprint"])
        assert done["current_match"] == 1


@pytest.mark.unit
class TestResults:
    def test_a_win_advances_to_the_other_side(self, service: IdPleaseService, small: int) -> None:
        first = start(service, small)
        second = service.submit_result(small, first["id"], 1, "win")
        assert second["current_streak"] == 1
        assert second["current_match"] == 2
        assert second["match"]["side"] == "killer"
        assert [p["position"] for p in second["match"]["perks"]] == [0, 1, 2, 3]
        assert second["before_loadout"] == first["current_loadout"]

    def test_a_win_is_logged(self, service: IdPleaseService, small: int, db_session: Session) -> None:
        first = start(service, small)
        service.submit_result(small, first["id"], 1, "win")
        log = db_session.scalars(select(IdPleaseMatchLog)).one()
        assert (log.match_number, log.side, log.result, log.streak_before, log.streak_after) == (1, "survivor", "win", 0, 1)
        assert log.character_id == first["current_loadout"]["character_id"]
        assert log.perk_ids == first["current_loadout"]["perk_ids"]
        assert log.roster_fingerprint == first["roster_fingerprint"]

    def test_a_repeated_report_is_stale(self, service: IdPleaseService, small: int) -> None:
        first = start(service, small)
        service.submit_result(small, first["id"], 1, "win")
        with pytest.raises(IdPleaseConflict) as caught:
            service.submit_result(small, first["id"], 1, "win")
        assert caught.value.code == "stale_match"
        assert caught.value.details["run"]["current_match"] == 2

    def test_results_need_an_opening(self, service: IdPleaseService, small: int) -> None:
        run = new_run(service, small)
        with pytest.raises(IdPleaseConflict) as caught:
            service.submit_result(small, run["id"], 0, "win")
        assert caught.value.code == "not_started"

    def test_bad_result_value_is_rejected(self, service: IdPleaseService, small: int) -> None:
        first = start(service, small)
        with pytest.raises(ValueError):
            service.submit_result(small, first["id"], 1, "draw")

    def test_another_users_run_is_not_found(self, service: IdPleaseService, small: int) -> None:
        first = start(service, small)
        with pytest.raises(ValueError, match="not found"):
            service.submit_result(make_user("stranger"), first["id"], 1, "win")

    def test_best_streak_survives_a_loss(self, service: IdPleaseService, small: int) -> None:
        run = play(service, small, start(service, small), ["win", "win", "loss"])
        assert (run["current_streak"], run["best_streak"], run["current_match"]) == (0, 2, 0)
        assert run["attempts"] == 1 and run["total_wins"] == 2 and run["total_losses"] == 1

    def test_the_same_opening_gives_the_same_chain(self, service: IdPleaseService, small: int) -> None:
        a = play(service, small, start(service, small), ["win"] * 6)
        other = make_user("twin")
        b = play(service, other, start(service, other), ["win"] * 6)
        assert a["current_loadout"] == b["current_loadout"]
        assert a["match"]["character"]["position"] == b["match"]["character"]["position"]

    def test_a_loss_from_setup_after_reset_allows_the_same_opening(self, service: IdPleaseService, small: int) -> None:
        run = play(service, small, start(service, small), ["win", "loss"])
        again = service.submit_opening(small, run["id"], "survivor", [0, 1, 2, 3])
        assert again["current_match"] == 1


@pytest.mark.unit
class TestMilestones:
    def test_checkpoint_every_ten_wins_and_loss_returns_to_it(self, service: IdPleaseService, small: int) -> None:
        run = play(service, small, start(service, small), ["win"] * 10)
        assert run["last_checkpoint_streak"] == 10
        checkpoint = run["checkpoint_loadout"]
        assert checkpoint["number"] == 11 == run["current_match"]
        run = play(service, small, run, ["win", "win", "win", "loss"])
        assert run["current_streak"] == 10
        assert run["current_loadout"] == {k: v for k, v in checkpoint.items() if k != "used"}
        assert run["current_match"] == 11
        assert run["best_streak"] == 13
        assert run["before_loadout"] == {}

    def test_a_loss_before_the_first_checkpoint_returns_to_setup(self, service: IdPleaseService, small: int) -> None:
        run = play(service, small, start(service, small), ["win"] * 9 + ["loss"])
        assert (run["current_streak"], run["current_match"], run["last_checkpoint_streak"]) == (0, 0, 0)
        assert run["checkpoint_loadout"] == {}

    def test_a_replay_after_a_checkpoint_loss_is_deterministic(self, service: IdPleaseService, small: int) -> None:
        run = play(service, small, start(service, small), ["win"] * 10)
        first_pass = []
        for result in ("win", "win", "loss"):
            run = service.submit_result(small, run["id"], run["current_match"], result)
            first_pass.append(run["current_loadout"])
        second_pass = []
        for result in ("win", "win"):
            run = service.submit_result(small, run["id"], run["current_match"], result)
            second_pass.append(run["current_loadout"])
        assert second_pass == first_pass[:2]
        assert run["current_streak"] == 12

    def test_the_badge_comes_at_fifty_once_and_the_run_goes_on(self, service: IdPleaseService, small: int) -> None:
        run = play(service, small, start(service, small), ["win"] * 49)
        assert badges(small, "milestones") == 0 and run["badge_earned"] is False
        run = play(service, small, run, ["win"])
        assert badges(small, "milestones") == 1
        assert run["badge_earned"] is True and run["status"] == "in_progress"
        run = play(service, small, run, ["win"] * 3)
        assert run["current_streak"] == 53 and badges(small, "milestones") == 1

    def test_crossing_the_threshold_again_adds_no_second_badge(self, service: IdPleaseService, small: int, db_session: Session) -> None:
        run = play(service, small, start(service, small), ["win"] * 50)
        row = db_session.get(IdPleaseRun, run["id"])
        row.current_streak = 49
        db_session.commit()
        service.submit_result(small, run["id"], run["current_match"], "win")
        assert badges(small, "milestones") == 1

    def test_the_badge_records_the_attempt_and_the_roster(self, service: IdPleaseService, small: int, db_session: Session) -> None:
        play(service, small, start(service, small), ["win"] * 50)
        record = db_session.scalars(select(ChallengeCompletionRecord)).one()
        assert (record.mode, record.variant, record.attempts_taken, record.matches_played) == ("id_please", "milestones", 1, 50)
        assert record.unlocked_characters_count == 6


@pytest.mark.unit
class TestLiveRoster:
    def test_losing_ownership_does_not_break_the_run(self, service: IdPleaseService, small: int, db_session: Session) -> None:
        from app.models import Killer

        run = play(service, small, start(service, small), ["win"])
        killer_id = run["current_loadout"]["character_id"]
        db_session.add(UserCharacterOwnership(user_id=small, killer_id=killer_id, is_owned=False))
        db_session.commit()
        after = service.submit_result(small, run["id"], run["current_match"], "win")
        assert after["current_streak"] == 2
        assert after["match"]["character"]["position"] in (0, 1, 2)
        assert db_session.get(Killer, killer_id) is not None

    def test_the_fingerprint_catches_a_changed_roster(self, service: IdPleaseService, small: int, db_session: Session) -> None:
        run = start(service, small)
        db_session.add(UserCharacterOwnership(user_id=small, survivor_id=1, is_owned=False))
        db_session.commit()
        with pytest.raises(IdPleaseConflict) as caught:
            service.submit_result(small, run["id"], 1, "win", run["roster_fingerprint"])
        assert caught.value.code == "roster_changed"

    def test_dropping_below_the_minimum_blocks_without_a_loss(self, service: IdPleaseService, small: int, db_session: Session) -> None:
        run = start(service, small)
        for killer_id in range(1, 4):
            db_session.add(UserCharacterOwnership(user_id=small, killer_id=killer_id, is_owned=False))
        db_session.commit()
        with pytest.raises(IdPleaseConflict) as caught:
            service.submit_result(small, run["id"], 1, "loss")
        assert caught.value.code == "roster_below_minimum"
        row = db_session.get(IdPleaseRun, run["id"])
        assert (row.total_losses, row.current_match, row.attempts) == (0, 1, 0)
        assert db_session.scalars(select(IdPleaseMatchLog)).all() == []


@pytest.mark.unit
class TestInactivity:
    def test_a_run_in_setup_loses_nothing(self, service: IdPleaseService, small: int) -> None:
        run = new_run(service, small)
        assert service.apply_inactivity_loss(run["id"]) is False

    def test_an_idle_run_in_play_takes_a_loss(self, service: IdPleaseService, small: int, db_session: Session) -> None:
        run = start(service, small)
        assert service.apply_inactivity_loss(run["id"]) is True
        log = db_session.scalars(select(IdPleaseMatchLog)).one()
        assert (log.result, log.triggered_by) == ("loss", "inactivity")
        row = db_session.get(IdPleaseRun, run["id"])
        assert row.current_match == 0 and row.total_losses == 1

    def test_an_idle_milestones_run_goes_back_to_its_checkpoint(self, service: IdPleaseService, small: int, db_session: Session) -> None:
        run = play(service, small, start(service, small), ["win"] * 12)
        assert service.apply_inactivity_loss(run["id"]) is True
        row = db_session.get(IdPleaseRun, run["id"])
        assert (row.current_streak, row.current_match) == (10, 11)

    def test_a_missing_run_is_ignored(self, service: IdPleaseService, small: int) -> None:
        assert service.apply_inactivity_loss(999999) is False


@pytest.mark.unit
class TestReadModels:
    def test_roster_listing_numbers_the_ids_from_zero(self, service: IdPleaseService, small: int) -> None:
        roster = service.get_roster(small, "killer")
        assert [c["position"] for c in roster["characters"]] == [0, 1, 2]
        assert [p["position"] for p in roster["perks"]] == list(range(len(roster["perks"])))
        assert roster["perks"][0]["name"]

    def test_preview_matches_the_real_opening(self, service: IdPleaseService, small: int) -> None:
        preview = service.preview(small, "survivor", [0, 1, 2, 3])
        run = start(service, small)
        assert preview["first"]["character"]["id"] == run["match"]["character"]["id"]
        second = service.submit_result(small, run["id"], 1, "win")
        assert preview["second"]["character"]["id"] == second["match"]["character"]["id"]
        assert [p["id"] for p in preview["second"]["perks"]] == [p["id"] for p in second["match"]["perks"]]

    def test_preview_rejects_bad_input(self, service: IdPleaseService, small: int) -> None:
        with pytest.raises(ValueError):
            service.preview(small, "survivor", [0, 0, 1, 2])
        with pytest.raises(ValueError):
            service.get_roster(small, "entity")

    def test_eligibility_lists_every_difficulty(self, service: IdPleaseService, small: int) -> None:
        result = service.get_eligibility(small)["difficulties"]
        assert {k: v["met"] for k, v in result.items()} == {"milestones": True, "hardcore": False, "hardcore_plus": False}

    def test_stats_count_matches(self, service: IdPleaseService, small: int) -> None:
        play(service, small, start(service, small), ["win", "win", "loss"])
        stats = service.get_stats(small, "milestones")
        assert (stats["total_matches"], stats["wins"], stats["losses"]) == (3, 2, 1)
        assert len(stats["recent_logs"]) == 3
        assert all(log["character_name"].startswith(("Survivor ", "Killer ")) for log in stats["recent_logs"])
