# backend/tests/unit/streaks/test_id_please_lanes.py
"""The survivor and killer lanes: one side throughout, no repeats until every character was won with, then the badge."""
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.extensions import db
from app.models import ChallengeCompletionRecord, ChallengeModeSetting, IdPleaseRun, Perk, Survivor
from app.services.id_please_service import IdPleaseConflict, IdPleaseService
from tests.unit.streaks.id_please_support import make_user, new_run, play, seed_roster, start

SURVIVORS = 12


@pytest.fixture
def survivor() -> IdPleaseService:
    return IdPleaseService("survivor")


@pytest.fixture
def killer() -> IdPleaseService:
    return IdPleaseService("killer")


@pytest.fixture
def mixed() -> IdPleaseService:
    return IdPleaseService()


@pytest.fixture
def user(db_session: Session) -> int:
    seed_roster(killers=11, survivors=SURVIVORS)
    return make_user()


def records(user_id: int, mode: str, variant: str) -> int:
    return len(db.session.scalars(select(ChallengeCompletionRecord).where(
        ChallengeCompletionRecord.user_id == user_id, ChallengeCompletionRecord.mode == mode, ChallengeCompletionRecord.variant == variant
    )).all())


def add_survivor(name: str) -> None:
    """A survivor unlocked after the run began: owned by default, with its three perks."""
    chapter_id = db.session.scalars(select(Survivor.chapter_id)).first()
    row = Survivor(name=name, chapter_id=chapter_id)
    db.session.add(row)
    db.session.flush()
    db.session.add_all(Perk(name=f"{name} Perk {n}", role="Survivor", survivor_id=row.id) for n in range(3))
    db.session.commit()


def win(service: IdPleaseService, user_id: int, run: dict) -> dict:
    return service.submit_result(user_id, run["id"], run["current_match"], "win")


@pytest.mark.unit
class TestSetup:
    def test_a_lane_run_is_scoped_to_its_lane(self, survivor: IdPleaseService, user: int) -> None:
        run = new_run(survivor, user)
        assert run["lane"] == "survivor" and run["badge_streak"] is None
        assert run["badge_progress"] == {"current": 0, "target": SURVIVORS}

    def test_the_lanes_keep_separate_runs(self, survivor: IdPleaseService, killer: IdPleaseService, mixed: IdPleaseService, user: int) -> None:
        ids = {new_run(service, user)["id"] for service in (survivor, killer, mixed)}
        assert len(ids) == 3
        assert len(db.session.scalars(select(IdPleaseRun).where(IdPleaseRun.user_id == user)).all()) == 3

    def test_the_other_side_is_refused(self, survivor: IdPleaseService, user: int) -> None:
        run = new_run(survivor, user)
        with pytest.raises(ValueError, match="survivor side only"):
            survivor.submit_opening(user, run["id"], "killer", [0, 1, 2, 3])
        with pytest.raises(ValueError, match="survivor side only"):
            survivor.get_roster(user, "killer")

    def test_a_run_of_another_lane_is_not_reachable(self, survivor: IdPleaseService, killer: IdPleaseService, user: int) -> None:
        run = start(survivor, user, side="survivor")
        with pytest.raises(ValueError, match="Run not found"):
            killer.submit_result(user, run["id"], 1, "win")

    def test_the_lane_needs_only_its_own_side(self, survivor: IdPleaseService, db_session: Session) -> None:
        seed_roster(killers=0, survivors=SURVIVORS)
        loner = make_user("survonly")
        assert new_run(survivor, loner)["eligibility"]["met"] is True
        assert start(survivor, loner, side="survivor")["current_match"] == 1

    def test_milestones_needs_ten_characters(self, survivor: IdPleaseService, db_session: Session) -> None:
        seed_roster(killers=0, survivors=9)
        small = make_user("nine")
        run = new_run(survivor, small)
        assert run["eligibility"]["met"] is False
        with pytest.raises(IdPleaseConflict) as caught:
            survivor.submit_opening(small, run["id"], "survivor", [0, 1, 2, 3])
        assert caught.value.code == "roster_below_minimum"

    def test_only_the_mixed_lane_previews_match_two(self, survivor: IdPleaseService, mixed: IdPleaseService, user: int) -> None:
        solo = survivor.preview(user, "survivor", [0, 1, 2, 3])
        assert solo["first"]["side"] == "survivor"
        assert solo["second"] is None
        across = mixed.preview(user, "survivor", [0, 1, 2, 3])
        assert across["second"]["side"] == "killer"
        assert [p["position"] for p in across["second"]["perks"]] == [0, 1, 2, 3]


