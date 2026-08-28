# backend/tests/unit/test_description_cleaner.py
import json
import tempfile
import unittest
from pathlib import Path
import pytest

from app.services.perk_service import PerkService
from app.services.scraper_service import ScraperService


@pytest.mark.unit
class TestDescriptionCleaner(unittest.TestCase):
    def test_clean_description_text(self):
        raw_html = "<p>Increases your <span>movement speed</span> by <b>5%</b>.</p>"
        cleaned = ScraperService.clean_description_text(raw_html)
        self.assertEqual(cleaned, "Increases your movement speed by 5%.")

        raw_fragment = 'data-discover="true">Unlocks potential in your Aura-reading ability.'
        cleaned_fragment = ScraperService.clean_description_text(raw_fragment)
        self.assertEqual(cleaned_fragment, "Unlocks potential in your Aura-reading ability.")

        raw_attr_tag = '<div data-discover="true">Unlocks potential in your Aura-reading ability.</div>'
        cleaned_attr_tag = ScraperService.clean_description_text(raw_attr_tag)
        self.assertEqual(cleaned_attr_tag, "Unlocks potential in your Aura-reading ability.")

        raw_duplicate = "Sprint Burst\nUnlocks potential in your Aura-reading ability.\nSprint Burst"
        cleaned_dup = ScraperService.clean_description_text(raw_duplicate)
        self.assertEqual(cleaned_dup, "Sprint Burst\nUnlocks potential in your Aura-reading ability.")

    def test_perk_service_sanitizes_descriptions(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            perks_file = tmp_path / "perks.json"
            items_file = tmp_path / "items.json"
            addons_file = tmp_path / "addons.json"

            perks_data = [
                {
                    "name": "Test Perk",
                    "character": "General",
                    "category": "Survivor",
                    "description": 'data-discover="true">Test perk description.',
                    "icon_url": "http://example.com/icon.png",
                    "icon_local_path": "icons/test.png",
                }
            ]
            items_data = [
                {
                    "name": "Test Item",
                    "category": "Item",
                    "role": "Survivor",
                    "description": '<p data-discover="true">Test item description.</p>',
                    "icon_url": "",
                    "icon_local_path": "",
                    "rarity": "Common",
                }
            ]
            addons_data = [
                {
                    "name": "Test Addon",
                    "associated_target": "Test Item",
                    "category": "Survivor",
                    "description": 'data-discover="true">Test addon description.',
                    "icon_url": "",
                    "icon_local_path": "",
                    "rarity": "Rare",
                }
            ]

            with open(perks_file, "w", encoding="utf-8") as f:
                json.dump(perks_data, f)
            with open(items_file, "w", encoding="utf-8") as f:
                json.dump(items_data, f)
            with open(addons_file, "w", encoding="utf-8") as f:
                json.dump(addons_data, f)

            service = PerkService(data_path=perks_file)
            service._load_fallback_files()

            self.assertEqual(service._cache[0]["description"], "Test perk description.")
            self.assertEqual(service._items_cache[0]["description"], "Test item description.")
            self.assertEqual(service._addons_cache[0]["description"], "Test addon description.")


if __name__ == "__main__":
    unittest.main()
