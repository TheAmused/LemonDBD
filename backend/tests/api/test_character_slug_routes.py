import unittest
from app import create_app


class TestCharacterSlugRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        with self.app.app_context():
            from app.core.extensions import db
            from app.models import Character, Perk
            from sqlalchemy import select
            db.create_all()
            
            meg = db.session.scalars(select(Character).where(Character.name == "Meg Thomas")).first()
            if not meg:
                meg = Character(name="Meg Thomas", role="Survivor", release_number=2)
                db.session.add(meg)
                db.session.flush()
                db.session.add(Perk(name="Sprint Burst", character_id=meg.id, description="Run fast", icon_url="url", icon_local_path="path"))
            
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            if not trapper:
                trapper = Character(name="The Trapper", role="Killer", release_number=1, real_name="Evan MacMillan")
                db.session.add(trapper)
                db.session.flush()
                db.session.add(Perk(name="Agitation", character_id=trapper.id, description="Carry fast", icon_url="url", icon_local_path="path"))
            else:
                trapper.real_name = "Evan MacMillan"
            
            db.session.commit()

    def test_lookup_by_exact_name(self):
        res = self.client.get("/api/v1/characters/Meg%20Thomas/detail")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["data"]["character"]["name"], "Meg Thomas")

    def test_lookup_by_underscore_slug(self):
        res = self.client.get("/api/v1/characters/meg_thomas/detail")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["data"]["character"]["name"], "Meg Thomas")

    def test_lookup_by_hyphen_slug(self):
        res = self.client.get("/api/v1/characters/the-trapper/detail")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["data"]["character"]["name"], "The Trapper")

    def test_lookup_by_real_name(self):
        res = self.client.get("/api/v1/characters/evan_macmillan/detail")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["data"]["character"]["name"], "The Trapper")

    def test_character_database_dlc_fields(self):
        with self.app.app_context():
            from app.services.scraper_service import ScraperService
            ScraperService().seed_canonical_characters()
            
        res = self.client.get("/api/v1/characters/the_nemesis/detail")
        self.assertEqual(res.status_code, 200)
        char = res.get_json()["data"]["character"]
        self.assertEqual(char["name"], "The Nemesis")
        self.assertEqual(char["chapter_name"], "Chapter 20: Resident Evil")
        self.assertEqual(char["chapter_number"], "20")
        self.assertEqual(char["dlc_type"], "licensed_chapter")
        self.assertTrue(char["is_licensed"])
        self.assertEqual(char["release_year"], 2021)
        self.assertIn("Leon S. Kennedy", char["dlc_counterparts"])
        self.assertTrue(len(char["lore"]) > 0)


if __name__ == "__main__":
    unittest.main()

