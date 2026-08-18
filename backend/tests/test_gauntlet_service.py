import unittest
from sqlalchemy import select
from app import create_app
from app.config import TestingConfig
from app.extensions import db
from app.models import Character, Perk, Item, Addon
from app.services.user_service import UserService
from app.services.ownership_service import OwnershipService
from app.services.gauntlet_service import GauntletService


def seed_killer(name, perk_count=3):
    character = Character(name=name, role="Killer")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}",
            character_id=character.id,
            is_teachable=True,
            category="Killer",
        ))
    db.session.commit()
    return character


def seed_survivor(name="Meg Thomas", perk_count=1):
    character = Character(name=name, role="Survivor")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}",
            character_id=character.id,
            is_teachable=True,
            category="Survivor",
        ))
    db.session.commit()
    return character


def seed_item_and_addons():
    # `category` mirrors what the live wiki.gg scraper actually stores: the coarse
    # role ("Survivor"), not an item type. The addon pool must be matched by
    # classifying the item type from `name` instead.
    item = Item(name="Commodious Toolbox", category="Survivor", role="Survivor")
    db.session.add(item)
    addon = Addon(
        name="Wire Spool",
        associated_target="Toolboxes",
        category="Survivor",
        description="Increases repair speed.",
    )
    ghost_addon = Addon(
        name="Uncommon Add-ons",
        associated_target="Numbers",
        category="Survivor",
        description="",
    )
    db.session.add_all([addon, ghost_addon])
    db.session.commit()
    return item, addon


def seed_killer_addons(killer_name):
    addon = Addon(
        name=f"{killer_name} Addon",
        associated_target=killer_name,
        category="Killer",
        description="A power add-on.",
    )
    db.session.add(addon)
    db.session.commit()
    return addon


class GauntletTestCase(unittest.TestCase):
    def setUp(self):
        # TestingConfig keeps this on an in-memory SQLite DB. Without it the tests
        # bind to the real DATABASE_URL and tearDown's drop_all() wipes the dev database.
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()
        self.service = GauntletService()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def register_user(self, username):
        user, err = self.user_service.register_user(username, f"{username}@test.com", "password123")
        self.assertIsNone(err)
        return user.id

    def lock_character(self, user_id, character_id):
        self.ownership_service.set_character_ownership(user_id, character_id, is_owned=False)


class TestGauntletTiers(GauntletTestCase):
    def test_survivor_tier_perk_limits(self):
        self.assertEqual(self.service.get_tier_info(0, "survivor")["perk_limit"], 4)
        self.assertEqual(self.service.get_tier_info(9, "survivor")["perk_limit"], 4)
        self.assertEqual(self.service.get_tier_info(10, "survivor")["perk_limit"], 3)
        self.assertEqual(self.service.get_tier_info(20, "survivor")["perk_limit"], 2)
        self.assertEqual(self.service.get_tier_info(30, "survivor")["perk_limit"], 1)
        self.assertEqual(self.service.get_tier_info(40, "survivor")["perk_limit"], 0)
        self.assertEqual(self.service.get_tier_info(999, "survivor")["perk_limit"], 0)

    def test_killer_tier_names_differ_from_survivor(self):
        survivor = self.service.get_tier_info(10, "survivor")
        killer = self.service.get_tier_info(10, "killer")
        self.assertEqual(survivor["name"], "The Thinning")
        self.assertEqual(killer["name"], "The Restriction")
        self.assertNotIn("addon_limit", killer)