@pytest.mark.unit
class TestBadgeByEveryCharacter:
    def test_each_match_is_a_new_character_and_the_last_one_earns_the_badge(self, survivor: IdPleaseService, user: int) -> None:
        run = start(survivor, user, side="survivor")
        seen = [run["current_loadout"]["character_id"]]
        for won in range(1, SURVIVORS):
            run = win(survivor, user, run)
            assert run["badge_progress"] == {"current": won, "target": SURVIVORS}
            assert records(user, "id_please_survivor", "milestones") == 0
            assert run["current_loadout"]["character_id"] not in seen
            assert run["current_loadout"]["side"] == "survivor"
            seen.append(run["current_loadout"]["character_id"])
        assert len(set(seen)) == SURVIVORS
        run = win(survivor, user, run)
        assert records(user, "id_please_survivor", "milestones") == 1
        assert run["badge_earned"] is True and run["badge_progress"] is None and run["current_streak"] == SURVIVORS

    def test_the_badge_is_filed_under_the_lane_only(self, survivor: IdPleaseService, user: int) -> None:
        run = start(survivor, user, side="survivor")
        for _ in range(SURVIVORS):
            run = win(survivor, user, run)
        assert records(user, "id_please", "milestones") == 0
        assert records(user, "id_please_killer", "milestones") == 0

    def test_after_the_badge_the_run_goes_on_and_characters_may_repeat(self, survivor: IdPleaseService, user: int) -> None:
        run = start(survivor, user, side="survivor")
        for _ in range(SURVIVORS):
            run = win(survivor, user, run)
        assert run["used_character_ids"] == {"killer": [], "survivor": []}
        seen = []
        for _ in range(3 * SURVIVORS):
            run = win(survivor, user, run)
            seen.append(run["current_loadout"]["character_id"])
        assert len(set(seen)) <= SURVIVORS < len(seen)
        assert records(user, "id_please_survivor", "milestones") == 1

    def test_a_loss_after_the_badge_keeps_it_and_the_replay_has_no_memory(self, survivor: IdPleaseService, user: int) -> None:
        run = start(survivor, user, side="survivor")
        for _ in range(SURVIVORS):
            run = win(survivor, user, run)
        run = survivor.submit_result(user, run["id"], run["current_match"], "loss")
        assert run["badge_earned"] is True and run["current_streak"] == 10 and run["current_match"] == 11
        assert run["used_character_ids"] == {"killer": [], "survivor": []}
        assert records(user, "id_please_survivor", "milestones") == 1

    def test_a_character_unlocked_before_the_last_win_has_to_be_played_too(self, survivor: IdPleaseService, user: int) -> None:
        run = start(survivor, user, side="survivor")
        for _ in range(SURVIVORS - 1):
            run = win(survivor, user, run)
        add_survivor("Survivor 99")                                  # the 13th arrives before the 12th match is won
        run = win(survivor, user, run)
        assert records(user, "id_please_survivor", "milestones") == 0
        assert run["badge_progress"] == {"current": SURVIVORS, "target": SURVIVORS + 1}
        newest = db.session.scalars(select(Survivor.id).where(Survivor.name == "Survivor 99")).one()
        assert run["current_loadout"]["character_id"] == newest      # the only one left to play
        run = win(survivor, user, run)
        assert records(user, "id_please_survivor", "milestones") == 1 and run["badge_earned"] is True

    def test_a_character_unlocked_after_the_badge_costs_nothing(self, survivor: IdPleaseService, user: int) -> None:
        run = start(survivor, user, side="survivor")
        for _ in range(SURVIVORS):
            run = win(survivor, user, run)
        add_survivor("Survivor 99")
        run = win(survivor, user, run)
        assert run["badge_earned"] is True and run["current_streak"] == SURVIVORS + 1
        assert records(user, "id_please_survivor", "milestones") == 1

    def test_unlocking_mid_run_lengthens_the_bar(self, survivor: IdPleaseService, user: int) -> None:
        run = start(survivor, user, side="survivor")
        run = win(survivor, user, run)
        add_survivor("Survivor 99")
        assert survivor.get_or_create_run(user, "milestones")["badge_progress"] == {"current": 1, "target": SURVIVORS + 1}


