# backend/tests/unit/core/test_catalog_cache.py
import time
from unittest.mock import MagicMock, patch

import pytest
from app.core import catalog_memo, redis_cache
from app.core.cache import SimpleTTLCache


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


def test_simple_ttl_cache_distinguishes_a_cached_none_from_a_miss():
    cache = SimpleTTLCache(maxsize=10, default_ttl=60.0)
    missing = object()
    cache.set("k", None)
    assert cache.get("k", missing) is None
    assert cache.get("other", missing) is missing


def test_simple_ttl_cache_replacing_a_key_does_not_evict_another():
    cache = SimpleTTLCache(maxsize=2, default_ttl=60.0)
    cache.set("k1", "v1")
    cache.set("k2", "v2")
    cache.set("k2", "v2b")
    assert cache.size() == 2
    assert cache.get("k1") == "v1"
    assert cache.get("k2") == "v2b"


def test_simple_ttl_cache_refreshing_a_key_moves_it_to_the_back_of_the_eviction_order():
    cache = SimpleTTLCache(maxsize=2, default_ttl=60.0)
    cache.set("k1", "v1")
    cache.set("k2", "v2")
    cache.set("k1", "v1b")
    cache.set("k3", "v3")
    assert cache.get("k2") is None
    assert cache.get("k1") == "v1b"
    assert cache.get("k3") == "v3"


def test_simple_ttl_cache_delete():
    cache = SimpleTTLCache(maxsize=2, default_ttl=60.0)
    cache.set("k1", "v1")
    cache.delete("k1")
    cache.delete("never-there")
    assert cache.get("k1") is None


@pytest.fixture
def isolated_generation(monkeypatch):
    """Run against the in-process generation counter, whatever the environment says."""
    monkeypatch.setattr(redis_cache, "get_client", lambda: None)
    catalog_memo.clear()
    yield
    catalog_memo.clear()


def test_remember_serves_the_second_call_from_the_memo(isolated_generation):
    calls = []

    def compute():
        calls.append(1)
        return {"n": len(calls)}

    assert catalog_memo.remember(("k",), compute, ttl=60.0) == {"n": 1}
    assert catalog_memo.remember(("k",), compute, ttl=60.0) == {"n": 1}
    assert len(calls) == 1


def test_remember_recomputes_after_the_generation_is_bumped(isolated_generation):
    """The stale copy a bump cannot reach was the cause of the repopulated Redis entry."""
    values = iter(["old", "new"])
    assert catalog_memo.remember(("k",), lambda: next(values), ttl=60.0) == "old"

    redis_cache.bump_catalog_version()

    assert catalog_memo.remember(("k",), lambda: next(values), ttl=60.0) == "new"


def test_remember_files_a_result_under_the_generation_it_started_in(isolated_generation):
    """A bump that lands while the query runs must not leave its rows under the new generation."""

    def compute_and_get_bumped():
        redis_cache.bump_catalog_version()
        return "read before the bump"

    assert catalog_memo.remember(("k",), compute_and_get_bumped, ttl=60.0) == "read before the bump"
    assert catalog_memo.remember(("k",), lambda: "fresh", ttl=60.0) == "fresh"


def test_remember_does_not_keep_none_or_errors(isolated_generation):
    assert catalog_memo.remember(("none",), lambda: None, ttl=60.0) is None
    assert catalog_memo.remember(("none",), lambda: "now present", ttl=60.0) == "now present"

    def boom():
        raise RuntimeError("db down")

    with pytest.raises(RuntimeError):
        catalog_memo.remember(("err",), boom, ttl=60.0)
    assert catalog_memo.remember(("err",), lambda: "recovered", ttl=60.0) == "recovered"


def test_fetch_perks_memoizes_anonymous_requests_by_the_values_the_query_uses(isolated_generation):
    mock_service = MagicMock()
    mock_service.ALLOWED_SORT_FIELDS = {"name", "character", "category"}

    with patch("app.services.perks.queries_perk.db") as mock_db:
        mock_db.session.scalars.return_value.unique.return_value.all.return_value = []
        mock_db.session.scalar.return_value = 0

        from app.services.perks.queries_perk import fetch_perks

        fetch_perks(mock_service, category="survivor", page=1, limit=50)
        assert mock_db.session.scalars.call_count > 0
        mock_db.session.scalars.reset_mock()

        # Same query spelled differently: an unknown sort_by is "name", and a
        # case change in the filter selects the same rows.
        fetch_perks(mock_service, category="Survivor", sort_by="junk1", page=1, limit=50)
        fetch_perks(mock_service, category="SURVIVOR", sort_by="junk2", page=1, limit=50)
        assert mock_db.session.scalars.call_count == 0


def test_fetch_perks_does_not_memoize_personal_requests(isolated_generation):
    mock_service = MagicMock()
    mock_service.ALLOWED_SORT_FIELDS = {"name", "character", "category"}

    with patch("app.services.perks.queries_perk.db") as mock_db:
        mock_db.session.scalars.return_value.unique.return_value.all.return_value = []
        mock_db.session.execute.return_value.all.return_value = []
        mock_db.session.scalar.return_value = 0

        from app.services.perks.queries_perk import fetch_perks

        fetch_perks(mock_service, user_id=7, page=1, limit=50)
        first = mock_db.session.scalars.call_count
        fetch_perks(mock_service, user_id=7, page=1, limit=50)
        assert mock_db.session.scalars.call_count == 2 * first


def test_fetch_characters_memoizes_until_the_generation_changes(isolated_generation):
    with patch("app.services.perks.queries_character._run_characters_query") as mock_run_query:
        mock_char = MagicMock()
        mock_char.to_dict.return_value = {"id": 1, "name": "Dwight Fairfield", "role": "Survivor"}
        mock_run_query.return_value = [mock_char]

        from app.services.perks.queries_character import fetch_characters

        res1 = fetch_characters(None, category="Survivor")
        res2 = fetch_characters(None, category="Survivor")
        assert mock_run_query.call_count == 1
        assert res1 == res2

        redis_cache.bump_catalog_version()
        fetch_characters(None, category="Survivor")
        assert mock_run_query.call_count == 2


def test_fetch_characters_raises_instead_of_answering_an_empty_roster(isolated_generation):
    """An empty list would be cached by @cache_catalog as the roster for a day."""
    from app.services.perks.queries_character import CatalogEmptyError, fetch_characters

    with patch("app.services.perks.queries_character._run_characters_query", return_value=[]):
        with pytest.raises(CatalogEmptyError):
            fetch_characters(None, category="Survivor")
        # A category that names neither role legitimately selects nothing.
        assert fetch_characters(None, category="nonsense") == []


def test_fetch_characters_propagates_database_errors(isolated_generation):
    from app.services.perks.queries_character import fetch_characters

    with patch("app.services.perks.queries_character._run_characters_query", side_effect=RuntimeError("db down")):
        with pytest.raises(RuntimeError):
            fetch_characters(None, category="Survivor")
