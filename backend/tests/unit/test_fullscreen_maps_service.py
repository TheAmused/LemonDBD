# backend/tests/unit/test_fullscreen_maps_service.py
import gc
import tempfile
import unittest
from pathlib import Path
import pytest
from app.services.db_service import DatabaseService
from app.services.map_service import MapService


@pytest.mark.unit
class TestFullscreenMapsService(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self._temp_dir.name) / "test_fullscreen_maps.db")
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.service = MapService(db_service=self.db_service)

    def tearDown(self):
        gc.collect()
        try:
            self._temp_dir.cleanup()
        except Exception:
            pass

    def test_get_map_with_seed_variants_and_pallets(self):
        detail = self.service.get_map_by_id("coal_tower", seed_variant="seed_a", floor=1)
        self.assertIsNotNone(detail)
        self.assertIn("tiles", detail)
        self.assertIn("objectives", detail)
        
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

        objectives = detail["objectives"]
        self.assertGreaterEqual(len(objectives), 1)
        obj_types = {obj["type"] for obj in objectives if "type" in obj}
        expected_types = {"totem", "generator", "exit_gate", "hatch", "chest", "basement"}
        for et in expected_types:
            self.assertIn(et, obj_types)


if __name__ == "__main__":
    unittest.main()
