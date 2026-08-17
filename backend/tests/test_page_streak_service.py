import unittest
from sqlalchemy import select
from app import create_app
from app.extensions import db
from app.models import Character, Perk
from app.services.user_service import UserService
from app.services.ownership_service import OwnershipService
from app.services.page_streak_service import PageStreakService

GENERAL_CHARACTER = "General"


class FakePerkService:
    """Deterministic stand-in for PerkService so tests do not depend on scraped data."""

    def __init__(self, perks):
        self._perks = perks

    def get_perks(self, category=None, limit=None, **kwargs):
        data = [p for p in self._perks if category is None or p["category"] == category]
        return {"data": data, "pagination": {"total": len(data)}}


class ClampingFakePerkService:
    """Mimics production PerkService.get_perks pagination behaviour: it clamps
    `limit` to 200, slices by `page`, and reports the true `total` in
    `pagination`. Used to catch truncation bugs that FakePerkService (which
    ignores `limit` entirely) cannot detect."""

    def __init__(self, perks):
        self._perks = perks

    def get_perks(self, category=None, page=1, limit=50, **kwargs):
        data = [p for p in self._perks if category is None or p["category"] == category]
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
    """Supplies character records carrying release numbers."""

    def __init__(self, perks, characters):
        super().__init__(perks)
        self._characters = characters

    def get_characters(self, category=None):
        if category is None:
            return list(self._characters)
        return [c for c in self._characters if c.get("category") == category]


def make_perks(count, category="Killer", character="Trapper", start=1):
    # Names are zero-padded so code-point order is also numeric order.
    return [
        {
            "name": f"Perk {i:03d}",
            "character": character,
            "category": category,
        }
        for i in range(start, start + count)
    ]


def seed_perks(perks):
    """Create matching Character + Perk DB rows for a list of perk dicts,
    so OwnershipService (which reads real Character/Perk tables) can see them."""
    char_cache = {}
    for p in perks:
        char_name = p.get("character")
        character = None
        if char_name and char_name != GENERAL_CHARACTER:
            character = char_cache.get(char_name)
            if character is None:
                character = db.session.scalars(
                    select(Character).where(Character.name == char_name)
                ).first()
                if character is None:
                    character = Character(name=char_name, role=p["category"])
                    db.session.add(character)
                    db.session.flush()
                char_cache[char_name] = character
        db.session.add(Perk(
            name=p["name"],
            character_id=character.id if character else None,
            is_teachable=True,
            category=p["category"],
        ))
    db.session.commit()


def seed_killers(names):
    for name in names:
        if db.session.scalars(select(Character).where(Character.name == name)).first():
            continue
        db.session.add(Character(name=name, role="Killer"))
    db.session.commit()


class PageStreakTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def register_user(self, username):
        user, err = self.user_service.register_user(username, f"{username}@test.com", "password123")
        self.assertIsNone(err)
        return user.id

    def lock_perk(self, user_id, perk_name):
        perk = db.session.scalars(select(Perk).where(Perk.name == perk_name)).first()
        self.ownership_service.set_perk_ownership(user_id, perk.id, is_unlocked=False)


