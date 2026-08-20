# backend/tests/unit/test_history_roster.py
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk
from app.services.history.roster import (
    ROW_SIZE,
    build_rows,
    get_general_killer_perk_names,
    get_killer_teachable_perk_names,
    get_owned_killer_names_by_release,
)
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


class TestBuildRows(unittest.TestCase):
    def test_row_size_is_five(self):
        self.assertEqual(ROW_SIZE, 5)

    def test_chunks_into_rows_of_five(self):
        names = [f"Killer {i}" for i in range(12)]
        rows = build_rows(names)
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0], names[0:5])
        self.assertEqual(rows[1], names[5:10])
        self.assertEqual(rows[2], names[10:12])

    def test_empty_list_yields_no_rows(self):
        self.assertEqual(build_rows([]), [])


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


class HistoryRosterTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
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


class TestGetOwnedKillerNamesByRelease(HistoryRosterTestCase):
    def test_sorted_by_release_number(self):
        seed_killer("The Nurse", release_number=4)
        seed_killer("The Trapper", release_number=1)
        seed_killer("The Wraith", release_number=2)
        user_id = self.register_user("rosteruser")

        names = get_owned_killer_names_by_release(user_id, self.ownership_service)
        self.assertEqual(names, ["The Trapper", "The Wraith", "The Nurse"])

    def test_null_release_number_sorts_last(self):
        seed_killer("The Trapper", release_number=1)
        seed_killer("The Mystery", release_number=None)
        user_id = self.register_user("nulluser")

        names = get_owned_killer_names_by_release(user_id, self.ownership_service)
        self.assertEqual(names, ["The Trapper", "The Mystery"])

    def test_unowned_killers_excluded(self):
        seed_killer("The Trapper", release_number=1)
        char2 = seed_killer("The Wraith", release_number=2)
        user_id = self.register_user("partialowner")
        self.ownership_service.set_character_ownership(user_id, char2.id, is_owned=False)

        names = get_owned_killer_names_by_release(user_id, self.ownership_service)
        self.assertEqual(names, ["The Trapper"])


class TestPerkNameHelpers(HistoryRosterTestCase):
    def test_general_perks_have_no_character(self):
        db.session.add(Perk(name="Whispers", character_id=None, category="Killer"))
        db.session.add(Perk(name="A Nurse's Calling", character_id=None, category="Killer"))
        db.session.commit()

        names = get_general_killer_perk_names()
        self.assertIn("Whispers", names)
        self.assertIn("A Nurse's Calling", names)

    def test_general_perks_exclude_teachables(self):
        char = seed_killer("The Trapper", release_number=1, perk_count=1)
        db.session.commit()

        names = get_general_killer_perk_names()
        self.assertNotIn("The Trapper Perk 1", names)

    def test_teachable_perks_for_killer(self):
        seed_killer("The Trapper", release_number=1, perk_count=2)

        names = get_killer_teachable_perk_names("The Trapper")
        self.assertEqual(set(names), {"The Trapper Perk 1", "The Trapper Perk 2"})

    def test_teachable_perks_for_unknown_killer(self):
        self.assertEqual(get_killer_teachable_perk_names("Nobody"), [])


if __name__ == "__main__":
    unittest.main()
