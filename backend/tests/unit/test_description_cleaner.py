# backend/tests/unit/test_description_cleaner.py
import json
import tempfile
from pathlib import Path
import pytest
from app.services.perk_service import PerkService
from app.services.scraper_service import ScraperService


@pytest.mark.unit
class TestDescriptionCleaner:
    """Tests for HTML parsing, data-discover attribute cleaning, and fallback sanitization."""

    @pytest.mark.parametrize(
        "raw_html, expected_clean",
        [
            (
                "<p>Increases your <span>movement speed</span> by <b>5%</b>.</p>",
                "Increases your movement speed by 5%.",
            ),
            (
                'data-discover="true">Unlocks potential in your Aura-reading ability.',
                "Unlocks potential in your Aura-reading ability.",
            ),
            (
                '<div data-discover="true">Unlocks potential in your Aura-reading ability.</div>',
                "Unlocks potential in your Aura-reading ability.",
            ),
            (
                "Sprint Burst\nUnlocks potential in your Aura-reading ability.\nSprint Burst",
                "Sprint Burst\nUnlocks potential in your Aura-reading ability.",
            ),
            (
                "Grants &amp; boosts speed &lt;5%&gt; for 3 seconds.",
                "Grants & boosts speed <5%> for 3 seconds.",
            ),
            (
                "   Extra whitespace and newlines\n\n\n",
                "Extra whitespace and newlines",
            ),
            (
                "",
                "",
            ),
        ],
    )
    def test_clean_description_text_parametrized(self, raw_html: str, expected_clean: str) -> None:
        cleaned = ScraperService.clean_description_text(raw_html)
        assert cleaned == expected_clean

    def test_perk_service_sanitizes_descriptions(self) -> None:
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

            assert service._cache[0]["description"] == "Test perk description."
            assert service._items_cache[0]["description"] == "Test item description."
            assert service._addons_cache[0]["description"] == "Test addon description."

    def test_perk_service_handles_missing_fallback_files_gracefully(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            non_existent_path = Path(tmpdir) / "does_not_exist.json"
            service = PerkService(data_path=non_existent_path)
            # Must initialize safely without uncaught crashes
            assert isinstance(service._cache, list)
