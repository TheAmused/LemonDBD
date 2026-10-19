# backend/tests/unit/test_http_cache_layers.py
"""`@cache_catalog` against a fake Redis: keys, validators, invalidation races."""
from __future__ import annotations

from collections.abc import Callable, Generator

import pytest
from flask import Flask, jsonify
from flask.testing import FlaskClient

from app.core import http_cache, redis_cache
from app.core.cache_params import norm_choice, norm_int, norm_lower
from app.core.http_cache import cache_catalog
from tests.unit.redis_support import FakeRedis


@pytest.fixture
def fake_redis(monkeypatch: pytest.MonkeyPatch) -> FakeRedis:
    fake = FakeRedis()
    monkeypatch.setattr(redis_cache, "get_client", lambda: fake)
    monkeypatch.setattr(redis_cache, "_version_cache", None)
    return fake


class Probe:
    """A catalog view that counts its own executions."""

    def __init__(self) -> None:
        self.calls = 0
        self.body: dict[str, object] = {"rows": ["a"]}
        self.status = 200
        self.on_run: Callable[[], None] | None = None


@pytest.fixture
def probe() -> Probe:
    return Probe()


@pytest.fixture
def cached_client(fake_redis: FakeRedis, probe: Probe) -> Generator[FlaskClient, None, None]:
    app = Flask(__name__)

    def view():
        probe.calls += 1
        if probe.on_run:
            probe.on_run()
        return jsonify(probe.body), probe.status

    app.add_url_rule(
        "/things",
        "things",
        cache_catalog(
            ttl=3600,
            vary={
                "category": norm_choice(("survivor", "killer"), strict=True),
                "sort_by": norm_choice(("name", "character"), default="name"),
                "limit": norm_int(50, 1, 500),
                "search": norm_lower(),
            },
        )(view),
    )
    yield app.test_client()


def test_a_hit_replays_the_exact_miss_bytes_and_etag(cached_client: FlaskClient, probe: Probe) -> None:
    miss = cached_client.get("/things")
    hit = cached_client.get("/things")

    assert (miss.headers["X-Cache"], hit.headers["X-Cache"]) == ("MISS", "HIT")
    assert hit.data == miss.data
    assert hit.headers["ETag"] == miss.headers["ETag"]
    assert probe.calls == 1


def test_the_etag_follows_the_body_not_the_key(cached_client: FlaskClient, probe: Probe, fake_redis: FakeRedis) -> None:
    first = cached_client.get("/things")
    probe.body = {"rows": ["a", "b"]}
    # A write that forgot to bump the generation: the cached entry is still what
    # the server holds, and its ETag still describes that body.
    assert cached_client.get("/things").headers["ETag"] == first.headers["ETag"]

    redis_cache.bump_catalog_version()
    second = cached_client.get("/things")
    assert second.headers["ETag"] != first.headers["ETag"]
    assert second.get_json() == {"rows": ["a", "b"]}


def test_a_validator_for_a_body_the_server_no_longer_holds_gets_the_new_body(
    cached_client: FlaskClient, probe: Probe
) -> None:
    old_etag = cached_client.get("/things").headers["ETag"]
    probe.body = {"rows": ["changed"]}
    redis_cache.bump_catalog_version()

    response = cached_client.get("/things", headers={"If-None-Match": old_etag})

    assert response.status_code == 200
    assert response.get_json() == {"rows": ["changed"]}


def test_a_matching_validator_answers_304_without_running_the_view(
    cached_client: FlaskClient, probe: Probe
) -> None:
    etag = cached_client.get("/things").headers["ETag"]

    response = cached_client.get("/things", headers={"If-None-Match": f'"other", {etag}'})

    assert response.status_code == 304
    assert probe.calls == 1


def test_an_unchanged_body_after_a_bump_still_answers_304(cached_client: FlaskClient, probe: Probe) -> None:
    etag = cached_client.get("/things").headers["ETag"]
    redis_cache.bump_catalog_version()

    response = cached_client.get("/things", headers={"If-None-Match": etag})

    assert response.status_code == 304
    assert probe.calls == 2


