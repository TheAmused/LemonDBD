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


if __name__ == "__main__":
    unittest.main()
