import os
import unittest
from app.services.db_service import DatabaseService
from app.services.map_service import MapService

class TestFullscreenMapsService(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_fullscreen_maps.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.service = MapService(db_service=self.db_service)

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_get_map_with_seed_variants_and_pallets(self):
        detail = self.service.get_map_by_id("coal_tower", seed_variant="seed_a", floor=1)
        self.assertIsNotNone(detail)
        self.assertIn("tiles", detail)
        self.assertIn("objectives", detail)
        
        # Verify tiles structure and pallet safety ratings
        tiles = detail["tiles"]
        self.assertGreaterEqual(len(tiles), 1)
        
        for tile in tiles:
            self.assertIn("has_pallet", tile)
            self.assertIn("has_window", tile)
            self.assertIn("pallet_safety_rating", tile)
            self.assertIn("looping_tips", tile)
            self.assertIn("mindgame_counter", tile)

        pallets = [t for t in tiles if t.get("has_pallet")]
        self.assertGreaterEqual(len(pallets), 1)
        for p in pallets:
            self.assertIn(p["pallet_safety_rating"], ["god", "safe", "mindgameable", "unsafe"])

        # Verify objectives structure and coverage
        objectives = detail["objectives"]
        self.assertGreaterEqual(len(objectives), 1)
        obj_types = {obj["type"] for obj in objectives if "type" in obj}
        expected_types = {"totem", "generator", "exit_gate", "hatch", "chest", "basement"}
        for et in expected_types:
            self.assertIn(et, obj_types)

if __name__ == "__main__":
    unittest.main()