@pytest.mark.unit
class TestLossesAndCheckpoints:
    def test_a_checkpoint_loss_restores_the_memory(self, survivor: IdPleaseService, user: int) -> None:
        run = start(survivor, user, side="survivor")
        for _ in range(10):
            run = win(survivor, user, run)
        assert run["last_checkpoint_streak"] == 10
        snapshot = run["checkpoint_loadout"]["used"]["survivor"]
        assert len(snapshot) == 11
        run = win(survivor, user, run)                               # match 11 won, match 12 in play
        run = survivor.submit_result(user, run["id"], run["current_match"], "loss")
        assert run["current_streak"] == 10 and run["current_match"] == 11
        assert run["used_character_ids"]["survivor"] == snapshot
        replay = win(survivor, user, run)
        assert replay["current_loadout"]["character_id"] not in snapshot

    def test_a_replay_after_the_checkpoint_gives_the_same_matches(self, survivor: IdPleaseService, user: int) -> None:
        run = start(survivor, user, side="survivor")
        for _ in range(10):
            run = win(survivor, user, run)
        after = win(survivor, user, run)
        first = after["current_loadout"]
        lost = survivor.submit_result(user, after["id"], after["current_match"], "loss")
        assert lost["current_match"] == 11
        assert win(survivor, user, lost)["current_loadout"] == first

    def test_a_hardcore_loss_forgets_the_memory(self, db_session: Session, survivor: IdPleaseService) -> None:
        seed_roster(killers=0, survivors=25)
        player = make_user("hard")
        run = play(survivor, player, start(survivor, player, "hardcore", "survivor"), ["win"] * 3)
        assert len(run["used_character_ids"]["survivor"]) == 4
        run = survivor.submit_result(player, run["id"], run["current_match"], "loss")
        assert run["current_match"] == 0 and run["used_character_ids"] == {}
        run = survivor.submit_opening(player, run["id"], "survivor", [0, 1, 2, 3])
        assert len(run["used_character_ids"]["survivor"]) == 1


@pytest.mark.unit
class TestKillSwitches:
    def test_each_lane_has_its_own(self, survivor: IdPleaseService, killer: IdPleaseService, mixed: IdPleaseService, user: int, db_session: Session) -> None:
        runs = {name: start(service, user, side=name if name != "mixed" else "survivor") for name, service in
                (("survivor", survivor), ("killer", killer), ("mixed", mixed))}
        db_session.add(ChallengeModeSetting(mode="id_please_survivor", is_enabled=False, disabled_reason="bug"))
        db_session.commit()
        with pytest.raises(ValueError, match="temporarily disabled"):
            survivor.submit_result(user, runs["survivor"]["id"], 1, "win")
        assert killer.submit_result(user, runs["killer"]["id"], 1, "win")["current_streak"] == 1
        assert mixed.submit_result(user, runs["mixed"]["id"], 1, "win")["current_streak"] == 1


@pytest.mark.unit
class TestKillerLane:
    def test_the_killer_lane_plays_killers_only(self, killer: IdPleaseService, user: int) -> None:
        run = start(killer, user, side="killer")
        for _ in range(5):
            run = win(killer, user, run)
            assert run["current_loadout"]["side"] == "killer"
        assert run["badge_progress"] == {"current": 5, "target": 11}
        assert (run["lane"], run["badge_streak"]) == ("killer", None)


@pytest.mark.unit
class TestMixedLaneMemory:
    def test_hardcore_remembers_characters(self, mixed: IdPleaseService, db_session: Session) -> None:
        seed_roster(killers=20, survivors=25)
        player = make_user("mixhard")
        run = play(mixed, player, start(mixed, player, "hardcore", "survivor"), ["win"] * 6)
        assert len(run["used_character_ids"]["survivor"]) == 4 and len(run["used_character_ids"]["killer"]) == 3

    def test_milestones_remembers_nothing(self, mixed: IdPleaseService, user: int) -> None:
        run = play(mixed, user, start(mixed, user, side="survivor"), ["win"] * 4)
        assert run["used_character_ids"] == {"killer": [], "survivor": []}


