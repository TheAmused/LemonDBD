import unittest
from app import create_app
from app.services.map_service import MapService

class TestMapService(unittest.TestCase):
    def setUp(self):
        self.service = MapService()
        self.app = create_app()
        self.client = self.app.test_client()

    def test_get_maps_list(self):
        maps = self.service.get_maps()
        self.assertGreaterEqual(len(maps), 6)
        names = [m['name'] for m in maps]
        self.assertIn("Coal Tower", names)

    def test_get_map_detail(self):
        detail = self.service.get_map_by_id("coal_tower")
        self.assertIsNotNone(detail)
        self.assertEqual(detail["name"], "Coal Tower")
        self.assertIn("totem_spawns", detail)
        self.assertEqual(len(detail["totem_spawns"]), 5)

    def test_api_maps_endpoint(self):
        res = self.client.get('/api/v1/maps')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("maps", data)

    def test_api_map_detail_endpoint(self):
        res = self.client.get('/api/v1/maps/azarov_resting_place')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("map", data)
        self.assertEqual(data["map"]["name"], "Azarov's Resting Place")

if __name__ == "__main__":
    unittest.main()
