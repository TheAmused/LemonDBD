import unittest
from app import create_app


class TestCharacterDetailRoute(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

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