@pytest.mark.unit
class TestSingleSideStreakBadges:
    """Only single-side Milestones asks for every character: Hardcore and Hardcore+ earn the badge at the same streak as the mixed lane."""

    @pytest.mark.parametrize(("difficulty", "streak"), [("hardcore", 30), ("hardcore_plus", 25)])
    def test_the_badge_comes_at_the_streak(self, db_session: Session, survivor: IdPleaseService, difficulty: str, streak: int) -> None:
        seed_roster(killers=0, survivors=31)
        player = make_user(f"streak{streak}")
        run = start(survivor, player, difficulty, "survivor")
        assert (run["badge_streak"], run["badge_progress"]) == (streak, {"current": 0, "target": streak})
        run = play(survivor, player, run, ["win"] * (streak - 1))
        assert run["badge_earned"] is False and run["badge_progress"]["current"] == streak - 1
        assert records(player, "id_please_survivor", difficulty) == 0
        run = win(survivor, player, run)
        assert run["badge_earned"] is True and run["badge_progress"] is None
        assert records(player, "id_please_survivor", difficulty) == 1

    def test_characters_do_not_repeat_in_a_round_even_after_the_badge(self, db_session: Session, survivor: IdPleaseService) -> None:
        seed_roster(killers=0, survivors=25)
        player = make_user("round")
        run = play(survivor, player, start(survivor, player, "hardcore", "survivor"), ["win"] * 24)
        assert len(set(run["used_character_ids"]["survivor"])) == 25
        run = win(survivor, player, run)
        assert len(run["used_character_ids"]["survivor"]) == 1        # the 25th win closes the round; a new one starts


@pytest.mark.unit
class TestHardcorePlusShuffle:
    @pytest.fixture
    def player(self, db_session: Session) -> int:
        seed_roster(killers=30, survivors=30)
        return make_user("plus")

    @staticmethod
    def seed_of(user_id: int, lane: str, difficulty: str) -> int:
        return db.session.scalars(select(IdPleaseRun.perk_seed).where(
            IdPleaseRun.user_id == user_id, IdPleaseRun.lane == lane, IdPleaseRun.difficulty == difficulty
        )).one()

    def test_the_chosen_perks_are_the_perks_of_match_one(self, mixed: IdPleaseService, player: int) -> None:
        chosen = [p["id"] for p in mixed.get_roster(player, "survivor")["perks"] if p["position"] in (0, 1, 2, 3)]
        run = start(mixed, player, "hardcore_plus", "survivor", perks=(0, 1, 2, 3))
        assert sorted(p["id"] for p in run["match"]["perks"]) == sorted(chosen)
        assert "perk_seed" not in run

    def test_every_attempt_shuffles_again(self, mixed: IdPleaseService, player: int) -> None:
        run = new_run(mixed, player, "hardcore_plus")
        seeds, characters = set(), set()
        for _ in range(6):
            run = mixed.submit_opening(player, run["id"], "survivor", [0, 1, 2, 3])
            seeds.add(self.seed_of(player, "mixed", "hardcore_plus"))
            characters.add(run["match"]["character"]["id"])
            run = mixed.submit_result(player, run["id"], run["current_match"], "loss")
            assert self.seed_of(player, "mixed", "hardcore_plus") == 0
        assert len(seeds) == 6 and len(characters) > 1          # the same opening no longer gives the same match

    def test_the_chain_goes_on_with_the_run_s_own_shuffle(self, mixed: IdPleaseService, player: int) -> None:
        run = start(mixed, player, "hardcore_plus", "killer", perks=(3, 9, 27, 40))
        seed = self.seed_of(player, "mixed", "hardcore_plus")
        run = play(mixed, player, run, ["win"] * 12)
        assert self.seed_of(player, "mixed", "hardcore_plus") == seed
        assert run["current_streak"] == 12 and len({p["id"] for p in run["match"]["perks"]}) == 4

    def test_other_difficulties_are_not_shuffled(self, mixed: IdPleaseService, player: int) -> None:
        start(mixed, player, "hardcore", "survivor")
        start(mixed, player, "milestones", "survivor")
        assert self.seed_of(player, "mixed", "hardcore") == 0 and self.seed_of(player, "mixed", "milestones") == 0

    def test_there_is_nothing_to_preview(self, mixed: IdPleaseService, player: int) -> None:
        with pytest.raises(ValueError, match="shuffles your perks"):
            mixed.preview(player, "survivor", [0, 1, 2, 3], "hardcore_plus")
