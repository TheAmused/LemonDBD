# backend/tests/unit/core/test_redis_cache_resilience.py
"""Generation counter, circuit breaker and the separate limits connection."""
from __future__ import annotations

import time

import pytest

from app.core import altcha_guard, redis_cache
from tests.unit.core.redis_support import FakeRedis


@pytest.fixture
def fake_redis(monkeypatch: pytest.MonkeyPatch) -> FakeRedis:
    fake = FakeRedis()
    monkeypatch.setattr(redis_cache, "get_client", lambda: fake)
    monkeypatch.setattr(redis_cache, "_version_cache", None)
    return fake


def test_a_missing_counter_is_seeded_from_the_clock_not_from_one(fake_redis: FakeRedis) -> None:
    before = int(time.time() * 1000)

    version = redis_cache.catalog_version(fresh=True)

    assert version >= before
    assert fake_redis.data[redis_cache.VERSION_KEY] == str(version).encode()


def test_the_first_bump_after_a_redis_restart_changes_the_generation(fake_redis: FakeRedis) -> None:
    """The counter used to restart at 1: reading it and bumping it both answered 1."""
    before = redis_cache.catalog_version(fresh=True)
    fake_redis.data.clear()  # Redis restarted without persistence

    bumped = redis_cache.bump_catalog_version()

    assert bumped != before
    assert bumped > before
    assert redis_cache.catalog_version(fresh=True) == bumped


def test_a_restarted_redis_does_not_reuse_a_generation_browsers_still_hold(fake_redis: FakeRedis) -> None:
    seen = {redis_cache.catalog_version(fresh=True)}
    for _ in range(3):
        seen.add(redis_cache.bump_catalog_version())
    fake_redis.data.clear()
    time.sleep(0.005)

    assert redis_cache.bump_catalog_version() not in seen


def test_fresh_bypasses_the_one_second_version_cache(fake_redis: FakeRedis) -> None:
    first = redis_cache.catalog_version()
    fake_redis.incr(redis_cache.VERSION_KEY)

    assert redis_cache.catalog_version() == first
    assert redis_cache.catalog_version(fresh=True) == first + 1


def test_delete_removes_the_entry_from_the_current_generation(fake_redis: FakeRedis) -> None:
    redis_cache.set("taxonomies", {"roles": ["Survivor"]})
    assert redis_cache.get("taxonomies") == {"roles": ["Survivor"]}

    redis_cache.delete("taxonomies")

    assert redis_cache.get("taxonomies") is None


def test_an_entry_is_stored_and_read_under_an_explicit_generation(fake_redis: FakeRedis) -> None:
    redis_cache.set("k", {"v": 1}, version=5)

    assert redis_cache.get("k", version=5) == {"v": 1}
    assert redis_cache.get("k", version=6) is None


class _BrokenClient:
    calls = 0

    def ping(self) -> bool:
        type(self).calls += 1
        raise ConnectionError("down")


def test_a_failed_connection_is_not_retried_until_the_breaker_resets(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REDIS_URL", "redis://nowhere:6379/0")
    link = redis_cache._Link("REDIS_URL")
    attempts: list[str] = []

    def failing_connect(url: str):
        attempts.append(url)
        raise ConnectionError("refused")

    monkeypatch.setattr(link, "_connect", failing_connect)

    assert link.get() is None
    assert link.get() is None
    assert link.get() is None
    assert len(attempts) == 1

    link.down_until = 0.0
    assert link.get() is None
    assert len(attempts) == 2


def test_an_outage_is_logged_once_and_the_recovery_is_logged(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    monkeypatch.setenv("REDIS_URL", "redis://nowhere:6379/0")
    link = redis_cache._Link("REDIS_URL")
    caplog.set_level("INFO", logger=redis_cache.logger.name)

    link.mark_down(ConnectionError("first"))
    link.mark_down(ConnectionError("second"))
    assert sum("unavailable" in r.message for r in caplog.records) == 1

    link.mark_up()
    assert any("reachable again" in r.message for r in caplog.records)
    link.mark_down(ConnectionError("a second outage"))
    assert sum("unavailable" in r.message for r in caplog.records) == 2


def test_a_second_thread_does_not_queue_behind_a_connection_attempt(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REDIS_URL", "redis://nowhere:6379/0")
    link = redis_cache._Link("REDIS_URL")

    with link.lock:  # another thread is connecting
        assert link.get() is None


def test_a_dead_redis_is_skipped_for_get_and_set(monkeypatch: pytest.MonkeyPatch, fake_redis: FakeRedis) -> None:
    fake_redis.fail = True
    monkeypatch.setattr(redis_cache._catalog_link, "down_until", 0.0)

    redis_cache.set("k", {"v": 1})

    assert redis_cache.get("k") == {"v": 1}  # served from the in-process fallback
    assert redis_cache._catalog_link.down_until > time.monotonic()


def test_the_limits_connection_falls_back_to_the_cache_instance(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LIMITS_REDIS_URL", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)
    assert redis_cache.get_limits_client() is None

    sentinel = object()
    monkeypatch.setenv("REDIS_URL", "redis://cache:6379/0")
    monkeypatch.setattr(redis_cache._catalog_link, "client", sentinel)
    assert redis_cache.get_limits_client() is sentinel


def test_altcha_replay_records_live_on_the_limits_connection(monkeypatch: pytest.MonkeyPatch) -> None:
    limits = FakeRedis()
    monkeypatch.setattr(altcha_guard, "get_limits_client", lambda: limits)

    assert altcha_guard._claim("sig", time.time() + 60) is True
    assert altcha_guard._claim("sig", time.time() + 60) is False
    assert any(key.startswith("lemondbd:altcha:used:") for key in limits.data)


def test_the_in_process_altcha_record_is_bounded_under_a_flood(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(altcha_guard, "get_limits_client", lambda: None)
    monkeypatch.setattr(altcha_guard, "_MAX_LOCAL_ENTRIES", 50)
    monkeypatch.setattr(altcha_guard, "_used", {})

    for n in range(500):
        assert altcha_guard._claim(f"sig-{n}", time.time() + 600) is True

    assert len(altcha_guard._used) <= 50
