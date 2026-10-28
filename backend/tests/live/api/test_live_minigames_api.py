# backend/tests/live/api/test_live_minigames_api.py
"""Smash or Pass and minigame endpoints on PostgreSQL: rosters, feed, voting, leaderboard, session
reset, and the minigame catalogue and daily challenge.

(The draft-pool and quest endpoints this file used to probe were removed from the API; the old test
accepted a 404 for them, so it passed whether or not they existed.)"""
from collections.abc import Callable
from typing import Any

import pytest
from flask.testing import FlaskClient

SESSION = "live-test-session"


@pytest.mark.live
class TestLiveMinigamesAPI:
    def test_live_smash_or_pass_rosters_and_voting(
        self,
        live_client: FlaskClient,
        db_count: Callable[..., int],
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        res = live_client.get("/api/v1/smash-or-pass/rosters")
        assert res.status_code == 200
        rosters = res.get_json()["data"]
        # Every roster, active or not, except NSFW ones, which need the explicit opt-in.
        assert len(rosters) == db_count("SELECT count(*) FROM rosters WHERE NOT is_nsfw")
        with_nsfw = live_client.get("/api/v1/smash-or-pass/rosters?include_nsfw=true").get_json()["data"]
        assert len(with_nsfw) == db_count("SELECT count(*) FROM rosters")
        slug = next(r["slug"] for r in rosters if r["is_active"])

        feed = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/feed", headers={"X-Session-ID": SESSION}).get_json()["data"]
        entity = feed["entities"][0]

        def tally() -> tuple[int, int]:
            """(total votes, smashes) on the leaderboard; an entity nobody has voted on is not listed yet."""
            board = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/leaderboard").get_json()["data"]
            row = next((e for e in board if e["id"] == entity["id"]), {"total_votes": 0, "smash_count": 0})
            return row["total_votes"], row["smash_count"]

        before = tally()
        # A guest's vote is stored for their session, but the public tally counts signed-in votes only
        # (so nobody can stuff it with fresh sessions).
        vote = {"entity_id": entity["id"], "vote_type": "smash", "roster_slug": slug}
        assert live_client.post("/api/v1/smash-or-pass/vote", json={**vote, "session_id": SESSION}).status_code == 200
        assert tally() == before

        client, headers, _ = auth_client_factory("smash_voter", "smash_voter@example.com", "pass123")
        assert client.post("/api/v1/smash-or-pass/vote", json=vote, headers=headers).status_code == 200
        assert tally() == (before[0] + 1, before[1] + 1)

        res_reset = live_client.post("/api/v1/smash-or-pass/session/reset", json={"session_id": SESSION, "roster_slug": slug})
        assert res_reset.status_code == 200
        assert res_reset.get_json()["data"]["reset_count"] == 1

    def test_live_minigames_catalog_and_daily_endpoints(self, live_client: FlaskClient, db_count: Callable[..., int]) -> None:
        res_catalog = live_client.get("/api/v1/minigames/catalog")
        assert res_catalog.status_code == 200
        catalog = res_catalog.get_json()
        assert len(catalog["killers"]) == db_count("SELECT count(*) FROM killers")
        assert len(catalog["survivors"]) == db_count("SELECT count(*) FROM survivors")
        assert len(catalog["characters"]) == len(catalog["killers"]) + len(catalog["survivors"])

        res_daily = live_client.get("/api/v1/minigames/daily")
        assert res_daily.status_code == 200
        assert len(res_daily.get_json()["rounds"]) >= 1
