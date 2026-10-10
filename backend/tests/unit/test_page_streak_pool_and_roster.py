# backend/tests/unit/test_page_streak_pool_and_roster.py
"""Page-streak perk pool, pagination and roster / run start."""
import pytest
from sqlalchemy import select
from app.models import Killer, Perk
from app.services.user_service import UserService
from app.services.ownership_service import OwnershipService
from app.services.page_streak_service import PageStreakService
from tests.unit.page_streak_support import (
    GENERAL_CHARACTER,
    FakePerkService,
    ClampingFakePerkService,
    make_perks,
    seed_perks,
)
from tests.unit.page_streak_support import (  # noqa: F401  (pytest fixtures)
    user_service,
    ownership_service,
    streak_user,
)


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

        trapper = db.session.scalars(select(Killer).where(Killer.name == "Trapper")).first()
        ownership_service.set_character_ownership(self.user_id, trapper.id, is_owned=False, role="Killer")
        names = [entry["killer"] for entry in self.service.get_roster(self.user_id)]
        assert names == ["Nurse"]

    def test_start_run_snapshot_at_is_utc_iso_with_z_suffix(self) -> None:
        run = self.service.start_run(self.user_id, "Nurse")
        assert run["snapshot_at"] is not None
        assert run["snapshot_at"].endswith("Z")
        assert "+00:00" not in run["snapshot_at"]
        from datetime import datetime
        datetime.fromisoformat(run["snapshot_at"].replace("Z", "+00:00"))  # must parse cleanly

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