class TestPageStreakPool(PageStreakTestCase):
    def setUp(self):
        super().setUp()
        self.perks = make_perks(33) + make_perks(5, category="Survivor", character="Meg", start=101)
        seed_perks(self.perks)
        self.user_id = self.register_user("pooluser")
        self.service = PageStreakService(perk_service=FakePerkService(self.perks))

    def test_pool_contains_only_killer_perks_sorted_by_name(self):
        pool = self.service.get_pool(self.user_id)
        self.assertEqual(len(pool), 33)
        self.assertTrue(all(p["category"] == "Killer" for p in pool))
        names = [p["name"] for p in pool]
        self.assertEqual(names, sorted(names))

    def test_build_pages_chunks_by_fifteen_with_short_last_page(self):
        pages = self.service.build_pages(self.user_id)
        self.assertEqual(len(pages), 3)
        self.assertEqual(len(pages[0]), 15)
        self.assertEqual(len(pages[1]), 15)
        self.assertEqual(len(pages[2]), 3)
        self.assertEqual(pages[0][0], "Perk 001")
        self.assertEqual(pages[2][-1], "Perk 033")

    def test_locked_perks_shrink_pool_and_page_count(self):
        for i in range(1, 4):
            self.lock_perk(self.user_id, f"Perk {i:03d}")
        pool = self.service.get_pool(self.user_id)
        self.assertEqual(len(pool), 30)
        pages = self.service.build_pages(self.user_id)
        self.assertEqual(len(pages), 2)
        self.assertEqual(pages[0][0], "Perk 004")

    def test_pool_is_per_user(self):
        other_user_id = self.register_user("otheruser")
        self.lock_perk(self.user_id, "Perk 001")
        self.assertEqual(len(self.service.get_pool(self.user_id)), 32)
        self.assertEqual(len(self.service.get_pool(other_user_id)), 33)

    def test_pool_shorter_than_one_page_yields_single_short_page(self):
        keep = {"Perk 001", "Perk 002"}
        for p in self.perks:
            if p["category"] == "Killer" and p["name"] not in keep:
                self.lock_perk(self.user_id, p["name"])
        pages = self.service.build_pages(self.user_id)
        self.assertEqual(pages, [["Perk 001", "Perk 002"]])


class TestPageStreakPoolPagination(PageStreakTestCase):
    """Regression coverage for the pool-truncation bug: PerkService.get_perks
    clamps `limit` to 200 server-side, so _all_killer_perks() must page
    through the full result set rather than requesting one huge page."""

    def setUp(self):
        super().setUp()
        self.perks = make_perks(250)
        seed_perks(self.perks)
        self.user_id = self.register_user("paginationuser")
        self.service = PageStreakService(perk_service=ClampingFakePerkService(self.perks))

    def test_get_pool_returns_all_perks_beyond_the_200_page_clamp(self):
        pool = self.service.get_pool(self.user_id)
        self.assertEqual(len(pool), 250)
        names = {p["name"] for p in pool}
        self.assertEqual(names, {p["name"] for p in self.perks})

    def test_build_pages_covers_every_perk_beyond_the_200_page_clamp(self):
        pages = self.service.build_pages(self.user_id)
        flattened = [name for page in pages for name in page]
        self.assertEqual(len(flattened), 250)
        self.assertEqual(sorted(flattened), sorted(p["name"] for p in self.perks))


