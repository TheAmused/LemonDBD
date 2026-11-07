# backend/tests/unit/streaks/test_page_streak_pool_and_roster.py
"""Page-streak perk pool, pagination and roster / run start."""
import pytest
from sqlalchemy import select
from app.models import Killer, Perk
from app.services.user import UserService
from app.services.ownership_service import OwnershipService
from app.services.page_streak import PageStreakService
from tests.unit.streaks.page_streak_support import (
    GENERAL_CHARACTER,
    FakePerkService,
    ClampingFakePerkService,
    make_perks,
    seed_perks,
)
from tests.unit.streaks.page_streak_support import (  # noqa: F401  (pytest fixtures)
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

        other_user, _ = user_service.register_user("other_streak_user", "other_streak_user", "other_s@test.com", "Pass123!")
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

    def test_roster_lists_every_killer_and_marks_the_owned_ones(self) -> None:
        roster = self.service.get_roster(self.user_id)
        names = [entry["killer"] for entry in roster]
        assert names == ["Nurse", "Trapper"]
        assert all(entry["status"] == "not_started" and entry["owned"] for entry in roster)
        assert roster[0]["page_count"] == 3

    def test_a_killer_the_player_does_not_have_stays_on_the_roster_as_not_owned(self, ownership_service: OwnershipService) -> None:
        from app.core.extensions import db

        trapper = db.session.scalars(select(Killer).where(Killer.name == "Trapper")).first()
        ownership_service.set_character_ownership(self.user_id, trapper.id, is_owned=False, role="Killer")
        owned = {entry["killer"]: entry["owned"] for entry in self.service.get_roster(self.user_id)}
        assert owned == {"Nurse": True, "Trapper": False}
        assert self.service.get_killers(self.user_id) == ["Nurse"]

    def test_a_disabled_killer_stays_on_the_roster_marked_but_cannot_be_played(self) -> None:
        from app.core.extensions import db
        from app.services.admin_control_service import set_character_disabled

        trapper = db.session.scalars(select(Killer).where(Killer.name == "Trapper")).first()
        set_character_disabled(trapper.id, True, "power is bugged", "Killer")

        roster = {entry["killer"]: entry for entry in self.service.get_roster(self.user_id)}
        assert list(roster) == ["Nurse", "Trapper"]
        assert (roster["Trapper"]["disabled"], roster["Trapper"]["disabled_reason"]) == (True, "power is bugged")
        assert roster["Nurse"]["disabled"] is False
        assert self.service.get_killers(self.user_id) == ["Nurse"]
        with pytest.raises(ValueError):
            self.service.start_run(self.user_id, "Trapper")

    def test_start_run_snapshot_at_is_utc_iso_with_z_suffix(self) -> None:
        run = self.service.start_run(self.user_id, "Nurse")
        assert run["snapshot_at"] is not None
        assert run["snapshot_at"].endswith("Z")
        assert "+00:00" not in run["snapshot_at"]
        from datetime import datetime
        datetime.fromisoformat(run["snapshot_at"].replace("Z", "+00:00"))  # must parse cleanly

    def test_a_new_run_follows_the_live_pool_until_the_build_is_locked(self, ownership_service: OwnershipService) -> None:
        from app.core.extensions import db

        run = self.service.start_run(self.user_id, "Nurse")
        assert (run["status"], run["current_page"], run["attempt"], run["best_page"]) == ("in_progress", 1, 1, 0)
        assert run["pool_frozen"] is False
        assert run["page_count"] == 3

        for i in range(1, 21):
            perk = db.session.scalars(select(Perk).where(Perk.name == f"Perk {i:03d}")).first()
            ownership_service.set_perk_ownership(self.user_id, perk.id, is_unlocked=False)
        shrunk = self.service.get_run(self.user_id, "Nurse")
        assert (shrunk["pool_frozen"], shrunk["page_count"]) == (False, 1)

    def test_locking_the_build_freezes_the_pool(self, ownership_service: OwnershipService) -> None:
        from app.core.extensions import db

        self.service.start_run(self.user_id, "Nurse")
        run = self.service.lock_pages(self.user_id, "Nurse")
        assert run["pool_frozen"] is True
        assert run["page_count"] == 3
        assert len(run["pages"][0]) == 15

        for i in range(1, 21):
            perk = db.session.scalars(select(Perk).where(Perk.name == f"Perk {i:03d}")).first()
            ownership_service.set_perk_ownership(self.user_id, perk.id, is_unlocked=False)

        reloaded = self.service.get_run(self.user_id, "Nurse")
        assert reloaded["page_count"] == 3
        assert len(reloaded["pages"][0]) == 15

    def test_frozen_pages_keep_their_icons_after_a_killer_is_locked(self, ownership_service: OwnershipService) -> None:
        from app.core.extensions import db

        for perk in self.perks:
            perk["icon_local_path"] = f"icons/{perk['name']}.png"
        self.service.start_run(self.user_id, "Trapper")
        run = self.service.lock_pages(self.user_id, "Trapper")
        on_pages = {name for page in run["pages"] for name in page}
        assert on_pages <= set(run["perk_icons"])

        nurse = db.session.scalars(select(Killer).where(Killer.name == "Nurse")).first()
        ownership_service.set_character_ownership(self.user_id, nurse.id, is_owned=False, role="Killer")
        for perk in db.session.scalars(select(Perk).where(Perk.killer_id == nurse.id)).all():
            ownership_service.set_perk_ownership(self.user_id, perk.id, is_unlocked=False)

        reloaded = self.service.get_run(self.user_id, "Trapper")
        assert {name for page in reloaded["pages"] for name in page} == on_pages
        assert on_pages <= set(reloaded["perk_icons"])

    def test_a_killer_the_player_does_not_have_cannot_be_opened_or_played(self, ownership_service: OwnershipService) -> None:
        from app.core.extensions import db

        self.service.start_run(self.user_id, "Nurse")
        nurse = db.session.scalars(select(Killer).where(Killer.name == "Nurse")).first()
        ownership_service.set_character_ownership(self.user_id, nurse.id, is_owned=False, role="Killer")
        with pytest.raises(ValueError, match="not found"):
            self.service.get_run(self.user_id, "Nurse")
        with pytest.raises(ValueError, match="not found"):
            self.service.submit_result(self.user_id, "Nurse", 1, [], "loss")
        with pytest.raises(ValueError, match="not found"):
            self.service.get_run(self.user_id, "Made Up Killer")

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
        run = self.service.start_run(self.user_id, "Nurse")
        page = run["pages"][0]
        self.service.submit_result(self.user_id, "Nurse", 1, page[: self.service.expected_build_size(page)], "win")
        roster = {entry["killer"]: entry for entry in self.service.get_roster(self.user_id)}
        assert roster["Nurse"]["status"] == "in_progress"
        assert roster["Nurse"]["current_page"] == 2
        assert roster["Trapper"]["status"] == "not_started"

    def test_roster_does_not_count_an_opened_killer_as_started(self) -> None:
        """Opening a killer creates its run, but nothing is started until the first match is played."""
        self.service.start_run(self.user_id, "Nurse")
        roster = {entry["killer"]: entry for entry in self.service.get_roster(self.user_id)}
        assert roster["Nurse"]["status"] == "not_started"

    def test_runs_are_isolated_per_user(self, user_service: UserService) -> None:
        other_user, _ = user_service.register_user("other_roster_user", "other_roster_user", "other_r@test.com", "Pass123!")
        self.service.start_run(self.user_id, "Nurse")
        assert self.service.get_run(other_user.id, "Nurse") is None
        other_roster = {e["killer"]: e for e in self.service.get_roster(other_user.id)}
        assert other_roster["Nurse"]["status"] == "not_started"