def test_a_bump_while_the_view_runs_is_not_filed_under_the_new_generation(
    cached_client: FlaskClient, probe: Probe, fake_redis: FakeRedis
) -> None:
    probe.on_run = redis_cache.bump_catalog_version

    racing = cached_client.get("/things")
    probe.on_run = None
    probe.body = {"rows": ["after the change"]}
    after = cached_client.get("/things")

    assert racing.headers["X-Cache"] == "MISS"
    assert after.headers["X-Cache"] == "MISS"
    assert after.get_json() == {"rows": ["after the change"]}


def test_values_the_view_treats_alike_share_one_entry(
    cached_client: FlaskClient, probe: Probe, fake_redis: FakeRedis
) -> None:
    for n in range(20):
        cached_client.get(f"/things?sort_by=junk{n}&limit={500 + n}&lang=junk{n}")
    cached_client.get("/things?sort_by=NAME&limit=500")
    cached_client.get("/things?SORT_BY=name")

    assert len(fake_redis.entry_keys()) <= 2
    assert probe.calls <= 2


def test_search_text_is_case_folded_and_kept_briefly(
    cached_client: FlaskClient, fake_redis: FakeRedis
) -> None:
    cached_client.get("/things?search=Adrenaline")
    hit = cached_client.get("/things?search=  adrenaline ")

    assert hit.headers["X-Cache"] == "HIT"
    (key,) = fake_redis.entry_keys()
    assert fake_redis.ttls[key] == http_cache.FREE_TEXT_TTL


def test_an_unrecognised_filter_or_oversized_text_is_served_live_and_never_stored(
    cached_client: FlaskClient, probe: Probe, fake_redis: FakeRedis
) -> None:
    cached_client.get("/things?category=junk1")
    cached_client.get("/things?category=junk1")
    cached_client.get("/things?search=" + "x" * 200)

    assert fake_redis.entry_keys() == []
    assert probe.calls == 3


def test_a_body_over_the_size_cap_is_served_but_not_stored(
    cached_client: FlaskClient, probe: Probe, fake_redis: FakeRedis, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(http_cache, "MAX_ENTRY_BYTES", 8)
    probe.body = {"rows": ["a" * 5000]}

    response = cached_client.get("/things")

    assert response.status_code == 200
    assert fake_redis.entry_keys() == []


def test_error_responses_are_not_stored(cached_client: FlaskClient, probe: Probe, fake_redis: FakeRedis) -> None:
    probe.status = 503

    assert cached_client.get("/things").status_code == 503
    assert fake_redis.entry_keys() == []


def test_anonymous_responses_vary_on_the_session_cookie(cached_client: FlaskClient) -> None:
    response = cached_client.get("/things")

    assert "Cookie" in response.headers["Vary"]
    assert "public" in response.headers["Cache-Control"]
    assert "stale-while-revalidate=300" in response.headers["Cache-Control"]


@pytest.mark.parametrize(
    ("headers", "query"),
    [({"Authorization": "Bearer abc"}, ""), ({}, "?user_id=4"), ({"Cookie": "session=abc"}, "")],
)
def test_personal_responses_are_private_and_never_stored(
    cached_client: FlaskClient, probe: Probe, fake_redis: FakeRedis, headers: dict[str, str], query: str
) -> None:
    cookie = headers.pop("Cookie", None)
    if cookie:
        name, _, value = cookie.partition("=")
        cached_client.set_cookie(name, value)
    response = cached_client.get(f"/things{query}", headers=headers)

    assert response.headers["Cache-Control"] == "private, no-cache"
    assert "Cookie" in response.headers["Vary"]
    assert fake_redis.entry_keys() == []
    assert "X-Cache" not in response.headers


def test_a_corrupt_entry_is_treated_as_a_miss(cached_client: FlaskClient, probe: Probe, fake_redis: FakeRedis) -> None:
    cached_client.get("/things")
    (key,) = fake_redis.entry_keys()
    fake_redis.data[key] = b'W/"cat-x"\nnot zlib'

    response = cached_client.get("/things")

    assert response.status_code == 200
    assert probe.calls == 2