class TestGauntletRun(GauntletTestCase):
    def setUp(self):
        super().setUp()
        self.nurse = seed_killer("Nurse")
        self.trapper = seed_killer("Trapper")
        self.user_id = self.register_user("gauntletuser")

    def test_get_or_create_run_targets_an_owned_character(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        self.assertEqual(run["status"], "in_progress")
        self.assertIn(run["current_character_id"], ["Nurse", "Trapper"])
        self.assertEqual(run["current_streak"], 0)
        self.assertEqual(run["tier_info"]["perk_limit"], 4)

    def test_new_run_defaults_to_original_mode_and_unrevealed_target(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        self.assertEqual(run["game_mode"], "original")
        self.assertFalse(run["target_revealed"])

    def test_get_or_create_run_is_idempotent(self):
        first = self.service.get_or_create_run(self.user_id, "killer")
        second = self.service.get_or_create_run(self.user_id, "killer")
        self.assertEqual(first["id"], second["id"])

    def test_runs_are_isolated_per_role(self):
        seed_survivor = Character(name="Meg Thomas", role="Survivor")
        db.session.add(seed_survivor)
        db.session.commit()

        killer_run = self.service.get_or_create_run(self.user_id, "killer")
        survivor_run = self.service.get_or_create_run(self.user_id, "survivor")
        self.assertNotEqual(killer_run["id"], survivor_run["id"])
        self.assertEqual(killer_run["role"], "killer")
        self.assertEqual(survivor_run["role"], "survivor")

    def test_runs_are_isolated_per_user(self):
        other_user_id = self.register_user("otheruser")
        run1 = self.service.get_or_create_run(self.user_id, "killer")
        run2 = self.service.get_or_create_run(other_user_id, "killer")
        self.assertNotEqual(run1["id"], run2["id"])

    def test_roll_never_targets_a_locked_character(self):
        self.lock_character(self.user_id, self.nurse.id)
        for _ in range(10):
            run = self.service.roll(self.user_id, "killer")
            self.assertEqual(run["current_character_id"], "Trapper")

    def test_roll_no_longer_assigns_a_playable_build(self):
        run = self.service.roll(self.user_id, "killer", target_character="Trapper")
        # Only the target's own teachable perks are carried, as a reference display.
        self.assertNotIn("perks", run["current_loadout"])
        self.assertTrue(
            all(p["character"] == "Trapper" for p in run["current_loadout"]["character_perks"])
        )

    def test_reveal_target_flips_flag_without_changing_character(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        target = run["current_character_id"]
        self.assertFalse(run["target_revealed"])
        revealed = self.service.reveal_target(self.user_id, run["id"])
        self.assertTrue(revealed["target_revealed"])
        self.assertEqual(revealed["current_character_id"], target)


class TestGauntletResults(GauntletTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("Nurse")
        seed_killer("Trapper")
        self.user_id = self.register_user("resultsuser")
        self.run = self.service.get_or_create_run(self.user_id, "killer")

    def test_win_increments_streak_and_records_checkpoint(self):
        for expected in range(1, 10):
            updated = self.service.submit_result(self.user_id, self.run["id"], "win")
            self.assertEqual(updated["current_streak"], expected)
            self.assertEqual(updated["last_checkpoint_streak"], 0)

        tenth = self.service.submit_result(self.user_id, self.run["id"], "win")
        self.assertEqual(tenth["current_streak"], 10)
        self.assertEqual(tenth["last_checkpoint_streak"], 10)

    def test_loss_reverts_to_last_checkpoint(self):
        for _ in range(10):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss")
        self.assertEqual(after_loss["current_streak"], 10)

    def test_loss_before_any_checkpoint_resets_to_zero(self):
        for _ in range(3):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss")
        self.assertEqual(after_loss["current_streak"], 0)

    def test_win_marks_character_completed(self):
        target = self.run["current_character_id"]
        updated = self.service.submit_result(self.user_id, self.run["id"], "win")
        self.assertIn(target, updated["completed_characters"])

    def test_best_streak_is_never_decreased_by_a_loss(self):
        for _ in range(3):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        updated = self.service.submit_result(self.user_id, self.run["id"], "loss")
        self.assertEqual(updated["best_streak"], 3)

    def test_rejects_invalid_result(self):
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, self.run["id"], "draw")

    def test_rejects_result_for_another_users_run(self):
        other_user_id = self.register_user("intruder")
        with self.assertRaises(ValueError):
            self.service.submit_result(other_user_id, self.run["id"], "win")


class TestGauntletCharacterPerks(GauntletTestCase):
    def setUp(self):
        super().setUp()
        self.trapper = seed_killer("Trapper", perk_count=3)
        seed_killer("Nurse", perk_count=3)
        self.user_id = self.register_user("perkdisplayuser")

    def test_loadout_carries_the_targets_own_teachable_perks(self):
        self.service.get_or_create_run(self.user_id, "killer")
        run = self.service.roll(self.user_id, "killer", target_character="Trapper")

        names = {p["name"] for p in run["current_loadout"]["character_perks"]}
        self.assertEqual(names, {"Trapper Perk 1", "Trapper Perk 2", "Trapper Perk 3"})

    def test_character_perks_are_present_on_a_brand_new_run(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        target = run["current_character_id"]

        perks = run["current_loadout"]["character_perks"]
        self.assertEqual(len(perks), 3)
        self.assertTrue(all(p["character"] == target for p in perks))


class TestGauntletCompletion(GauntletTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("Trapper")
        seed_killer("Nurse")
        self.user_id = self.register_user("completionuser")

    def _clear(self, name):
        self.service.roll(self.user_id, "killer", target_character=name)
        run = self.service.get_or_create_run(self.user_id, "killer")
        return self.service.submit_result(self.user_id, run["id"], "win")

    def test_run_completes_once_every_owned_character_is_cleared(self):
        self.service.get_or_create_run(self.user_id, "killer")

        after_first = self._clear("Trapper")
        self.assertEqual(after_first["status"], "in_progress")

        after_last = self._clear("Nurse")
        self.assertEqual(after_last["status"], "completed")
        self.assertEqual(sorted(after_last["completed_characters"]), ["Nurse", "Trapper"])

    def test_completed_run_rejects_further_results(self):
        self.service.get_or_create_run(self.user_id, "killer")
        self._clear("Trapper")
        self._clear("Nurse")

        run = self.service.get_or_create_run(self.user_id, "killer")
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, run["id"], "win")

    def test_reset_starts_a_fresh_run(self):
        self.service.get_or_create_run(self.user_id, "killer")
        self._clear("Trapper")
        self._clear("Nurse")

        fresh = self.service.reset_run(self.user_id, "killer")
        self.assertEqual(fresh["status"], "in_progress")
        self.assertEqual(fresh["current_streak"], 0)
        self.assertEqual(fresh["completed_characters"], [])
        self.assertFalse(fresh["target_revealed"])


class TestGauntletStats(GauntletTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("Nurse")
        # A second killer keeps the run from completing (and locking) after one win.
        seed_killer("Trapper")
        self.user_id = self.register_user("statsuser")

    def test_stats_start_empty(self):
        stats = self.service.get_stats(self.user_id, "killer")
        self.assertEqual(stats["total_matches"], 0)
        self.assertEqual(stats["win_rate"], 0.0)

    def test_stats_reflect_wins_and_losses(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        self.service.submit_result(self.user_id, run["id"], "win")
        self.service.submit_result(self.user_id, run["id"], "loss")

        stats = self.service.get_stats(self.user_id, "killer")
        self.assertEqual(stats["total_matches"], 2)
        self.assertEqual(stats["wins"], 1)
        self.assertEqual(stats["losses"], 1)
        self.assertEqual(stats["win_rate"], 50.0)
        self.assertEqual(len(stats["recent_logs"]), 2)

    def test_stats_are_isolated_per_role(self):
        db.session.add(Character(name="Meg Thomas", role="Survivor"))
        db.session.commit()
        run = self.service.get_or_create_run(self.user_id, "killer")
        self.service.submit_result(self.user_id, run["id"], "win")

        killer_stats = self.service.get_stats(self.user_id, "killer")
        survivor_stats = self.service.get_stats(self.user_id, "survivor")
        self.assertEqual(killer_stats["total_matches"], 1)
        self.assertEqual(survivor_stats["total_matches"], 0)


class TestGauntletItemsAndAddons(GauntletTestCase):
    def test_survivor_loadout_gets_item_and_matching_addon(self):
        seed_survivor()
        item, addon = seed_item_and_addons()
        user_id = self.register_user("itemuser")
        self.service.get_or_create_run(user_id, "survivor")
        run = self.service.roll(user_id, "survivor")
        loadout = run["current_loadout"]
        self.assertEqual(loadout["item"]["name"], item.name)
        self.assertEqual(len(loadout["addons"]), 1)
        self.assertEqual(loadout["addons"][0]["name"], addon.name)

    def test_survivor_item_type_is_classified_from_name_not_category(self):
        # "Worn-Out Tools" has no "toolbox" substring, unlike "Commodious Toolbox",
        # exercising the keyword classifier's alternate pattern for the Toolbox type.
        self.assertEqual(
            self.service._classify_survivor_item_type("Worn-Out Tools"), "Toolboxes"
        )
        self.assertEqual(
            self.service._classify_survivor_item_type("Camping Aid Kit"), "Med-Kits"
        )
        self.assertEqual(
            self.service._classify_survivor_item_type("Ranger Med-Kit"), "Med-Kits"
        )
        self.assertEqual(
            self.service._classify_survivor_item_type("Skeleton Key"), "Keys"
        )
        # "Keycard" must not match the "Keys" addon pool via a loose substring match.
        self.assertIsNone(self.service._classify_survivor_item_type("Keycard"))
        # Special/event items outside the 6 addon-bearing types classify to nothing.
        self.assertIsNone(self.service._classify_survivor_item_type("Chinese Firecracker"))

    def test_survivor_loadout_has_no_addons_when_item_type_is_unclassifiable(self):
        seed_survivor()
        item = Item(name="Chinese Firecracker", category="Survivor", role="Survivor")
        db.session.add(item)
        db.session.commit()
        user_id = self.register_user("noaddonuser")
        self.service.get_or_create_run(user_id, "survivor")
        run = self.service.roll(user_id, "survivor")
        loadout = run["current_loadout"]
        self.assertEqual(loadout["item"]["name"], "Chinese Firecracker")
        self.assertEqual(loadout["addons"], [])

    def test_killer_loadout_gets_matching_addons_only(self):
        killer = seed_killer("Trapper", perk_count=1)
        seed_killer_addons("Trapper")
        seed_killer_addons("Nurse")
        user_id = self.register_user("killeraddonuser")
        self.service.get_or_create_run(user_id, "killer")
        run = self.service.roll(user_id, "killer", target_character="Trapper")
        loadout = run["current_loadout"]
        self.assertNotIn("item", {k: v for k, v in loadout.items() if k == "item" and v})
        self.assertEqual(len(loadout["addons"]), 1)
        self.assertEqual(loadout["addons"][0]["name"], "Trapper Addon")


if __name__ == "__main__":
    unittest.main()
