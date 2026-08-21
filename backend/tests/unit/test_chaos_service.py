# backend/tests/unit/test_chaos_service.py
import unittest
from sqlalchemy import select

from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk, User
from app.services.chaos_service import ChaosService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


def seed_killer(name, perk_count=3):
    character = Character(name=name, role="Killer")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


def seed_new_perk(name, character_name="The Trapper"):
    character = db.session.scalars(select(Character).where(Character.name == character_name)).first()
    perk = Perk(name=name, character_id=character.id, is_teachable=True, category="Killer")
    db.session.add(perk)
    db.session.commit()
    return perk


class ChaosTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()
        self.service = ChaosService(ownership_service=self.ownership_service)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def register_user(self, username):
        user, err = self.user_service.register_user(username, f"{username}@test.com", "password123")
        self.assertIsNone(err)
        return user.id


class TestGetOrCreateRun(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        seed_killer("The Wraith")
        self.user_id = self.register_user("chaosplayer")

    def test_creates_a_run_with_a_fresh_unrevealed_build(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.assertEqual(run["status"], "in_progress")
        self.assertEqual(run["difficulty"], "hell")
        self.assertEqual(run["current_streak"], 0)
        self.assertFalse(run["perks_revealed"])
        self.assertEqual(len(run["current_perks"]), 4)
        self.assertEqual(len(run["current_addon_rarities"]), 2)
        self.assertEqual(run["checkpoint_interval"], 0)

    def test_easy_and_hell_runs_for_the_same_user_are_independent(self):
        hell_run = self.service.get_or_create_run(self.user_id, "hell")
        easy_run = self.service.get_or_create_run(self.user_id, "easy")
        self.assertNotEqual(hell_run["id"], easy_run["id"])
        self.assertEqual(easy_run["checkpoint_interval"], 5)

    def test_getting_twice_returns_the_same_run(self):
        first = self.service.get_or_create_run(self.user_id, "medium")
        second = self.service.get_or_create_run(self.user_id, "medium")
        self.assertEqual(first["id"], second["id"])


class TestReveal(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        self.user_id = self.register_user("revealuser")

    def test_reveal_flips_the_flag(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        revealed = self.service.reveal(self.user_id, run["id"])
        self.assertTrue(revealed["perks_revealed"])

    def test_reveal_missing_run_raises(self):
        with self.assertRaises(ValueError):
            self.service.reveal(self.user_id, 999999)


class TestHellDifficulty(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        seed_killer("The Wraith")
        self.user_id = self.register_user("hellplayer")
        self.difficulty = "hell"
        self.run = self.service.get_or_create_run(self.user_id, self.difficulty)

    def test_new_killer_mid_run_is_not_in_the_completion_check(self):
        seed_killer("Huntress")
        run = self.run
        remaining = list(run["owned_killers"])
        for killer in remaining:
            run = self.service.submit_result(self.user_id, run["id"], "win", killer)
        self.assertEqual(run["status"], "completed")

    def test_new_perk_mid_run_is_not_drawn(self):
        run = self.service.submit_result(self.user_id, self.run["id"], "win", self.run["owned_killers"][0])
        unlocked_names_before = set(run["unlocked_perks"])
        seed_new_perk("Brand New Perk")
        drawn_names = {p["name"] for p in run["current_perks"]}
        self.assertFalse(drawn_names - unlocked_names_before)

    def test_unlocked_perks_detail_resolves_full_objects(self):
        run = self.run
        self.assertEqual(
            sorted(p["name"] for p in run["unlocked_perks_detail"]),
            sorted(run["unlocked_perks"]),
        )
        self.assertIn("icon_local_path", run["unlocked_perks_detail"][0])

    def test_loss_to_zero_refreezes_both_pools(self):
        seed_killer("Huntress")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", self.run["owned_killers"][0])
        self.assertIn("Huntress", after_loss["owned_killers"])

    def test_win_advances_streak_and_completes_killer(self):
        updated = self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.assertEqual(updated["current_streak"], 1)
        self.assertIn("The Trapper", updated["completed_killers"])
        self.assertEqual(len(updated["current_perks"]), 4)
        self.assertFalse(updated["perks_revealed"])

    def test_win_with_every_owned_killer_completes_the_run(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        self.assertEqual(final["status"], "completed")

    def test_one_loss_resets_everything(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "The Wraith")
        self.assertEqual(after_loss["current_streak"], 0)
        self.assertEqual(after_loss["completed_killers"], [])

    def test_cannot_win_with_an_already_completed_killer(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        run = self.service.get_or_create_run(self.user_id, "hell")
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")


class TestEasyCheckpoint(ChaosTestCase):
    def setUp(self):
        super().setUp()
        for i in range(6):
            seed_killer(f"Killer {i}")
        self.user_id = self.register_user("easyplayer")
        self.run = self.service.get_or_create_run(self.user_id, "easy")

    def _win(self, killer_name):
        return self.service.submit_result(self.user_id, self.run["id"], "win", killer_name)

    def test_banks_a_checkpoint_every_five_wins(self):
        result = None
        for i in range(5):
            result = self._win(f"Killer {i}")
        self.assertEqual(result["current_streak"], 5)
        self.assertEqual(result["last_checkpoint_streak"], 5)
        self.assertEqual(len(result["checkpoint_killers"]), 5)

    def test_loss_before_a_checkpoint_falls_back_to_zero(self):
        self._win("Killer 0")
        self._win("Killer 1")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 2")
        self.assertEqual(after_loss["current_streak"], 0)
        self.assertEqual(after_loss["completed_killers"], [])

    def test_loss_after_a_checkpoint_falls_back_to_the_checkpoint_not_zero(self):
        for i in range(5):
            self._win(f"Killer {i}")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 5")
        self.assertEqual(after_loss["current_streak"], 5)
        self.assertEqual(len(after_loss["completed_killers"]), 5)


class TestResetRun(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        self.user_id = self.register_user("resetuser")

    def test_reset_wipes_and_starts_over(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")
        reset = self.service.reset_run(self.user_id, "hell")
        self.assertEqual(reset["current_streak"], 0)
        self.assertEqual(reset["completed_killers"], [])
        self.assertFalse(reset["perks_revealed"])

    def test_reset_missing_run_raises(self):
        with self.assertRaises(ValueError):
            self.service.reset_run(self.user_id, "medium")


class TestGetStats(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        self.user_id = self.register_user("statsplayer")

    def test_stats_reflect_submitted_results(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")
        stats = self.service.get_stats(self.user_id, "hell")
        self.assertEqual(stats["total_matches"], 1)
        self.assertEqual(stats["wins"], 1)


if __name__ == "__main__":
    unittest.main()
