import os
import unittest
from app.services.db_service import DatabaseService
from app.services.page_streak_service import PageStreakService


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


def make_perks(count, category="Killer", character="Trapper"):
    # Names are zero-padded so code-point order is also numeric order.
    return [
        {
            "name": f"Perk {i:03d}",
            "character": character,
            "category": category,
            "icon_local_path": f"icons/killers/{character}/perk_{i:03d}.png",
        }
        for i in range(1, count + 1)
    ]


class TestPageStreakPool(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_page_streak_service.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.perks = make_perks(33) + make_perks(5, category="Survivor", character="Meg")
        self.service = PageStreakService(
            db_service=self.db_service,
            perk_service=FakePerkService(self.perks),
        )

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_pool_contains_only_killer_perks_sorted_by_name(self):
        pool = self.service.get_pool()
        self.assertEqual(len(pool), 33)
        self.assertTrue(all(p["category"] == "Killer" for p in pool))
        names = [p["name"] for p in pool]
        self.assertEqual(names, sorted(names))

    def test_build_pages_chunks_by_fifteen_with_short_last_page(self):
        pages = self.service.build_pages()
        self.assertEqual(len(pages), 3)
        self.assertEqual(len(pages[0]), 15)
        self.assertEqual(len(pages[1]), 15)
        self.assertEqual(len(pages[2]), 3)
        self.assertEqual(pages[0][0], "Perk 001")
        self.assertEqual(pages[2][-1], "Perk 033")

    def test_excluded_perks_shrink_pool_and_page_count(self):
        result = self.service.set_excluded_perks([f"Perk {i:03d}" for i in range(1, 4)])
        self.assertEqual(result["pool_size"], 30)
        self.assertEqual(result["page_count"], 2)
        self.assertEqual(self.service.get_excluded_perks(), ["Perk 001", "Perk 002", "Perk 003"])
        pages = self.service.build_pages()
        self.assertEqual(len(pages), 2)
        self.assertEqual(pages[0][0], "Perk 004")

    def test_set_excluded_perks_replaces_previous_list(self):
        self.service.set_excluded_perks(["Perk 001"])
        self.service.set_excluded_perks(["Perk 002"])
        self.assertEqual(self.service.get_excluded_perks(), ["Perk 002"])

    def test_pool_shorter_than_one_page_yields_single_short_page(self):
        keep = {"Perk 001", "Perk 002"}
        self.service.set_excluded_perks([p["name"] for p in self.perks
                                         if p["category"] == "Killer" and p["name"] not in keep])
        pages = self.service.build_pages()
        self.assertEqual(pages, [["Perk 001", "Perk 002"]])


class TestPageStreakPoolPagination(unittest.TestCase):
    """Regression coverage for the pool-truncation bug: PerkService.get_perks
    clamps `limit` to 200 server-side, so _all_killer_perks() must page
    through the full result set rather than requesting one huge page."""

    def setUp(self):
        self.db_path = "test_page_streak_pagination.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.perks = make_perks(250)
        self.service = PageStreakService(
            db_service=self.db_service,
            perk_service=ClampingFakePerkService(self.perks),
        )

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_get_pool_returns_all_perks_beyond_the_200_page_clamp(self):
        pool = self.service.get_pool()
        self.assertEqual(len(pool), 250)
        names = {p["name"] for p in pool}
        self.assertEqual(names, {p["name"] for p in self.perks})

    def test_build_pages_covers_every_perk_beyond_the_200_page_clamp(self):
        pages = self.service.build_pages()
        flattened = [name for page in pages for name in page]
        self.assertEqual(len(flattened), 250)
        self.assertEqual(sorted(flattened), sorted(p["name"] for p in self.perks))


class TestPageStreakRoster(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_page_streak_roster.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.perks = (
            make_perks(20, character="Trapper")
            + make_perks(10, character="Nurse")
            + make_perks(5, character="General")
            + make_perks(4, category="Survivor", character="Meg")
        )
        # Give every perk a unique name so the pool has 35 killer perks.
        for i, perk in enumerate(self.perks, start=1):
            perk["name"] = f"Perk {i:03d}"
        self.service = PageStreakService(
            db_service=self.db_service,
            perk_service=FakePerkService(self.perks),
        )

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_roster_lists_killers_without_general_or_survivors(self):
        roster = self.service.get_roster()
        names = [entry["killer"] for entry in roster]
        self.assertEqual(names, ["Nurse", "Trapper"])
        self.assertTrue(all(entry["status"] == "not_started" for entry in roster))
        self.assertEqual(roster[0]["page_count"], 3)  # 35 killer perks incl. General

    def test_start_run_snapshot_at_is_utc_iso_with_z_suffix(self):
        run = self.service.start_run("Nurse")
        self.assertIsNotNone(run["snapshot_at"])
        self.assertTrue(run["snapshot_at"].endswith("Z"))

    def test_start_run_freezes_snapshot(self):
        run = self.service.start_run("Nurse")
        self.assertEqual(run["status"], "in_progress")
        self.assertEqual(run["current_page"], 1)
        self.assertEqual(run["attempt"], 1)
        self.assertEqual(run["best_page"], 0)
        self.assertEqual(run["page_count"], 3)
        self.assertEqual(len(run["pages"][0]), 15)

        # Excluding perks afterwards must not touch the frozen run.
        self.service.set_excluded_perks([f"Perk {i:03d}" for i in range(1, 21)])
        reloaded = self.service.get_run("Nurse")
        self.assertEqual(reloaded["page_count"], 3)
        self.assertEqual(len(reloaded["pages"][0]), 15)

    def test_start_run_twice_is_rejected(self):
        self.service.start_run("Nurse")
        with self.assertRaises(ValueError):
            self.service.start_run("Nurse")

    def test_start_run_rejects_unknown_killer(self):
        with self.assertRaises(ValueError):
            self.service.start_run("Not A Killer")

    def test_get_run_returns_none_when_not_started(self):
        self.assertIsNone(self.service.get_run("Trapper"))

    def test_roster_reflects_started_run(self):
        self.service.start_run("Nurse")
        roster = {entry["killer"]: entry for entry in self.service.get_roster()}
        self.assertEqual(roster["Nurse"]["status"], "in_progress")
        self.assertEqual(roster["Nurse"]["current_page"], 1)
        self.assertEqual(roster["Trapper"]["status"], "not_started")


class TestPageStreakResults(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_page_streak_results.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.perks = make_perks(32, character="Nurse")
        self.service = PageStreakService(
            db_service=self.db_service,
            perk_service=FakePerkService(self.perks),
        )
        self.run = self.service.start_run("Nurse")

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def build_for(self, page_number):
        page = self.run["pages"][page_number - 1]
        return page[:self.service.expected_build_size(page)]

    def test_win_advances_to_next_page_and_records_best(self):
        updated = self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        self.assertEqual(updated["current_page"], 2)
        self.assertEqual(updated["best_page"], 1)
        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(len(updated["history"]), 1)
        self.assertEqual(updated["history"][0]["result"], "win")
        self.assertEqual(updated["history"][0]["page_number"], 1)

    def test_winning_last_page_completes_the_run(self):
        self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        self.service.submit_result("Nurse", 2, self.build_for(2), "win")
        updated = self.service.submit_result("Nurse", 3, self.build_for(3), "win")
        self.assertEqual(updated["status"], "completed")
        self.assertEqual(updated["best_page"], 3)
        self.assertEqual(updated["current_page"], updated["page_count"])

    def test_loss_resets_page_keeps_history_and_best(self):
        self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        updated = self.service.submit_result("Nurse", 2, self.build_for(2), "loss")
        self.assertEqual(updated["current_page"], 1)
        self.assertEqual(updated["attempt"], 2)
        self.assertEqual(updated["best_page"], 1)
        self.assertEqual(len(updated["history"]), 2)
        self.assertEqual(updated["pages"], self.run["pages"])  # snapshot survives a loss

    def test_short_last_page_accepts_a_short_build(self):
        page3 = self.run["pages"][2]
        self.assertEqual(len(page3), 2)
        self.assertEqual(self.service.expected_build_size(page3), 2)
        self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        self.service.submit_result("Nurse", 2, self.build_for(2), "win")
        updated = self.service.submit_result("Nurse", 3, page3, "win")
        self.assertEqual(updated["status"], "completed")

    def test_rejects_wrong_page(self):
        with self.assertRaises(ValueError):
            self.service.submit_result("Nurse", 2, self.build_for(2), "win")

    def test_rejects_perk_from_another_page(self):
        bad = self.build_for(1)[:3] + [self.run["pages"][1][0]]
        with self.assertRaises(ValueError):
            self.service.submit_result("Nurse", 1, bad, "win")

    def test_rejects_wrong_perk_count(self):
        with self.assertRaises(ValueError):
            self.service.submit_result("Nurse", 1, self.build_for(1)[:3], "win")

    def test_rejects_duplicate_perks(self):
        first = self.run["pages"][0][0]
        with self.assertRaises(ValueError):
            self.service.submit_result("Nurse", 1, [first, first, first, first], "win")

    def test_rejects_invalid_result_value(self):
        with self.assertRaises(ValueError):
            self.service.submit_result("Nurse", 1, self.build_for(1), "draw")

    def test_rejects_result_on_completed_run(self):
        self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        self.service.submit_result("Nurse", 2, self.build_for(2), "win")
        self.service.submit_result("Nurse", 3, self.build_for(3), "win")
        with self.assertRaises(ValueError):
            self.service.submit_result("Nurse", 3, self.build_for(3), "win")

    def test_reset_restarts_with_fresh_snapshot_and_keeps_history(self):
        self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        self.service.set_excluded_perks([f"Perk {i:03d}" for i in range(1, 18)])
        updated = self.service.reset_run("Nurse")
        self.assertEqual(updated["current_page"], 1)
        self.assertEqual(updated["attempt"], 2)
        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(updated["page_count"], 1)  # 15 perks left -> one page
        self.assertEqual(len(updated["history"]), 1)
        self.assertEqual(updated["best_page"], 1)

    def test_reset_reopens_a_completed_run(self):
        self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        self.service.submit_result("Nurse", 2, self.build_for(2), "win")
        self.service.submit_result("Nurse", 3, self.build_for(3), "win")
        updated = self.service.reset_run("Nurse")
        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(updated["current_page"], 1)

    def test_reset_without_a_run_is_rejected(self):
        with self.assertRaises(ValueError):
            self.service.reset_run("Trapper")


class OrderedFakePerkService(FakePerkService):
    """Adds a scrape-ordered character list so roster ordering can be exercised."""

    def __init__(self, perks, characters):
        super().__init__(perks)
        self._characters = characters

    def get_characters_in_scrape_order(self):
        return list(self._characters)


class TestPageStreakRosterOrder(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_page_streak_order.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()

        perks = []
        for killer in ["Wraith", "Trapper", "Nurse", "Animatronic"]:
            perks.extend(make_perks(2, character=killer))
        # make_perks reuses names, so give every perk a unique one.
        for i, perk in enumerate(perks, start=1):
            perk["name"] = f"Perk {i:03d}"

        # Scrape order: Trapper before Wraith before Nurse. Animatronic is absent
        # from the character list entirely, which is the real 5-killer edge case.
        characters = [
            {"name": "The Trapper", "category": "Survivor"},
            {"name": "Trapper", "category": "Survivor"},
            {"name": "The Wraith", "category": "Survivor"},
            {"name": "Nurse", "category": "Survivor"},
        ]

        self.service = PageStreakService(
            db_service=self.db_service,
            perk_service=OrderedFakePerkService(perks, characters),
        )

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_killers_follow_character_list_order(self):
        self.assertEqual(self.service.get_killers(), ["Trapper", "Wraith", "Nurse", "Animatronic"])

    def test_killer_missing_from_character_list_is_kept_at_the_end(self):
        self.assertIn("Animatronic", self.service.get_killers())

    def test_roster_uses_the_same_order(self):
        self.assertEqual(
            [entry["killer"] for entry in self.service.get_roster()],
            ["Trapper", "Wraith", "Nurse", "Animatronic"],
        )

    def test_ordering_survives_a_perk_service_without_characters(self):
        service = PageStreakService(
            db_service=self.db_service,
            perk_service=FakePerkService(make_perks(3, character="Nurse")),
        )
        self.assertEqual(service.get_killers(), ["Nurse"])


if __name__ == "__main__":
    unittest.main()
