# backend/tests/unit/test_history_service.py
import unittest
import pytest
from sqlalchemy import select
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, HistoryMatchLog, Perk, User
from app.services.history_service import HistoryService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


def seed_killer(name, release_number, perk_count=2):
    character = Character(name=name, role="Killer", release_number=release_number)
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


def seed_general_perk(name="Whispers"):
    db.session.add(Perk(name=name, character_id=None, category="Killer"))
    db.session.commit()


@pytest.mark.unit
class HistoryTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()
        self.service = HistoryService(ownership_service=self.ownership_service)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def register_user(self, username):
        user, err = self.user_service.register_user(username, f"{username}@test.com", "password123")
        self.assertIsNone(err)
        return user.id


@pytest.mark.unit
class TestGetOrCreateRun(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate(["The Trapper", "The Wraith", "The Hillbilly"], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("historyplayer")

    def test_creates_a_fresh_run_with_general_perks_unlocked(self):
        run = self.service.get_or_create_run(self.user_id, "medium")
        self.assertEqual(run["status"], "in_progress")
        self.assertEqual(run["current_row_index"], 0)
        self.assertEqual(run["unlocked_perk_names"], ["Whispers"])
        self.assertEqual(run["current_row_killers"], ["The Trapper", "The Wraith", "The Hillbilly"])
        self.assertEqual(run["row_size"], 5)
        self.assertEqual(run["total_rows"], 1)
        self.assertEqual(run["total_owned_killers"], 3)

    def test_medium_and_hell_runs_are_independent(self):
        medium_run = self.service.get_or_create_run(self.user_id, "medium")
        hell_run = self.service.get_or_create_run(self.user_id, "hell")
        self.assertNotEqual(medium_run["id"], hell_run["id"])

    def test_getting_twice_returns_the_same_run(self):
        first = self.service.get_or_create_run(self.user_id, "medium")
        second = self.service.get_or_create_run(self.user_id, "medium")
        self.assertEqual(first["id"], second["id"])


@pytest.mark.unit
class TestSubmitResultWithinARow(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate(["The Trapper", "The Wraith", "The Hillbilly"], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("rowplayer")
        self.run = self.service.get_or_create_run(self.user_id, "hell")

    def test_win_adds_killer_and_unlocks_their_perks(self):
        updated = self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.assertIn("The Trapper", updated["completed_killers"])
        self.assertIn("The Trapper Perk 1", updated["unlocked_perk_names"])
        self.assertIn("The Trapper Perk 2", updated["unlocked_perk_names"])
        self.assertEqual(set(updated["newly_unlocked_perks"]), {"The Trapper Perk 1", "The Trapper Perk 2"})
        self.assertFalse(updated["row_cleared"])
        self.assertEqual(updated["total_killers_beaten"], 1)

    def test_cannot_win_with_a_killer_outside_the_active_row(self):
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, self.run["id"], "win", "Someone Else")

    def test_cannot_win_with_an_already_completed_killer_in_the_row(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")

    def test_clearing_every_killer_in_the_row_advances_and_completes(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Hillbilly")
        self.assertTrue(final["row_cleared"])
        self.assertEqual(final["status"], "completed")
        self.assertEqual(final["completed_killers"], [])
        self.assertEqual(final["total_killers_beaten"], 3)

    def test_match_log_records_the_row_the_match_was_actually_played_in(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Hillbilly")
        self.assertTrue(final["row_cleared"])
        logs = db.session.scalars(
            select(HistoryMatchLog).where(
                HistoryMatchLog.run_id == self.run["id"], HistoryMatchLog.killer_id == "The Hillbilly"
            )
        ).all()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].row_index, 0)

    def test_apply_inactivity_loss_writes_a_flagged_match_log(self):
        self.service.apply_inactivity_loss(self.run["id"])
        log = db.session.scalars(
            select(HistoryMatchLog).where(HistoryMatchLog.run_id == self.run["id"])
        ).first()
        self.assertEqual(log.result, "loss")
        self.assertEqual(log.triggered_by, "inactivity")

    def test_apply_inactivity_loss_is_a_noop_on_a_completed_run(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Hillbilly")
        self.assertEqual(final["status"], "completed")

        before_count = db.session.query(HistoryMatchLog).count()
        self.service.apply_inactivity_loss(self.run["id"])
        self.assertEqual(db.session.query(HistoryMatchLog).count(), before_count)

        reloaded = self.service.get_or_create_run(self.user_id, "hell")
        self.assertEqual(reloaded["status"], "completed")


@pytest.mark.unit
class TestHellModeLoss(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate([f"Killer {n}" for n in range(7)], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("hellplayer")
        self.run = self.service.get_or_create_run(self.user_id, "hell")

    def test_any_loss_resets_everything(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "Killer 0")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 1")
        self.assertEqual(after_loss["current_row_index"], 0)
        self.assertEqual(after_loss["completed_killers"], [])
        self.assertEqual(after_loss["unlocked_perk_names"], ["Whispers"])
        self.assertEqual(after_loss["total_killers_beaten"], 0)

    def test_loss_after_clearing_a_row_still_resets_to_zero(self):
        for name in ["Killer 0", "Killer 1", "Killer 2", "Killer 3", "Killer 4"]:
            self.service.submit_result(self.user_id, self.run["id"], "win", name)
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 5")
        self.assertEqual(after_loss["current_row_index"], 0)
        self.assertEqual(after_loss["total_killers_beaten"], 0)

        logs = db.session.scalars(
            select(HistoryMatchLog).where(
                HistoryMatchLog.run_id == self.run["id"], HistoryMatchLog.killer_id == "Killer 5"
            )
        ).all()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].row_index, 1)


@pytest.mark.unit
class TestMediumModeCheckpoint(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate([f"Killer {n}" for n in range(10)], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("mediumplayer")
        self.run = self.service.get_or_create_run(self.user_id, "medium")

    def _win(self, name):
        return self.service.submit_result(self.user_id, self.run["id"], "win", name)

    def test_loss_within_a_row_falls_back_to_start_of_that_row(self):
        self._win("Killer 0")
        self._win("Killer 1")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 2")
        self.assertEqual(after_loss["current_row_index"], 0)
        self.assertEqual(after_loss["completed_killers"], [])
        self.assertEqual(after_loss["total_killers_beaten"], 0)

    def test_loss_after_clearing_a_row_falls_back_to_that_rows_checkpoint_not_zero(self):
        for name in ["Killer 0", "Killer 1", "Killer 2", "Killer 3", "Killer 4"]:
            self._win(name)
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 5")
        self.assertEqual(after_loss["current_row_index"], 1)
        self.assertEqual(after_loss["completed_killers"], [])
        self.assertEqual(after_loss["total_killers_beaten"], 5)
        self.assertIn("Killer 0 Perk 1", after_loss["unlocked_perk_names"])


@pytest.mark.unit
class TestResetRun(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        seed_killer("The Trapper", release_number=1)
        self.user_id = self.register_user("resetplayer")

    def test_reset_wipes_and_starts_over(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")
        reset = self.service.reset_run(self.user_id, "hell")
        self.assertEqual(reset["total_killers_beaten"], 0)
        self.assertEqual(reset["completed_killers"], [])
        self.assertEqual(reset["unlocked_perk_names"], ["Whispers"])

    def test_reset_missing_run_raises(self):
        with self.assertRaises(ValueError):
            self.service.reset_run(self.user_id, "medium")


@pytest.mark.unit
class TestGetStats(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        seed_killer("The Trapper", release_number=1)
        self.user_id = self.register_user("statsplayer")

    def test_stats_reflect_submitted_results(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")
        stats = self.service.get_stats(self.user_id, "hell")
        self.assertEqual(stats["total_matches"], 1)
        self.assertEqual(stats["wins"], 1)


@pytest.mark.unit
class TestFrozenKillerRoster(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate(["The Trapper", "The Wraith", "The Hillbilly"], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("frozenplayer")

    def test_new_killer_mid_run_does_not_reshuffle_the_active_row(self):
        before = self.service.get_or_create_run(self.user_id, "hell")
        row_before = before["current_row_killers"]
        seed_killer("Some New Killer", release_number=99)
        after = self.service.get_or_create_run(self.user_id, "hell")
        self.assertEqual(after["current_row_killers"], row_before)

    def test_hell_loss_refreezes_the_roster(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        seed_killer("Some New Killer", release_number=99)
        refrozen = self.service.submit_result(
            self.user_id, run["id"], "loss", run["current_row_killers"][0]
        )
        self.assertIn("Some New Killer", refrozen["owned_killers"])

    def test_medium_loss_before_any_checkpoint_refreezes_the_roster(self):
        run = self.service.get_or_create_run(self.user_id, "medium")
        seed_killer("Some New Killer", release_number=99)
        after_loss = self.service.submit_result(
            self.user_id, run["id"], "loss", run["current_row_killers"][0]
        )
        self.assertIn("Some New Killer", after_loss["owned_killers"])

    def test_medium_apply_inactivity_loss_before_any_checkpoint_refreezes_the_roster(self):
        run = self.service.get_or_create_run(self.user_id, "medium")
        seed_killer("Some New Killer", release_number=99)
        self.service.apply_inactivity_loss(run["id"])
        reloaded = self.service.get_or_create_run(self.user_id, "medium")
        self.assertIn("Some New Killer", reloaded["owned_killers"])


@pytest.mark.unit
class TestMediumCheckpointLossDoesNotRefreeze(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate([f"Killer {n}" for n in range(10)], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("mediumfreezeplayer")

    def test_medium_checkpoint_loss_does_not_refreeze(self):
        run = self.service.get_or_create_run(self.user_id, "medium")
        for name in ["Killer 0", "Killer 1", "Killer 2", "Killer 3", "Killer 4"]:
            cleared = self.service.submit_result(self.user_id, run["id"], "win", name)
        self.assertTrue(cleared["row_cleared"])
        snapshot_before = cleared["owned_killers"]
        self.assertNotIn("Some New Killer", snapshot_before)

        seed_killer("Some New Killer", release_number=99)
        after_loss = self.service.submit_result(self.user_id, run["id"], "loss", "Killer 5")
        self.assertEqual(after_loss["owned_killers"], snapshot_before)
        self.assertNotIn("Some New Killer", after_loss["owned_killers"])

    def test_medium_apply_inactivity_loss_after_checkpoint_does_not_refreeze(self):
        run = self.service.get_or_create_run(self.user_id, "medium")
        for name in ["Killer 0", "Killer 1", "Killer 2", "Killer 3", "Killer 4"]:
            cleared = self.service.submit_result(self.user_id, run["id"], "win", name)
        self.assertTrue(cleared["row_cleared"])
        snapshot_before = cleared["owned_killers"]
        self.assertNotIn("Some New Killer", snapshot_before)

        seed_killer("Some New Killer", release_number=99)
        self.service.apply_inactivity_loss(run["id"])
        reloaded = self.service.get_or_create_run(self.user_id, "medium")
        self.assertEqual(reloaded["owned_killers"], snapshot_before)
        self.assertNotIn("Some New Killer", reloaded["owned_killers"])


@pytest.mark.unit
class TestOwnershipShrinksMidRun(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        self.killers = {}
        for i, name in enumerate([f"Killer {n}" for n in range(1, 7)], start=1):
            self.killers[name] = seed_killer(name, release_number=i)
        self.user_id = self.register_user("shrinkplayer")

    def test_unowning_the_only_killer_in_the_next_row_does_not_soft_lock_the_run(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        for name in ["Killer 1", "Killer 2", "Killer 3", "Killer 4", "Killer 5"]:
            self.service.submit_result(self.user_id, run["id"], "win", name)

        killer_6 = self.killers["Killer 6"]
        self.ownership_service.set_character_ownership(self.user_id, killer_6.id, is_owned=False)

        reloaded = self.service.get_or_create_run(self.user_id, "hell")
        self.assertEqual(reloaded["status"], "in_progress")
        self.assertLess(reloaded["current_row_index"], reloaded["total_rows"])
        self.assertTrue(reloaded["current_row_killers"])


if __name__ == "__main__":
    unittest.main()
