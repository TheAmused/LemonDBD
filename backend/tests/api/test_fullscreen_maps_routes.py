# backend/tests/api/test_fullscreen_maps_routes.py
import unittest
from app import create_app


class TestFullscreenMapsRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_get_map_detail_with_seed_and_floor_params(self):
        response = self.client.get("/api/v1/maps/coal_tower?seed=seed_b&floor=2")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("map", data)
        map_detail = data["map"]
        self.assertIn("tiles", map_detail)
        self.assertIn("objectives", map_detail)
        self.assertEqual(map_detail.get("seed_variant"), "seed_b")
        self.assertEqual(map_detail.get("floor"), 2)

    def test_get_map_detail_default_seed_a_floor_1(self):
        response = self.client.get("/api/v1/maps/coal_tower?seed=seed_a&floor=1")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("map", data)
        map_detail = data["map"]
        self.assertIn("tiles", map_detail)
        self.assertIn("objectives", map_detail)
        self.assertEqual(map_detail.get("seed_variant"), "seed_a")
        self.assertEqual(map_detail.get("floor"), 1)


if __name__ == "__main__":
    unittest.main()