class TestPageStreakRoster(PageStreakTestCase):
    def setUp(self):
        super().setUp()
        self.perks = (
            make_perks(20, character="Trapper")
            + make_perks(10, character="Nurse")
            + make_perks(5, character=GENERAL_CHARACTER)
            + make_perks(4, category="Survivor", character="Meg")
        )
        # Give every perk a unique name so the pool has 35 killer perks.
        for i, perk in enumerate(self.perks, start=1):
            perk["name"] = f"Perk {i:03d}"
        seed_perks(self.perks)
        self.user_id = self.register_user("rosteruser")
        self.service = PageStreakService(perk_service=FakePerkService(self.perks))

    def test_roster_lists_owned_killers_only(self):
        roster = self.service.get_roster(self.user_id)
        names = [entry["killer"] for entry in roster]
        self.assertEqual(names, ["Nurse", "Trapper"])
        self.assertTrue(all(entry["status"] == "not_started" for entry in roster))
        self.assertEqual(roster[0]["page_count"], 3)  # 35 killer perks incl. General

    def test_locked_killer_is_excluded_from_roster(self):
        trapper = db.session.scalars(select(Character).where(Character.name == "Trapper")).first()
        self.ownership_service.set_character_ownership(self.user_id, trapper.id, is_owned=False)
        names = [entry["killer"] for entry in self.service.get_roster(self.user_id)]
        self.assertEqual(names, ["Nurse"])

    def test_start_run_snapshot_at_is_utc_iso_with_z_suffix(self):
        run = self.service.start_run(self.user_id, "Nurse")
        self.assertIsNotNone(run["snapshot_at"])
        self.assertTrue(run["snapshot_at"].endswith("Z"))

    def test_start_run_freezes_snapshot(self):
        run = self.service.start_run(self.user_id, "Nurse")
        self.assertEqual(run["status"], "in_progress")
        self.assertEqual(run["current_page"], 1)
        self.assertEqual(run["attempt"], 1)
        self.assertEqual(run["best_page"], 0)
        self.assertEqual(run["page_count"], 3)
        self.assertEqual(len(run["pages"][0]), 15)

        # Locking perks afterwards must not touch the frozen run.
        for i in range(1, 21):
            self.lock_perk(self.user_id, f"Perk {i:03d}")
        reloaded = self.service.get_run(self.user_id, "Nurse")
        self.assertEqual(reloaded["page_count"], 3)
        self.assertEqual(len(reloaded["pages"][0]), 15)

    def test_start_run_twice_is_rejected(self):
        self.service.start_run(self.user_id, "Nurse")
        with self.assertRaises(ValueError):
            self.service.start_run(self.user_id, "Nurse")

    def test_start_run_rejects_unknown_killer(self):
        with self.assertRaises(ValueError):
            self.service.start_run(self.user_id, "Not A Killer")

    def test_get_run_returns_none_when_not_started(self):
        self.assertIsNone(self.service.get_run(self.user_id, "Trapper"))

    def test_roster_reflects_started_run(self):
        self.service.start_run(self.user_id, "Nurse")
        roster = {entry["killer"]: entry for entry in self.service.get_roster(self.user_id)}
        self.assertEqual(roster["Nurse"]["status"], "in_progress")
        self.assertEqual(roster["Nurse"]["current_page"], 1)
        self.assertEqual(roster["Trapper"]["status"], "not_started")

    def test_runs_are_isolated_per_user(self):
        other_user_id = self.register_user("otherrosteruser")
        self.service.start_run(self.user_id, "Nurse")
        self.assertIsNone(self.service.get_run(other_user_id, "Nurse"))
        other_roster = {e["killer"]: e for e in self.service.get_roster(other_user_id)}
        self.assertEqual(other_roster["Nurse"]["status"], "not_started")


