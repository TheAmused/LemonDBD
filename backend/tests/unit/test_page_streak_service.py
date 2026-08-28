# backend/tests/unit/test_page_streak_service.py
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Character, Perk, PageStreakPageLog
from app.services.user_service import UserService
from app.services.ownership_service import OwnershipService
from app.services.page_streak_service import PageStreakService
from app.services.page_streak.runs import apply_inactivity_loss

GENERAL_CHARACTER = "General"


class FakePerkService:
    def __init__(self, perks: list[dict[str, object]]) -> None:
        self._perks = perks

    def get_perks(self, category: str | None = None, limit: int | None = None, **kwargs: object) -> dict[str, object]:
        data = [p for p in self._perks if category is None or p.get("category") == category]
        return {"data": data, "pagination": {"total": len(data)}}


class ClampingFakePerkService:
    def __init__(self, perks: list[dict[str, object]]) -> None:
        self._perks = perks

    def get_perks(self, category: str | None = None, page: int = 1, limit: int = 50, **kwargs: object) -> dict[str, object]:
        data = [p for p in self._perks if category is None or p.get("category") == category]
        total = len(data)
        page = max(1, page)
        limit = max(1, min(limit, 200))
        start = (page - 1) * limit
        end = start + limit
        return {
            "data": data[start:end],
            "pagination": {"total": total, "page": page, "limit": limit},
        }


class OrderedFakePerkService(FakePerkService):
    def __init__(self, perks: list[dict[str, object]], characters: list[dict[str, object]]) -> None:
        super().__init__(perks)
        self._characters = characters

    def get_characters(self, category: str | None = None) -> list[dict[str, object]]:
        if category is None:
            return list(self._characters)
        return [c for c in self._characters if c.get("category") == category]


def make_perks(count: int, category: str = "Killer", character: str = "Trapper", start: int = 1) -> list[dict[str, object]]:
    return [
        {
            "name": f"Perk {i:03d}",
            "character": character,
            "category": category,
        }
        for i in range(start, start + count)
    ]


def seed_perks(perks: list[dict[str, object]]) -> None:
    from app.core.extensions import db

    char_cache: dict[str, Character] = {}
    for p in perks:
        char_name = str(p.get("character", ""))
        character = None
        if char_name and char_name != GENERAL_CHARACTER:
            character = char_cache.get(char_name)
            if character is None:
                character = db.session.scalars(
                    select(Character).where(Character.name == char_name)
                ).first()
                if character is None:
                    character = Character(name=char_name, role=str(p["category"]))
                    db.session.add(character)
                    db.session.flush()
                char_cache[char_name] = character
        db.session.add(
            Perk(
                name=str(p["name"]),
                character_id=character.id if character else None,
                is_teachable=True,
                category=str(p["category"]),
            )
        )
    db.session.commit()


def seed_killers(names: list[str]) -> None:
    from app.core.extensions import db

    for name in names:
        if db.session.scalars(select(Character).where(Character.name == name)).first():
            continue
        db.session.add(Character(name=name, role="Killer"))
    db.session.commit()


@pytest.fixture
def user_service() -> UserService:
    return UserService()


@pytest.fixture
def ownership_service() -> OwnershipService:
    return OwnershipService()


@pytest.fixture
def streak_user(user_service: UserService) -> int:
    user, err = user_service.register_user("streak_player", "streak@example.com", "Password123!")
    assert err is None
    return user.id


