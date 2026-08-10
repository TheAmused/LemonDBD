import json
import tempfile
import unittest
from pathlib import Path

from app.services.scraper_service import ScraperConfig, ScraperService


class TestScraperConfig(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_dir = Path(self.temp_dir.name)
        self.service = ScraperService(base_dir=self.base_dir)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_scraper_config_defaults(self):
        config = ScraperConfig()
        self.assertEqual(config.source, "nightlight")
        self.assertTrue(config.fallback_to_wiki)
        self.assertEqual(config.last_used_source, "nightlight")
        self.assertIsNone(config.last_run_timestamp)

    def test_load_config_returns_defaults_when_file_missing(self):
        config = self.service.load_config()
        self.assertIsInstance(config, ScraperConfig)
        self.assertEqual(config.source, "nightlight")
        self.assertTrue(config.fallback_to_wiki)
        self.assertEqual(config.last_used_source, "nightlight")
        self.assertIsNone(config.last_run_timestamp)

    def test_save_and_load_config_with_dict(self):
        updated = self.service.save_config({
            "source": "wiki",
            "fallback_to_wiki": False,
            "last_used_source": "wiki",
            "last_run_timestamp": "2026-08-10T12:00:00Z"
        })
        self.assertIsInstance(updated, ScraperConfig)
        self.assertEqual(updated.source, "wiki")
        self.assertFalse(updated.fallback_to_wiki)

        # Reload from disk
        loaded = self.service.load_config()
        self.assertEqual(loaded.source, "wiki")
        self.assertFalse(loaded.fallback_to_wiki)
        self.assertEqual(loaded.last_used_source, "wiki")
        self.assertEqual(loaded.last_run_timestamp, "2026-08-10T12:00:00Z")

        # Verify JSON file structure on disk
        config_path = self.base_dir / "data" / "scraper_config.json"
        self.assertTrue(config_path.exists())
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(data["source"], "wiki")

    def test_save_and_load_config_with_dataclass(self):
        config_obj = ScraperConfig(
            source="custom",
            fallback_to_wiki=False,
            last_used_source="custom",
            last_run_timestamp="2026-01-01T00:00:00Z"
        )
        saved = self.service.save_config(config_obj)
        self.assertEqual(saved.source, "custom")

        loaded = self.service.load_config()
        self.assertEqual(loaded.source, "custom")
        self.assertFalse(loaded.fallback_to_wiki)
        self.assertEqual(loaded.last_used_source, "custom")
        self.assertEqual(loaded.last_run_timestamp, "2026-01-01T00:00:00Z")


if __name__ == "__main__":
    unittest.main()