class TestPageStreakResults(PageStreakTestCase):
    def setUp(self):
        super().setUp()
        self.perks = make_perks(32, character="Nurse")
        seed_perks(self.perks)
        self.user_id = self.register_user("resultsuser")
        self.service = PageStreakService(perk_service=FakePerkService(self.perks))
        self.run = self.service.start_run(self.user_id, "Nurse")

    def build_for(self, page_number):
        page = self.run["pages"][page_number - 1]
        return page[:self.service.expected_build_size(page)]

    def test_win_advances_to_next_page_and_records_best(self):
        updated = self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.assertEqual(updated["current_page"], 2)
        self.assertEqual(updated["best_page"], 1)
        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(len(updated["history"]), 1)
        self.assertEqual(updated["history"][0]["result"], "win")
        self.assertEqual(updated["history"][0]["page_number"], 1)

    def test_winning_last_page_completes_the_run(self):
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        updated = self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        self.assertEqual(updated["status"], "completed")
        self.assertEqual(updated["best_page"], 3)
        self.assertEqual(updated["current_page"], updated["page_count"])

    def test_loss_resets_page_keeps_history_and_best(self):
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        updated = self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "loss")
        self.assertEqual(updated["current_page"], 1)
        self.assertEqual(updated["attempt"], 2)
        self.assertEqual(updated["best_page"], 1)
        self.assertEqual(len(updated["history"]), 2)
        self.assertEqual(updated["pages"], self.run["pages"])  # snapshot survives a loss

    def test_short_last_page_accepts_a_short_build(self):
        page3 = self.run["pages"][2]
        self.assertEqual(len(page3), 2)
        self.assertEqual(self.service.expected_build_size(page3), 2)
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        updated = self.service.submit_result(self.user_id, "Nurse", 3, page3, "win")
        self.assertEqual(updated["status"], "completed")

    def test_rejects_wrong_page(self):
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")

    def test_rejects_perk_from_another_page(self):
        bad = self.build_for(1)[:3] + [self.run["pages"][1][0]]
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, bad, "win")

    def test_rejects_wrong_perk_count(self):
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1)[:3], "win")

    def test_rejects_duplicate_perks(self):
        first = self.run["pages"][0][0]
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, [first, first, first, first], "win")

    def test_rejects_invalid_result_value(self):
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "draw")

    def test_rejects_result_on_completed_run(self):
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")

    def test_reset_restarts_with_fresh_snapshot_and_keeps_history(self):
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        for i in range(1, 18):
            self.lock_perk(self.user_id, f"Perk {i:03d}")
        updated = self.service.reset_run(self.user_id, "Nurse")
        self.assertEqual(updated["current_page"], 1)
        self.assertEqual(updated["attempt"], 2)
        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(updated["page_count"], 1)  # 15 perks left -> one page
        self.assertEqual(len(updated["history"]), 1)
        self.assertEqual(updated["best_page"], 1)

    def test_reset_reopens_a_completed_run(self):
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        updated = self.service.reset_run(self.user_id, "Nurse")
        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(updated["current_page"], 1)

    def test_reset_without_a_run_is_rejected(self):
        with self.assertRaises(ValueError):
            self.service.reset_run(self.user_id, "Trapper")


class TestPageStreakRosterOrder(PageStreakTestCase):
    def setUp(self):
        super().setUp()
        perks = []
        for killer in ["Wraith", "Trapper", "Nurse", "Animatronic"]:
            perks.extend(make_perks(2, character=killer))
        for i, perk in enumerate(perks, start=1):
            perk["name"] = f"Perk {i:03d}"
        seed_perks(perks)
        seed_killers(["Wraith", "Trapper", "Nurse", "Animatronic"])
        self.user_id = self.register_user("orderuser")

        # Deliberately out of order in the list, and Animatronic has no release record at all.
        characters = [
            {"name": "Nurse", "category": "Killer", "release_number": 4},
            {"name": "Trapper", "category": "Killer", "release_number": 1},
            {"name": "Wraith", "category": "Killer", "release_number": 2},
            {"name": "Meg Thomas", "category": "Survivor", "release_number": 2},
        ]
        self.perks = perks
        self.characters = characters
        self.service = PageStreakService(perk_service=OrderedFakePerkService(perks, characters))

    def test_killers_are_ordered_by_release_number(self):
        self.assertEqual(
            self.service.get_killers(self.user_id),
            ["Trapper", "Wraith", "Nurse", "Animatronic"],
        )

    def test_killer_without_a_release_number_is_kept_at_the_end(self):
        self.assertIn("Animatronic", self.service.get_killers(self.user_id))

    def test_roster_uses_the_same_order(self):
        self.assertEqual(
            [entry["killer"] for entry in self.service.get_roster(self.user_id)],
            ["Trapper", "Wraith", "Nurse", "Animatronic"],
        )

    def test_falls_back_to_alphabetical_order_without_release_numbers(self):
        # A perk_service without get_characters() means _release_numbers() is empty;
        # ordering should still succeed for the DB-driven killer list, alphabetically.
        service = PageStreakService(perk_service=FakePerkService(self.perks))
        self.assertEqual(
            service.get_killers(self.user_id),
            ["Animatronic", "Nurse", "Trapper", "Wraith"],
        )


if __name__ == "__main__":
    unittest.main()
