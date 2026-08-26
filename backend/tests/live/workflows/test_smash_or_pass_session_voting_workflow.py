# backend/tests/live/workflows/test_smash_or_pass_session_voting_workflow.py
import pytest

def test_smash_or_pass_session_voting_workflow(live_client):
    session_id = "session_test_wf_13"

    # Step 1: Fetch active rosters
    rosters_res = live_client.get("/api/v1/smash-or-pass/rosters")
    assert rosters_res.status_code == 200
    rosters = rosters_res.get_json()["data"]
    assert len(rosters) > 0
    slug = rosters[0]["slug"]

    # Step 2: Fetch feed for session
    feed_res = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/feed?session_id={session_id}&limit=5")
    assert feed_res.status_code == 200
    feed_data = feed_res.get_json()["data"]
    entities = feed_data["entities"]
    assert len(entities) > 0
    entity_id = entities[0]["id"]

    # Step 3: Cast vote
    vote_res = live_client.post("/api/v1/smash-or-pass/vote", json={
        "session_id": session_id,
        "entity_id": entity_id,
        "vote_type": "smash",
        "roster_slug": slug,
    })
    assert vote_res.status_code == 200

    # Step 4: Verify leaderboard
    lb_res = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/leaderboard")
    assert lb_res.status_code == 200
    assert len(lb_res.get_json()["data"]) > 0

    # Step 5: Reset votes
    reset_res = live_client.post("/api/v1/smash-or-pass/reset", json={"session_id": session_id})
    assert reset_res.status_code in (200, 404)
