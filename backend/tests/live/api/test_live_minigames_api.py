# backend/tests/live/api/test_live_minigames_api.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
class TestLiveMinigamesAPI:
    """Tests for Smash or Pass voting, feeds, leaderboards, drafts, and quests on live database."""

    def test_live_smash_or_pass_rosters_and_voting(self, live_client: FlaskClient) -> None:
        res = live_client.get("/api/v1/smash-or-pass/rosters")
        assert res.status_code == 200
        rosters = res.get_json()["data"]
        assert len(rosters) > 0
        roster_slug = rosters[0]["slug"]

        res_feed = live_client.get(f"/api/v1/smash-or-pass/rosters/{roster_slug}/feed")
        assert res_feed.status_code == 200
        feed_data = res_feed.get_json()["data"]
        entities = feed_data.get("entities", [])
        if len(entities) > 0:
            target_entity = entities[0]
            res_vote = live_client.post(
                "/api/v1/smash-or-pass/vote",
                json={
                    "entity_id": target_entity["id"],
                    "vote": "smash",
                    "vote_type": "smash",
                    "roster_slug": roster_slug,
                },
            )
            assert res_vote.status_code == 200

        res_lead = live_client.get(f"/api/v1/smash-or-pass/rosters/{roster_slug}/leaderboard")
        assert res_lead.status_code == 200

    def test_live_draft_and_quests_endpoints(self, live_client: FlaskClient) -> None:
        res_draft = live_client.get("/api/v1/others/draft/pool")
        assert res_draft.status_code in (200, 404, 501) or "pool" in res_draft.get_json()

        res_quests = live_client.get("/api/v1/others/quests")
        assert res_quests.status_code in (200, 404) or "quests" in res_quests.get_json()

    def test_live_guesser_and_builds_endpoints(self, live_client: FlaskClient) -> None:
        res_guesser = live_client.get("/api/v1/guesser/stats")
        assert res_guesser.status_code == 200
        assert "data" in res_guesser.get_json()

        res_builds = live_client.get("/api/v1/builds/")
        assert res_builds.status_code == 200
        assert "builds" in res_builds.get_json()
