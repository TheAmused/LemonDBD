# backend/tests/unit/test_chaos_roller.py
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk
from app.services.chaos.constants import (
    ADDON_RARITY_POOL,
    CHAOS_CHECKPOINT_INTERVAL,
    DIFFICULTIES,
    checkpoint_interval,
)
from app.services.chaos.roller import draw_addon_rarities, draw_chaos_perks, resolve_perks_by_names


class TestChaosConstants(unittest.TestCase):
    def test_checkpoint_interval_per_difficulty(self):
        self.assertEqual(checkpoint_interval("easy"), 5)
        self.assertEqual(checkpoint_interval("medium"), 10)
        self.assertEqual(checkpoint_interval("hell"), 0)

    def test_checkpoint_interval_unknown_defaults_to_zero(self):
        self.assertEqual(checkpoint_interval("nonsense"), 0)

    def test_difficulties_tuple(self):
        self.assertEqual(DIFFICULTIES, ("easy", "medium", "hell"))

    def test_addon_rarity_pool_excludes_event(self):
        self.assertNotIn("Event", ADDON_RARITY_POOL)
        self.assertEqual(
            set(ADDON_RARITY_POOL),
            {"Common", "Uncommon", "Rare", "Very Rare", "Ultra Rare"},
        )


class TestDrawAddonRarities(unittest.TestCase):
    def test_always_returns_two(self):
        for _ in range(20):
            rarities = draw_addon_rarities()
            self.assertEqual(len(rarities), 2)
            for r in rarities:
                self.assertIn(r, ADDON_RARITY_POOL)

    def test_duplicates_are_possible_over_many_draws(self):
        # Not guaranteed on any single draw, but overwhelmingly likely across 200.
        saw_duplicate = False
        for _ in range(200):
            a, b = draw_addon_rarities()
            if a == b:
                saw_duplicate = True
                break
        self.assertTrue(saw_duplicate)


def _perk(name):
    return {"id": hash(name) % 100000, "name": name, "category": "Killer"}


class TestDrawChaosPerks(unittest.TestCase):
    def test_draws_four_perks(self):
        pool = [_perk(f"Perk {i}") for i in range(10)]
        drawn, used = draw_chaos_perks(pool, [])
        self.assertEqual(len(drawn), 4)
        self.assertEqual(len(used), 4)

    def test_no_repeats_within_a_draw_when_pool_is_large_enough(self):
        pool = [_perk(f"Perk {i}") for i in range(10)]
        drawn, _ = draw_chaos_perks(pool, [])
        names = [p["name"] for p in drawn]
        self.assertEqual(len(names), len(set(names)))

    def test_respects_already_used_perks(self):
        pool = [_perk(f"Perk {i}") for i in range(6)]
        already_used = [p["name"] for p in pool[:4]]
        drawn, updated_used = draw_chaos_perks(pool, already_used)
        drawn_names = {p["name"] for p in drawn}
        # Only 2 perks were not yet used, so the pool must refill mid-draw,
        # meaning drawn perks may include names from `already_used` again.
        self.assertEqual(len(drawn), 4)
        self.assertGreaterEqual(len(updated_used), 1)
        # But at least the 2 previously-unused perks were drawn first.
        previously_unused = {p["name"] for p in pool[4:]}
        self.assertTrue(previously_unused.issubset(drawn_names))

    def test_refills_when_pool_fully_exhausted_mid_draw(self):
        pool = [_perk("Only Perk")]
        drawn, updated_used = draw_chaos_perks(pool, [])
        self.assertEqual(len(drawn), 4)
        self.assertTrue(all(p["name"] == "Only Perk" for p in drawn))
        # The pool (size 1) was exhausted and refilled 3 times after the
        # first draw, so used_perk_names ends up holding just the one name.
        self.assertEqual(updated_used, ["Only Perk"])

    def test_empty_pool_returns_nothing(self):
        drawn, updated_used = draw_chaos_perks([], [])
        self.assertEqual(drawn, [])
        self.assertEqual(updated_used, [])


class TestResolvePerksByNames(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        character = Character(name="The Trapper", role="Killer")
        db.session.add(character)
        db.session.flush()
        db.session.add(Perk(name="Brutal Strength", character_id=character.id, is_teachable=True, category="Killer"))
        db.session.add(Perk(name="Unnerving Presence", character_id=None, is_teachable=False, category="Killer"))
        db.session.add(Perk(name="Iron Will", character_id=None, is_teachable=False, category="Survivor"))
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_resolves_names_to_full_objects_in_order(self):
        result = resolve_perks_by_names(["Unnerving Presence", "Brutal Strength"])
        self.assertEqual([p["name"] for p in result], ["Unnerving Presence", "Brutal Strength"])
        self.assertIn("icon_local_path", result[0])

    def test_filters_by_killer_category(self):
        # "Iron Will" is a Survivor perk -- resolving it through the killer
        # perk pool lookup must not return it even if the name is passed in.
        result = resolve_perks_by_names(["Iron Will"])
        self.assertEqual(result, [])

    def test_unknown_name_is_silently_dropped(self):
        result = resolve_perks_by_names(["Brutal Strength", "Does Not Exist"])
        self.assertEqual([p["name"] for p in result], ["Brutal Strength"])

    def test_empty_input_returns_empty_list(self):
        self.assertEqual(resolve_perks_by_names([]), [])


if __name__ == "__main__":
    unittest.main()
