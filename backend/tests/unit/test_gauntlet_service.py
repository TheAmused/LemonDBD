# backend/tests/unit/test_gauntlet_service.py
import unittest
from sqlalchemy import select
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, GauntletRun, Perk
from app.services.user_service import UserService
from app.services.ownership_service import OwnershipService
from app.services.gauntlet import CHECKPOINT_INTERVAL, get_owned_character_names
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

    def test_killer_tier_perk_limits_start_at_three(self):
        self.assertEqual(self.service.get_tier_info(0, "killer")["perk_limit"], 3)
        self.assertEqual(self.service.get_tier_info(9, "killer")["perk_limit"], 3)
        self.assertEqual(self.service.get_tier_info(10, "killer")["perk_limit"], 2)
        self.assertEqual(self.service.get_tier_info(20, "killer")["perk_limit"], 1)
        self.assertEqual(self.service.get_tier_info(30, "killer")["perk_limit"], 0)
        self.assertEqual(self.service.get_tier_info(999, "killer")["perk_limit"], 0)

    def test_tier_steps_up_on_the_checkpoint_it_banks(self):
        for role in ("killer", "survivor"):
            below = self.service.get_tier_info(CHECKPOINT_INTERVAL - 1, role)
            at = self.service.get_tier_info(CHECKPOINT_INTERVAL, role)
            self.assertEqual(at["tier_level"], below["tier_level"] + 1)
            self.assertEqual(at["perk_limit"], below["perk_limit"] - 1)

    def test_tier_info_hides_the_internal_threshold(self):
        self.assertNotIn("min_streak", self.service.get_tier_info(0, "killer"))
        self.assertNotIn("min_streak", self.service.get_tier_info(0, "survivor"))

    def test_tier_info_carries_the_roster_limit(self):
        """The frontend filters its roster grid off this value instead of
        keeping its own copy of the original challenge's cutoff."""
        self.assertEqual(self.service.get_tier_info(0, "killer")["roster_limit"], 43)
        self.assertEqual(self.service.get_tier_info(0, "survivor")["roster_limit"], 52)

    def test_only_killers_are_restricted_to_their_own_perks(self):
        self.assertTrue(self.service.get_tier_info(0, "killer")["character_perks_only"])
        self.assertFalse(self.service.get_tier_info(0, "survivor")["character_perks_only"])

    def test_killer_tier_names_differ_from_survivor(self):
        survivor = self.service.get_tier_info(10, "survivor")
        killer = self.service.get_tier_info(10, "killer")
        self.assertEqual(survivor["name"], "The Thinning")
        self.assertEqual(killer["name"], "The Obsession")


class TestOriginalKillerRosterCap(GauntletTestCase):
    def setUp(self):
        super().setUp()
        self.trapper = seed_killer("Trapper")
        self.trapper.release_number = 1
        self.slasher = seed_killer("The Slasher")
        self.slasher.release_number = 43
        self.newer = seed_killer("The Judgment")
        self.newer.release_number = 44
        db.session.commit()
        self.user_id = self.register_user("gauntletcapuser")

    def test_pool_excludes_killers_past_the_original_cutoff(self):
        names = get_owned_character_names(self.user_id, "killer", self.ownership_service)
        self.assertIn("Trapper", names)
        self.assertIn("The Slasher", names)
        self.assertNotIn("The Judgment", names)

    def test_a_killer_past_the_cutoff_is_never_drawn(self):
        for _ in range(20):
            run = self.service.roll(self.user_id, "killer")
            self.assertNotEqual(run["current_character_id"], "The Judgment")

    def test_gauntlet_can_be_won_without_the_newer_killer(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        for _ in range(2):
            run = self.service.submit_result(self.user_id, run["id"], "win")
            if run["status"] != "completed":
                run = self.service.roll(self.user_id, "killer")
        self.assertEqual(run["status"], "completed")
        self.assertNotIn("The Judgment", run["completed_characters"])


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
        self.assertEqual(run["tier_info"]["perk_limit"], 3)

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

    def test_new_character_mid_run_is_not_immediately_rollable(self):
        huntress = seed_killer("Huntress")
        for _ in range(20):
            run = self.service.roll(self.user_id, "killer")
            self.assertNotEqual(run["current_character_id"], "Huntress")

    def test_completion_check_ignores_a_character_owned_mid_run(self):
        seed_killer("Huntress")
        run = self.service.get_or_create_run(self.user_id, "killer")
        # get_or_create_run above only re-reads; the pool was frozen to
        # {Nurse, Trapper} back in setUp's initial get_or_create_run call.
        for _ in range(2):
            run = self.service.submit_result(self.user_id, run["id"], "win")
            if run["status"] != "completed":
                run = self.service.roll(self.user_id, "killer")
        self.assertEqual(run["status"], "completed")

    def test_loss_to_zero_refreezes_the_pool(self):
        self.service.submit_result(self.user_id, self.run["id"], "loss")
        seed_killer("Huntress")
        refrozen = self.service.get_or_create_run(self.user_id, "killer")
        self.assertIn("Huntress", refrozen["owned_characters"])

    def test_completing_the_run_refreezes_the_pool(self):
        run = self.run
        for _ in range(2):
            run = self.service.submit_result(self.user_id, run["id"], "win")
            if run["status"] != "completed":
                run = self.service.roll(self.user_id, "killer")
        self.assertEqual(run["status"], "completed")
        seed_killer("Huntress")
        reloaded = self.service.get_or_create_run(self.user_id, "killer")
        self.assertIn("Huntress", reloaded["owned_characters"])


class TestGauntletLazyFreeze(GauntletTestCase):
    def test_existing_run_with_empty_snapshot_freezes_on_read(self):
        seed_killer("Nurse")
        seed_killer("Trapper")
        user_id = self.register_user("lazyfreezeuser")
        run = self.service.get_or_create_run(user_id, "killer")
        r = db.session.scalars(select(GauntletRun).where(GauntletRun.id == run["id"])).first()
        r.owned_characters_json = "[]"
        db.session.commit()

        reloaded = self.service.get_or_create_run(user_id, "killer")
        self.assertEqual(sorted(reloaded["owned_characters"]), ["Nurse", "Trapper"])


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


class TestGauntletLoadoutHasNoGear(GauntletTestCase):
    def test_survivor_loadout_carries_no_item(self):
        seed_survivor()
        user_id = self.register_user("noitemuser")
        self.service.get_or_create_run(user_id, "survivor")
        run = self.service.roll(user_id, "survivor")
        self.assertNotIn("item", run["current_loadout"])

    def test_killer_loadout_carries_no_gear(self):
        seed_killer("Trapper", perk_count=1)
        user_id = self.register_user("killergearuser")
        self.service.get_or_create_run(user_id, "killer")
        run = self.service.roll(user_id, "killer", target_character="Trapper")
        loadout = run["current_loadout"]
        self.assertNotIn("item", loadout)
        self.assertNotIn("addons", loadout)


if __name__ == "__main__":
    unittest.main()