@pytest.mark.unit
class TestPageStreakPool:
    """Tests for building 15-perk pages and per-user pool filtering."""

    @pytest.fixture(autouse=True)
    def setup_pool(self, streak_user: int) -> None:
        self.user_id = streak_user
        self.perks = make_perks(33) + make_perks(5, category="Survivor", character="Meg", start=101)
        seed_perks(self.perks)
        self.service = PageStreakService(perk_service=FakePerkService(self.perks))

    def test_pool_contains_only_killer_perks_sorted_by_name(self) -> None:
        pool = self.service.get_pool(self.user_id)
        assert len(pool) == 33
        assert all(p["category"] == "Killer" for p in pool)
        names = [p["name"] for p in pool]
        assert names == sorted(names)

    def test_build_pages_chunks_by_fifteen_with_short_last_page(self) -> None:
        pages = self.service.build_pages(self.user_id)
        assert len(pages) == 3
        assert len(pages[0]) == 15
        assert len(pages[1]) == 15
        assert len(pages[2]) == 3
        assert pages[0][0] == "Perk 001"
        assert pages[2][-1] == "Perk 033"

    def test_locked_perks_shrink_pool_and_page_count(self, ownership_service: OwnershipService) -> None:
        from app.core.extensions import db

        for i in range(1, 4):
            perk = db.session.scalars(select(Perk).where(Perk.name == f"Perk {i:03d}")).first()
            ownership_service.set_perk_ownership(self.user_id, perk.id, is_unlocked=False)

        pool = self.service.get_pool(self.user_id)
        assert len(pool) == 30
        pages = self.service.build_pages(self.user_id)
        assert len(pages) == 2
        assert pages[0][0] == "Perk 004"

    def test_pool_is_per_user(self, user_service: UserService, ownership_service: OwnershipService) -> None:
        from app.core.extensions import db

        other_user, _ = user_service.register_user("other_streak_user", "other_s@test.com", "Pass123!")
        perk = db.session.scalars(select(Perk).where(Perk.name == "Perk 001")).first()
        ownership_service.set_perk_ownership(self.user_id, perk.id, is_unlocked=False)

        assert len(self.service.get_pool(self.user_id)) == 32
        assert len(self.service.get_pool(other_user.id)) == 33

    def test_pool_shorter_than_one_page_yields_single_short_page(self, ownership_service: OwnershipService) -> None:
        from app.core.extensions import db

        keep = {"Perk 001", "Perk 002"}
        for p in self.perks:
            if p["category"] == "Killer" and p["name"] not in keep:
                perk = db.session.scalars(select(Perk).where(Perk.name == p["name"])).first()
                ownership_service.set_perk_ownership(self.user_id, perk.id, is_unlocked=False)

        pages = self.service.build_pages(self.user_id)
        assert pages == [["Perk 001", "Perk 002"]]


@pytest.mark.unit
class TestPageStreakPoolPagination:
    """Tests for retrieving large perk pools beyond the 200-item pagination limit."""

    @pytest.fixture(autouse=True)
    def setup_large_pool(self, streak_user: int) -> None:
        self.user_id = streak_user
        self.perks = make_perks(250)
        seed_perks(self.perks)
        self.service = PageStreakService(perk_service=ClampingFakePerkService(self.perks))

    def test_get_pool_returns_all_perks_beyond_the_200_page_clamp(self) -> None:
        pool = self.service.get_pool(self.user_id)
        assert len(pool) == 250
        names = {p["name"] for p in pool}
        assert names == {p["name"] for p in self.perks}

    def test_build_pages_covers_every_perk_beyond_the_200_page_clamp(self) -> None:
        pages = self.service.build_pages(self.user_id)
        flattened = [name for page in pages for name in page]
        assert len(flattened) == 250
        assert sorted(flattened) == sorted(p["name"] for p in self.perks)


