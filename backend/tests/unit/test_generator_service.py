# backend/tests/unit/test_generator_service.py
import gc
import tempfile
import unittest
from pathlib import Path
import pytest
from app.services.db_service import DatabaseService
from app.services.generator_service import GeneratorService


@pytest.mark.unit
class TestGeneratorService(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self._temp_dir.name) / "test_generator.db")
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.service = GeneratorService(db_service=self.db_service)

    def tearDown(self):
        gc.collect()
        try:
            self._temp_dir.cleanup()
        except Exception:
            pass

    def test_add_drawn_perks_and_reset(self):
        drawn_before = self.service.get_drawn_perks("Survivor")
        self.assertEqual(len(drawn_before), 0)

        self.service.add_drawn_perks("Survivor", ["Sprint Burst", "Adrenaline"])
        drawn_after = self.service.get_drawn_perks("Survivor")
        self.assertEqual(len(drawn_after), 2)
        self.assertIn("Sprint Burst", drawn_after)

        self.service.reset_drawn_perks("Survivor")
        drawn_reset = self.service.get_drawn_perks("Survivor")
        self.assertEqual(len(drawn_reset), 0)

    def test_get_and_update_config(self):
        config = self.service.get_config()
        self.assertEqual(config["role"], "Survivor")
        self.assertEqual(config["no_repeat_perks"], 1)

        updated = self.service.update_config({"role": "Killer", "no_repeat_perks": 0})
        self.assertEqual(updated["role"], "Killer")
        self.assertEqual(updated["no_repeat_perks"], 0)

        config_after = self.service.get_config()
        self.assertEqual(config_after["role"], "Killer")
        self.assertEqual(config_after["no_repeat_perks"], 0)


if __name__ == "__main__":
    unittest.main()
