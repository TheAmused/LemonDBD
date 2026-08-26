# backend/tests/live/workflows/test_smash_or_pass_tournament_workflow.py
import pytest

def test_full_smash_or_pass_voting_and_leaderboard_workflow(live_client):
    # Step 1: Query active rosters
    res_rosters = live_client.get("/api/v1/smash-or-pass/rosters")
    assert res_rosters.status_code == 200
    rosters = res_rosters.get_json()["data"]
    canon_roster = next((r for r in rosters if r["slug"] == "canon"), rosters[0])
    slug = canon_roster["slug"]

    # Step 2: Get initial feed with session ID
    session_headers = {"X-Session-ID": "workflow-session-12345"}
    res_feed = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/feed", headers=session_headers)
    assert res_feed.status_code == 200
    entities = res_feed.get_json()["data"].get("entities", [])
    assert len(entities) > 0

    # Step 3: Cast votes for the first 3 candidates
    voted_ids = []
    for idx, ent in enumerate(entities[:3]):
        vote_type = "smash" if idx % 2 == 0 else "pass"
        res_vote = live_client.post("/api/v1/smash-or-pass/vote", json={
            "entity_id": ent["id"],
            "vote": vote_type,
            "roster_slug": slug,
            "session_id": "workflow-session-12345",
        }, headers=session_headers)
        assert res_vote.status_code == 200
        voted_ids.append(ent["id"])

    # Step 4: Verify feed excludes voted entities
    res_feed2 = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/feed", headers=session_headers)
    assert res_feed2.status_code == 200
    entities2 = res_feed2.get_json()["data"].get("entities", [])
    remaining_ids = {e["id"] for e in entities2}
    for vid in voted_ids:
        assert vid not in remaining_ids

    # Step 5: Verify leaderboard contains ranked entities
    res_lead = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/leaderboard")
    assert res_lead.status_code == 200
    leaders = res_lead.get_json()["data"]
    assert len(leaders) > 0

    # Step 6: Reset session votes and verify feed is refreshed
    res_reset = live_client.post("/api/v1/smash-or-pass/session/reset", json={
        "session_id": "workflow-session-12345",
        "roster_slug": slug,
    })
    assert res_reset.status_code == 200

    res_feed3 = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/feed", headers=session_headers)
    assert res_feed3.status_code == 200
    entities3 = res_feed3.get_json()["data"].get("entities", [])
    reset_ids = {e["id"] for e in entities3}
    for vid in voted_ids:
        assert vid in reset_ids
