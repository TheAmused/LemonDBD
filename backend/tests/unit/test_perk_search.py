# backend/tests/unit/test_perk_search.py
import pytest
from app.services.perks.utils import normalize_search_key
from app.services.perks.queries_perk import perk_search_prefilter


def test_normalize_search_key_accented_characters():
    assert normalize_search_key("Gefährte") == "gefahrte"
    assert normalize_search_key("Przełom") == "przelom"
    assert normalize_search_key("Bärenstark") == "barenstark"
    assert normalize_search_key("Résilience") == "resilience"


def test_perk_search_prefilter_sqlite_returns_none():
    # SQLite dialect does not run unaccent, returns None for full fallback
    assert perk_search_prefilter("Gefährte", "de") is None
