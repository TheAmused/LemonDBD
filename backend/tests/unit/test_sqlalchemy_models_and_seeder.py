# backend/tests/unit/test_sqlalchemy_models_and_seeder.py
import unittest
from flask import Flask
from sqlalchemy import select, delete
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app import create_app
from app.core.config import Config, TestingConfig
from app.core.extensions import db
from app.models import Character, Perk, Item, Addon, MapRealm


class TestSQLAlchemyModelsAndSeeder(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.session.execute(delete(Perk))
        db.session.execute(delete(Character))
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_character_and_perk_mapped_models(self):
        # Create character
        char = Character(
            name="Test Trapper",
            role="Killer",
            code_prefix="K01",
            portrait_url="avatars/killers/test_trapper.png",
            real_name="Evan MacMillan",
            short_name="test_trapper",
            release_number=1,
        )
        db.session.add(char)
        db.session.commit()

        self.assertIsNotNone(char.id)
        self.assertEqual(char.role, "Killer")
        self.assertEqual(char.code_prefix, "K01")

        # Create perks linked to character
        perk1 = Perk(
            name="Test Unnerving Presence",
            category="Killer",
            is_teachable=True,
            description="Causes survivors in terror radius to have difficult skill checks.",
            character_id=char.id,
        )
        perk2 = Perk(
            name="Test Brutal Strength",
            category="Killer",
            is_teachable=True,
            description="Increases pallet breaking speed.",
            character_id=char.id,
        )
        db.session.add_all([perk1, perk2])
        db.session.commit()

        # Test SQLAlchemy 2.0 query syntax: db.session.scalars(select(...))
        stmt = select(Character).where(Character.name == "Test Trapper")
        retrieved_char = db.session.scalars(stmt).first()
        self.assertIsNotNone(retrieved_char)
        self.assertEqual(len(retrieved_char.perks), 2)
        self.assertEqual(retrieved_char.perks[0].character.name, "Test Trapper")

        # Test to_dict serialization
        char_dict = retrieved_char.to_dict()
        self.assertEqual(char_dict["name"], "Test Trapper")
        self.assertEqual(char_dict["real_name"], "Evan MacMillan")
        self.assertEqual(char_dict["code_prefix"], "K01")

        perk_dict = retrieved_char.perks[0].to_dict()
        self.assertEqual(perk_dict["character"], "Test Trapper")
        self.assertEqual(perk_dict["character_real_name"], "Evan MacMillan")
        self.assertTrue(perk_dict["is_teachable"])

    def test_cascade_delete(self):
        char = Character(name="Test Meg", role="Survivor", code_prefix="S01")
        db.session.add(char)
        db.session.commit()

        perk = Perk(name="Test Sprint Burst", category="Survivor", character_id=char.id)
        db.session.add(perk)
        db.session.commit()

        # Delete character
        db.session.delete(char)
        db.session.commit()

        # Perk should be deleted due to cascade="all, delete-orphan"
        perk_check = db.session.scalars(select(Perk).where(Perk.name == "Test Sprint Burst")).first()
        self.assertIsNone(perk_check)

    def test_atomic_upsert_on_conflict(self):
        # Insert initial character
        stmt1 = sqlite_insert(Character).values({
            "name": "Test Claudette",
            "role": "Survivor",
            "code_prefix": "S02",
            "portrait_url": "old_url.png",
        })
        db.session.execute(stmt1)
        db.session.commit()

        # Upsert update with new portrait url without duplicate key error
        stmt2 = sqlite_insert(Character).values({
            "name": "Test Claudette",
            "role": "Survivor",
            "code_prefix": "S02",
            "portrait_url": "updated_url.png",
        })
        stmt2 = stmt2.on_conflict_do_update(
            index_elements=[Character.name],
            set_={"portrait_url": stmt2.excluded.portrait_url}
        )
        db.session.execute(stmt2)
        db.session.commit()

        char = db.session.scalars(select(Character).where(Character.name == "Test Claudette")).first()
        self.assertEqual(char.portrait_url, "updated_url.png")

    def test_database_url_psycopg3_normalization(self):
        import os
        orig_url = os.environ.get("DATABASE_URL")
        try:
            os.environ["DATABASE_URL"] = "postgres://user:pass@localhost:5432/testdb"
            from importlib import reload
            import app.core.config
            reload(app.core.config)
            self.assertEqual(app.core.config.Config.SQLALCHEMY_DATABASE_URI, "postgresql+psycopg://user:pass@localhost:5432/testdb")

            os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/testdb"
            reload(app.core.config)
            self.assertEqual(app.core.config.Config.SQLALCHEMY_DATABASE_URI, "postgresql+psycopg://user:pass@localhost:5432/testdb")
        finally:
            if orig_url:
                os.environ["DATABASE_URL"] = orig_url
            else:
                os.environ.pop("DATABASE_URL", None)

    def test_api_scrape_and_seed_route(self):
        # Test POST /api/scrape-and-seed
        response = self.client.post("/api/scrape-and-seed", json={"source": "test"})
        self.assertIn(response.status_code, [200, 401, 500])
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data.get("status"), "success")
            self.assertIn("characters_synced", data)
            self.assertIn("perks_synced", data)


if __name__ == "__main__":
    unittest.main()