@pytest.mark.unit
class TestPageStreakRoster:
    """Tests for per-killer run initialization, snapshots, and isolation."""

    @pytest.fixture(autouse=True)
    def setup_roster(self, streak_user: int) -> None:
        self.user_id = streak_user
        self.perks = (
            make_perks(20, character="Trapper")
            + make_perks(10, character="Nurse")
            + make_perks(5, character=GENERAL_CHARACTER)
            + make_perks(4, category="Survivor", character="Meg")
        )
        for i, perk in enumerate(self.perks, start=1):
            perk["name"] = f"Perk {i:03d}"
        seed_perks(self.perks)
        self.service = PageStreakService(perk_service=FakePerkService(self.perks))

    def test_roster_lists_owned_killers_only(self) -> None:
        roster = self.service.get_roster(self.user_id)
        names = [entry["killer"] for entry in roster]
        assert names == ["Nurse", "Trapper"]
        assert all(entry["status"] == "not_started" for entry in roster)
        assert roster[0]["page_count"] == 3

    def test_locked_killer_is_excluded_from_roster(self, ownership_service: OwnershipService) -> None:
        from app.core.extensions import db

        trapper = db.session.scalars(select(Character).where(Character.name == "Trapper")).first()
        ownership_service.set_character_ownership(self.user_id, trapper.id, is_owned=False)
        names = [entry["killer"] for entry in self.service.get_roster(self.user_id)]
        assert names == ["Nurse"]

    def test_start_run_snapshot_at_is_utc_iso_with_z_suffix(self) -> None:
        run = self.service.start_run(self.user_id, "Nurse")
        assert run["snapshot_at"] is not None
        assert run["snapshot_at"].endswith("Z")

    def test_start_run_freezes_snapshot(self, ownership_service: OwnershipService) -> None:
        from app.core.extensions import db

        run = self.service.start_run(self.user_id, "Nurse")
        assert run["status"] == "in_progress"
        assert run["current_page"] == 1
        assert run["attempt"] == 1
        assert run["best_page"] == 0
        assert run["page_count"] == 3
        assert len(run["pages"][0]) == 15

        for i in range(1, 21):
            perk = db.session.scalars(select(Perk).where(Perk.name == f"Perk {i:03d}")).first()
            ownership_service.set_perk_ownership(self.user_id, perk.id, is_unlocked=False)

        reloaded = self.service.get_run(self.user_id, "Nurse")
        assert reloaded["page_count"] == 3
        assert len(reloaded["pages"][0]) == 15

    def test_start_run_twice_is_rejected(self) -> None:
        self.service.start_run(self.user_id, "Nurse")
        with pytest.raises(ValueError):
            self.service.start_run(self.user_id, "Nurse")

    def test_start_run_rejects_unknown_killer(self) -> None:
        with pytest.raises(ValueError):
            self.service.start_run(self.user_id, "Not A Killer")

    def test_get_run_returns_none_when_not_started(self) -> None:
        assert self.service.get_run(self.user_id, "Trapper") is None

    def test_roster_reflects_started_run(self) -> None:
        self.service.start_run(self.user_id, "Nurse")
        roster = {entry["killer"]: entry for entry in self.service.get_roster(self.user_id)}
        assert roster["Nurse"]["status"] == "in_progress"
        assert roster["Nurse"]["current_page"] == 1
        assert roster["Trapper"]["status"] == "not_started"

    def test_runs_are_isolated_per_user(self, user_service: UserService) -> None:
        other_user, _ = user_service.register_user("other_roster_user", "other_r@test.com", "Pass123!")
        self.service.start_run(self.user_id, "Nurse")
        assert self.service.get_run(other_user.id, "Nurse") is None
        other_roster = {e["killer"]: e for e in self.service.get_roster(other_user.id)}
        assert other_roster["Nurse"]["status"] == "not_started"


