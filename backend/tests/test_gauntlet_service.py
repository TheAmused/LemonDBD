import unittest
from sqlalchemy import select
from app import create_app
from app.extensions import db
from app.models import Character, Perk
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


class GauntletTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
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
        self.assertEqual(self.service.get_tier_info(3, "survivor")["perk_limit"], 3)
        self.assertEqual(self.service.get_tier_info(6, "survivor")["perk_limit"], 2)
        self.assertEqual(self.service.get_tier_info(9, "survivor")["perk_limit"], 1)
        self.assertEqual(self.service.get_tier_info(12, "survivor")["perk_limit"], 0)
        self.assertEqual(self.service.get_tier_info(999, "survivor")["perk_limit"], 0)

    def test_killer_tier_names_differ_from_survivor(self):
        survivor = self.service.get_tier_info(3, "survivor")
        killer = self.service.get_tier_info(3, "killer")
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

    def test_roll_only_uses_unlocked_perks(self):
        nurse_perks = db.session.scalars(select(Perk).where(Perk.character_id == self.nurse.id)).all()
        for perk in nurse_perks:
            self.ownership_service.set_perk_ownership(self.user_id, perk.id, is_unlocked=False)

        self.service.get_or_create_run(self.user_id, "killer")
        for _ in range(10):
            run = self.service.roll(self.user_id, "killer", target_character="Trapper")
            perk_names = {p["name"] for p in run["current_loadout"]["perks"]}
            self.assertTrue(perk_names.isdisjoint({p.name for p in nurse_perks}))


class TestGauntletResults(GauntletTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("Nurse")
        seed_killer("Trapper")
        self.user_id = self.register_user("resultsuser")
        self.run = self.service.get_or_create_run(self.user_id, "killer")

    def test_win_increments_streak_and_records_checkpoint(self):
        r1 = self.service.submit_result(self.user_id, self.run["id"], "win")
        self.assertEqual(r1["current_streak"], 1)
        r2 = self.service.submit_result(self.user_id, self.run["id"], "win")
        self.assertEqual(r2["current_streak"], 2)
        r3 = self.service.submit_result(self.user_id, self.run["id"], "win")
        self.assertEqual(r3["current_streak"], 3)
        self.assertEqual(r3["last_checkpoint_streak"], 3)

    def test_loss_reverts_to_last_checkpoint(self):
        for _ in range(3):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss")
        self.assertEqual(after_loss["current_streak"], 3)

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

    def test_invalidate_match_rerolls_same_character_and_keeps_streak(self):
        target = self.run["current_character_id"]
        streak_before = self.run["current_streak"]
        updated = self.service.invalidate_match(self.user_id, self.run["id"], "dc_before_5_gens")
        self.assertEqual(updated["current_character_id"], target)
        self.assertEqual(updated["current_streak"], streak_before)

    def test_invalidate_match_rejects_invalid_reason(self):
        with self.assertRaises(ValueError):
            self.service.invalidate_match(self.user_id, self.run["id"], "because")


class TestGauntletStats(GauntletTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("Nurse")
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


if __name__ == "__main__":
    unittest.main()
