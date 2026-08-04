import unittest
from app import create_app


class TestGeneratorRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_get_config_returns_200(self):
        response = self.client.get("/api/v1/generator/config")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("config", data)

    def test_update_config_returns_200(self):
        response = self.client.post("/api/v1/generator/config", json={"gen_mode": "wheel"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("config", data)
        self.assertEqual(data["config"]["gen_mode"], "wheel")

    def test_get_drawn_perks_returns_200(self):
        response = self.client.get("/api/v1/generator/drawn?role=Survivor")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("drawn_perks", data)
        self.assertIsInstance(data["drawn_perks"], list)

    def test_add_drawn_perks_returns_200(self):
        response = self.client.post(
            "/api/v1/generator/draw",
            json={"role": "Survivor", "perks": ["Sprint Burst", "Adrenaline"]},
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("drawn_perks", data)
        self.assertIn("Sprint Burst", data["drawn_perks"])

    def test_reset_drawn_perks_returns_200(self):
        response = self.client.post("/api/v1/generator/reset", json={"role": "Survivor"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["drawn_perks"], [])


if __name__ == "__main__":
    unittest.main()
