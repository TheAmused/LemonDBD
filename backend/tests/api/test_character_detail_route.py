import unittest
from app import create_app


class TestCharacterDetailRoute(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        with self.app.app_context():
            from app.core.extensions import db
            from app.models import Character, Perk
            from sqlalchemy import select
            db.create_all()
            existing = db.session.scalars(select(Character).where(Character.name == "Meg Thomas")).first()
            if not existing:
                c = Character(name="Meg Thomas", role="Survivor", release_number=2)
                db.session.add(c)
                db.session.flush()
            else:
                c = existing
            perk = db.session.scalars(select(Perk).where(Perk.name == "Sprint Burst")).first()
            if not perk:
                db.session.add(Perk(name="Sprint Burst", character_id=c.id, description="Run fast", icon_url="url", icon_local_path="path"))
            else:
                perk.character_id = c.id
            db.session.commit()

    def test_character_detail(self):
        response = self.client.get("/api/v1/characters/Meg%20Thomas/detail")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("data", data)
        detail = data["data"]
        self.assertIn("character", detail)
        self.assertIn("perks", detail)
        self.assertIn("addons", detail)
        self.assertEqual(detail["character"]["name"], "Meg Thomas")
        self.assertIsInstance(detail["perks"], list)
        self.assertTrue(len(detail["perks"]) > 0)
        for perk in detail["perks"]:
            self.assertIn("name", perk)
            self.assertIn("description", perk)
            self.assertIn("icon_url", perk)
            self.assertIn("icon_local_path", perk)

    def test_character_detail_not_found(self):
        response = self.client.get("/api/v1/characters/NonExistentCharacter12345/detail")
        self.assertEqual(response.status_code, 404)
        data = response.get_json()
        self.assertIn("error", data)


if __name__ == "__main__":
    unittest.main()
