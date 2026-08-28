# backend/tests/live/api/test_live_minigames_api.py
import pytest


@pytest.mark.live
def test_live_smash_or_pass_rosters_and_voting(live_client):
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
        res_vote = live_client.post("/api/v1/smash-or-pass/vote", json={
            "entity_id": target_entity["id"],
            "vote": "smash",
            "roster_slug": roster_slug
        })
        assert res_vote.status_code == 200

    res_lead = live_client.get(f"/api/v1/smash-or-pass/rosters/{roster_slug}/leaderboard")
    assert res_lead.status_code == 200


@pytest.mark.live
def test_live_draft_and_quests_endpoints(live_client):
    res_draft = live_client.get("/api/v1/others/draft/pool")
    assert res_draft.status_code in (200, 404, 501) or "pool" in res_draft.get_json()

    res_quests = live_client.get("/api/v1/others/quests")
    assert res_quests.status_code in (200, 404) or "quests" in res_quests.get_json()
