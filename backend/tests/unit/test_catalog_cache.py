# backend/tests/unit/test_catalog_cache.py
import time
from unittest.mock import MagicMock, patch

import pytest
from app.core.cache import SimpleTTLCache, catalog_cache


def test_simple_ttl_cache_basic_operations():
    cache = SimpleTTLCache(maxsize=10, default_ttl=5.0)
    assert cache.size() == 0
    assert cache.get("key1") is None

    cache.set("key1", {"data": 123})
    assert cache.size() == 1
    assert cache.get("key1") == {"data": 123}


def test_simple_ttl_cache_expiration():
    cache = SimpleTTLCache(maxsize=10, default_ttl=0.05)
    cache.set("ephemeral", "hello")
    assert cache.get("ephemeral") == "hello"

    time.sleep(0.06)
    assert cache.get("ephemeral") is None
    assert cache.size() == 0


def test_simple_ttl_cache_eviction_when_full():
    cache = SimpleTTLCache(maxsize=3, default_ttl=60.0)
    cache.set("k1", "v1")
    cache.set("k2", "v2")
    cache.set("k3", "v3")
    assert cache.size() == 3

    # Adding 4th item should evict oldest (k1)
    cache.set("k4", "v4")
    assert cache.size() == 3
    assert cache.get("k1") is None
    assert cache.get("k4") == "v4"


def test_simple_ttl_cache_clear():
    cache = SimpleTTLCache(maxsize=10, default_ttl=60.0)
    cache.set("k1", "v1")
    cache.set("k2", "v2")
    assert cache.size() == 2

    cache.clear()
    assert cache.size() == 0
    assert cache.get("k1") is None


def test_fetch_perks_caches_unauthenticated_request():
    catalog_cache.clear()
    mock_service = MagicMock()
    mock_service.ALLOWED_SORT_FIELDS = {"name", "character", "category"}

    # Mock DB scalars returning empty or mock items
    with patch("app.services.perks.queries_perk.db") as mock_db:
        mock_db.session.scalars.return_value.unique.return_value.all.return_value = []
        mock_db.session.scalar.return_value = 0

        from app.services.perks.queries_perk import fetch_perks

        # First call hits DB
        res1 = fetch_perks(mock_service, category="survivor", page=1, limit=50)
        assert mock_db.session.scalars.call_count > 0

        # Reset call count
        mock_db.session.scalars.reset_mock()

        # Second identical call should hit catalog_cache without hitting DB
        res2 = fetch_perks(mock_service, category="survivor", page=1, limit=50)
        assert mock_db.session.scalars.call_count == 0
        assert res1 == res2


def test_fetch_characters_caches_request():
    catalog_cache.clear()
    mock_service = MagicMock()
    mock_service._characters_cache = []

    with patch("app.services.perks.queries_character._run_characters_query") as mock_run_query:
        mock_char = MagicMock()
        mock_char.to_dict.return_value = {"id": 1, "name": "Dwight Fairfield", "role": "Survivor"}
        mock_run_query.return_value = [mock_char]

        from app.services.perks.queries_character import fetch_characters

        # First call hits DB query
        res1 = fetch_characters(mock_service, category="Survivor")
        assert mock_run_query.call_count == 1

        mock_run_query.reset_mock()

        # Second call hits cache
        res2 = fetch_characters(mock_service, category="Survivor")
        assert mock_run_query.call_count == 0
        assert res1 == res2
