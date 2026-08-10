import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.services.scraper_service import (
    CharacterData,
    NightlightScraperDriver,
    PerkData,
    ScraperConfig,
    ScraperService,
    WikiScraperDriver,
)


class TestScraperFallback(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_dir = Path(self.temp_dir.name)
        self.service = ScraperService(base_dir=self.base_dir)

        # Reset class-level _status
        ScraperService._status = {
            "is_running": False,
            "progress": 0,
            "total": 0,
            "current_step": "idle",
            "last_run": None,
            "error": None,
            "fallback_used": False,
            "last_used_source": "nightlight",
        }

        self.sample_characters = [
            CharacterData(
                name="Dwight Fairfield",
                real_name="Dwight Fairfield",
                wiki_slug="Dwight_Fairfield",
                short_name="dwight",
                category="Survivor",
                avatar_url="https://example.com/avatar.png",
                avatar_local_path="avatars/survivors/dwight.png",
            )
        ]
        self.sample_perks = [
            PerkData(
                name="Bond",
                character="Dwight Fairfield",
                character_real_name="Dwight Fairfield",
                character_avatar_path="avatars/survivors/dwight.png",
                category="Survivor",
                description="Auras of allies are revealed.",
                icon_url="https://example.com/icon.png",
                icon_local_path="icons/survivors/Dwight Fairfield/bond.png",
            )
        ]

    def tearDown(self):
        self.temp_dir.cleanup()

    @patch("app.services.scraper_service.asyncio.run")
    def test_automatic_fallback_on_nightlight_failure(self, mock_asyncio_run):
        # Mock Nightlight driver to raise exception
        self.service.nightlight_driver.scrape_all = MagicMock(
            side_effect=Exception("Nightlight API 503")
        )
        # Mock Wiki driver to return sample data
        self.service.wiki_driver.scrape_all = MagicMock(
            return_value=(self.sample_characters, self.sample_perks)
        )

        stats = self.service.run_sync_pipeline()

        # Verify wiki driver was invoked
        self.service.nightlight_driver.scrape_all.assert_called_once()
        self.service.wiki_driver.scrape_all.assert_called_once()

        # Verify status updates
        status = ScraperService.get_status()
        self.assertTrue(status["fallback_used"])
        self.assertEqual(status["last_used_source"], "wiki")
        self.assertEqual(status["current_step"], "completed")

        # Verify config saved with last_used_source="wiki"
        config = self.service.load_config()
        self.assertEqual(config.last_used_source, "wiki")

        # Verify returned stats
        self.assertEqual(stats["total_perks"], 1)
        self.assertEqual(stats["total_characters"], 1)

    @patch("app.services.scraper_service.asyncio.run")
    def test_no_fallback_when_disabled(self, mock_asyncio_run):
        # Disable fallback in config
        self.service.save_config({"fallback_to_wiki": False})

        # Mock Nightlight driver to raise exception
        self.service.nightlight_driver.scrape_all = MagicMock(
            side_effect=Exception("Nightlight API 503")
        )
        self.service.wiki_driver.scrape_all = MagicMock()

        # Verify exception is raised and Wiki driver is NOT invoked
        with self.assertRaises(Exception) as ctx:
            self.service.run_sync_pipeline()

        self.assertIn("Nightlight API 503", str(ctx.exception))
        self.service.nightlight_driver.scrape_all.assert_called_once()
        self.service.wiki_driver.scrape_all.assert_not_called()

    @patch("app.services.scraper_service.asyncio.run")
    def test_no_fallback_when_disabled_via_override(self, mock_asyncio_run):
        # Mock Nightlight driver to raise exception
        self.service.nightlight_driver.scrape_all = MagicMock(
            side_effect=Exception("Nightlight API 503")
        )
        self.service.wiki_driver.scrape_all = MagicMock()

        # Call with override_fallback=False
        with self.assertRaises(Exception):
            self.service.run_sync_pipeline(override_fallback=False)

        self.service.wiki_driver.scrape_all.assert_not_called()

    @patch("app.services.scraper_service.asyncio.run")
    def test_successful_nightlight_scrape_no_fallback(self, mock_asyncio_run):
        self.service.nightlight_driver.scrape_all = MagicMock(
            return_value=(self.sample_characters, self.sample_perks)
        )
        self.service.wiki_driver.scrape_all = MagicMock()

        stats = self.service.run_sync_pipeline()

        self.service.nightlight_driver.scrape_all.assert_called_once()
        self.service.wiki_driver.scrape_all.assert_not_called()

        status = ScraperService.get_status()
        self.assertFalse(status["fallback_used"])
        self.assertEqual(status["last_used_source"], "nightlight")


if __name__ == "__main__":
    unittest.main()
