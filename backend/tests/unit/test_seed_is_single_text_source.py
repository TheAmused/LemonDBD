# backend/tests/unit/test_seed_is_single_text_source.py
"""Seed JSON is the only source of content text: no runtime translation bundle,
and every perk carries its own markup-bearing translations."""
import json
from pathlib import Path

import pytest

APP = Path(__file__).resolve().parents[2] / "app"
SEEDS = APP / "seeds" / "data" / "content"


@pytest.mark.unit
def test_translation_bundle_is_not_part_of_the_app() -> None:
    assert not (APP / "translations").exists()
    assert not (APP / "services" / "translations").exists()
    init_db_source = (APP / "services" / "db_service.py").read_text(encoding="utf-8")
    assert "sync_all_locales_to_db" not in init_db_source


@pytest.mark.unit
def test_perk_descriptions_carry_markup_not_html_in_every_locale() -> None:
    perks = json.loads((SEEDS / "perks.json").read_text(encoding="utf-8"))["perks"]
    translated = 0
    for perk in perks:
        assert "<" not in perk["description"], perk["name"]
        for loc, entry in (perk.get("translations") or {}).items():
            text = (entry or {}).get("description")
            if text:
                translated += 1
                assert "<" not in text, (perk["name"], loc)
    # A perk without a localized description falls back to the English one.
    assert translated >= len(perks) * 4 * 0.95