@pytest.mark.unit
class TestPageStreakResults:
    """Tests for Page Streak result submission, win/loss state shifts, and resets."""

    @pytest.fixture(autouse=True)
    def setup_streak_results(self, streak_user: int) -> None:
        self.user_id = streak_user
        self.perks = make_perks(32, character="Nurse")
        seed_perks(self.perks)
        self.service = PageStreakService(perk_service=FakePerkService(self.perks))
        self.run = self.service.start_run(self.user_id, "Nurse")

    def build_for(self, page_number: int) -> list[str]:
        page = self.run["pages"][page_number - 1]
        return page[: self.service.expected_build_size(page)]

    def test_win_advances_to_next_page_and_records_best(self) -> None:
        updated = self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        assert updated["current_page"] == 2
        assert updated["best_page"] == 1
        assert updated["status"] == "in_progress"
        assert len(updated["history"]) == 1
        assert updated["history"][0]["result"] == "win"
        assert updated["history"][0]["page_number"] == 1

    def test_winning_last_page_completes_the_run(self) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        updated = self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        assert updated["status"] == "completed"
        assert updated["best_page"] == 3
        assert updated["current_page"] == updated["page_count"]

    def test_loss_resets_page_keeps_history_and_best(self) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        updated = self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "loss")
        assert updated["current_page"] == 1
        assert updated["attempt"] == 2
        assert updated["best_page"] == 1
        assert len(updated["history"]) == 2
        assert updated["pages"] == self.run["pages"]

    def test_short_last_page_accepts_a_short_build(self) -> None:
        page3 = self.run["pages"][2]
        assert len(page3) == 2
        assert self.service.expected_build_size(page3) == 2
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        updated = self.service.submit_result(self.user_id, "Nurse", 3, page3, "win")
        assert updated["status"] == "completed"

    def test_rejects_wrong_page(self) -> None:
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")

    def test_rejects_perk_from_another_page(self) -> None:
        bad = self.build_for(1)[:3] + [self.run["pages"][1][0]]
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, bad, "win")

    def test_rejects_wrong_perk_count(self) -> None:
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1)[:3], "win")

    def test_rejects_duplicate_perks(self) -> None:
        first = self.run["pages"][0][0]
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, [first, first, first, first], "win")

    def test_rejects_invalid_result_value(self) -> None:
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "draw")

    def test_rejects_result_on_completed_run(self) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        with pytest.raises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")

    def test_reset_restarts_with_fresh_snapshot_and_keeps_history(self, ownership_service: OwnershipService) -> None:
        from app.core.extensions import db

        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        for i in range(1, 18):
            perk = db.session.scalars(select(Perk).where(Perk.name == f"Perk {i:03d}")).first()
            ownership_service.set_perk_ownership(self.user_id, perk.id, is_unlocked=False)

        updated = self.service.reset_run(self.user_id, "Nurse")
        assert updated["current_page"] == 1
        assert updated["attempt"] == 2
        assert updated["status"] == "in_progress"
        assert updated["page_count"] == 1
        assert len(updated["history"]) == 1
        assert updated["best_page"] == 1

    def test_reset_reopens_a_completed_run(self) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        updated = self.service.reset_run(self.user_id, "Nurse")
        assert updated["status"] == "in_progress"
        assert updated["current_page"] == 1

    def test_reset_without_a_run_is_rejected(self) -> None:
        with pytest.raises(ValueError):
            self.service.reset_run(self.user_id, "Trapper")

    def test_apply_inactivity_loss_resets_page_and_increments_attempt(self) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        apply_inactivity_loss(self.run["id"])
        updated = self.service.get_run(self.user_id, "Nurse")
        assert updated["current_page"] == 1
        assert updated["attempt"] == 2

    def test_apply_inactivity_loss_writes_a_flagged_page_log(self, db_session: Session) -> None:
        apply_inactivity_loss(self.run["id"])
        log = db_session.scalars(
            select(PageStreakPageLog).where(PageStreakPageLog.run_id == self.run["id"])
        ).first()
        assert log.result == "loss"
        assert log.triggered_by == "inactivity"

    def test_apply_inactivity_loss_is_a_noop_on_a_completed_run(self, db_session: Session) -> None:
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        before_count = db_session.query(PageStreakPageLog).count()
        apply_inactivity_loss(self.run["id"])
        assert db_session.query(PageStreakPageLog).count() == before_count
        reloaded = self.service.get_run(self.user_id, "Nurse")
        assert reloaded["status"] == "completed"


@pytest.mark.unit
class TestPageStreakRosterOrder:
    """Tests for ordering roster by release sequence or alphabetical fallback."""

    @pytest.fixture(autouse=True)
    def setup_roster_order(self, streak_user: int) -> None:
        self.user_id = streak_user
        perks: list[dict[str, object]] = []
        for killer in ["Wraith", "Trapper", "Nurse", "Animatronic"]:
            perks.extend(make_perks(2, character=killer))
        for i, perk in enumerate(perks, start=1):
            perk["name"] = f"Perk {i:03d}"
        seed_perks(perks)
        seed_killers(["Wraith", "Trapper", "Nurse", "Animatronic"])

        characters = [
            {"name": "Nurse", "category": "Killer", "release_number": 4},
            {"name": "Trapper", "category": "Killer", "release_number": 1},
            {"name": "Wraith", "category": "Killer", "release_number": 2},
            {"name": "Meg Thomas", "category": "Survivor", "release_number": 2},
        ]
        self.perks = perks
        self.characters = characters
        self.service = PageStreakService(perk_service=OrderedFakePerkService(perks, characters))

    def test_killers_are_ordered_by_release_number(self) -> None:
        assert self.service.get_killers(self.user_id) == ["Trapper", "Wraith", "Nurse", "Animatronic"]

    def test_killer_without_a_release_number_is_kept_at_the_end(self) -> None:
        assert "Animatronic" in self.service.get_killers(self.user_id)

    def test_roster_uses_the_same_order(self) -> None:
        roster_names = [entry["killer"] for entry in self.service.get_roster(self.user_id)]
        assert roster_names == ["Trapper", "Wraith", "Nurse", "Animatronic"]

    def test_falls_back_to_alphabetical_order_without_release_numbers(self) -> None:
        service = PageStreakService(perk_service=FakePerkService(self.perks))
        assert service.get_killers(self.user_id) == ["Animatronic", "Nurse", "Trapper", "Wraith"]
