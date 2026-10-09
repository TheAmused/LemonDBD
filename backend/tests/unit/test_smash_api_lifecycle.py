# backend/tests/unit/test_smash_api_lifecycle.py
import pytest
from flask import Flask
from sqlalchemy.orm import Session
from app.core.security import generate_token
from tests.unit.smash_api_support import create_user as _create_user, setup_smash_data  # noqa: F401 (autouse fixture)


@pytest.mark.unit
class TestSmashOrPassLifecycle:
    """End-to-end vote, stats, reset and re-vote cycles across users and guest sessions."""

    def test_smash_voting_stats_reset_cycle_authenticated_user(
        self, app: Flask, db_session: Session
    ) -> None:
        """
        Cycle test for authenticated user:
        1. User votes on multiple characters (smash, pass, super_smash).
        2. Verify individual and aggregate stats, feed remaining count, and user votes.
        3. User resets their votes.
        4. Verify stats are completely unwound (total_votes=0, rate=0), feed restored to full.
        5. User votes again with flipped/different choices.
        6. Verify new stats accurately reflect the second voting round.
        """
        client = app.test_client()
        user = _create_user(db_session, username="cycle_tester", email="cycle_tester@test.com")
        token = generate_token(user.id, role="user")
        auth_headers = {"Authorization": f"Bearer {token}"}

        # --- STEP 1: INITIAL STATE VERIFICATION ---
        init_votes_res = client.get("/api/v1/smash-or-pass/user-votes", headers=auth_headers)
        assert init_votes_res.status_code == 200
        assert init_votes_res.get_json()["count"] == 0

        init_feed_res = client.get("/api/v1/smash-or-pass/rosters/canon/feed", headers=auth_headers)
        assert init_feed_res.status_code == 200
        init_feed = init_feed_res.get_json()["data"]
        assert init_feed["total_remaining"] == 98
        assert len(init_feed["entities"]) == 98

        # --- STEP 2: ROUND 1 VOTES ---
        # Vote 1: smash on Ada Wong
        v1 = client.post(
            "/api/v1/smash-or-pass/vote",
            headers=auth_headers,
            json={"character_slug": "ada_wong", "vote_type": "smash", "roster_slug": "canon"},
        )
        assert v1.status_code == 200

        # Vote 2: pass on The Trapper
        v2 = client.post(
            "/api/v1/smash-or-pass/vote",
            headers=auth_headers,
            json={"character_slug": "the_trapper", "vote_type": "pass", "roster_slug": "canon"},
        )
        assert v2.status_code == 200

        # Vote 3: super_smash on Sable Ward
        v3 = client.post(
            "/api/v1/smash-or-pass/vote",
            headers=auth_headers,
            json={"character_slug": "sable_ward", "vote_type": "super_smash", "roster_slug": "canon"},
        )
        assert v3.status_code == 200

        # --- STEP 3: STATS CHECK AFTER ROUND 1 ---
        # Feed check: 3 voted entities must be excluded, total_remaining reduced to 95
        feed_r1_res = client.get("/api/v1/smash-or-pass/rosters/canon/feed", headers=auth_headers)
        assert feed_r1_res.status_code == 200
        feed_r1 = feed_r1_res.get_json()["data"]
        assert feed_r1["total_remaining"] == 95
        remaining_slugs = {e["slug"] for e in feed_r1["entities"]}
        assert "ada_wong" not in remaining_slugs
        assert "the_trapper" not in remaining_slugs
        assert "sable_ward" not in remaining_slugs

        # User votes check: exactly 3 votes recorded
        uv_r1_res = client.get("/api/v1/smash-or-pass/user-votes", headers=auth_headers)
        assert uv_r1_res.status_code == 200
        uv_data = uv_r1_res.get_json()["data"]
        assert len(uv_data) == 3
        uv_map = {v["character_slug"]: v["vote_type"] for v in uv_data}
        assert uv_map["ada_wong"] == "smash"
        assert uv_map["the_trapper"] == "pass"
        assert uv_map["sable_ward"] == "super_smash"

        # Leaderboard stats check: verify smash rate, counters, and tier classifications
        lb_r1_res = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
        assert lb_r1_res.status_code == 200
        lb_r1 = lb_r1_res.get_json()["data"]
        lb_map = {e["slug"]: e for e in lb_r1}

        ada_stat = lb_map["ada_wong"]
        assert ada_stat["smash_count"] == 1
        assert ada_stat["pass_count"] == 0
        assert ada_stat["super_smash_count"] == 0
        assert ada_stat["total_votes"] == 1
        assert ada_stat["smash_rate"] == 100.0
        assert ada_stat["tier"] == "God Tier"

        trapper_stat = lb_map["the_trapper"]
        assert trapper_stat["smash_count"] == 0
        assert trapper_stat["pass_count"] == 1
        assert trapper_stat["super_smash_count"] == 0
        assert trapper_stat["total_votes"] == 1
        assert trapper_stat["smash_rate"] == 0.0
        assert trapper_stat["tier"] == "Eldritch Void"

        sable_stat = lb_map["sable_ward"]
        assert sable_stat["smash_count"] == 0
        assert sable_stat["pass_count"] == 0
        assert sable_stat["super_smash_count"] == 1
        assert sable_stat["total_votes"] == 1
        assert sable_stat["smash_rate"] == 100.0
        assert sable_stat["tier"] == "God Tier"

        # --- STEP 4: RESET VOTES ---
        reset_res = client.post("/api/v1/smash-or-pass/user-votes/reset", headers=auth_headers, json={})
        assert reset_res.status_code == 200
        assert reset_res.get_json()["status"] == "success"
        assert reset_res.get_json()["data"]["reset_count"] == 3

        # Confirm idempotent reset returns 0
        idempotent_res = client.post("/api/v1/smash-or-pass/user-votes/reset", headers=auth_headers, json={})
        assert idempotent_res.status_code == 200
        assert idempotent_res.get_json()["data"]["reset_count"] == 0

        # --- STEP 5: STATS CHECK AFTER RESET (VERIFY ZEROED / RESTORED) ---
        # User votes must now be empty
        uv_reset_res = client.get("/api/v1/smash-or-pass/user-votes", headers=auth_headers)
        assert uv_reset_res.status_code == 200
        assert uv_reset_res.get_json()["count"] == 0
        assert len(uv_reset_res.get_json()["data"]) == 0

        # Feed must be fully restored: all 98 characters remaining
        feed_reset_res = client.get("/api/v1/smash-or-pass/rosters/canon/feed", headers=auth_headers)
        assert feed_reset_res.status_code == 200
        feed_reset = feed_reset_res.get_json()["data"]
        assert feed_reset["total_remaining"] == 98
        restored_slugs = {e["slug"] for e in feed_reset["entities"]}
        assert "ada_wong" in restored_slugs
        assert "the_trapper" in restored_slugs
        assert "sable_ward" in restored_slugs

        # Leaderboard: all unwound to 0 votes
        lb_reset_res = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
        assert lb_reset_res.status_code == 200
        lb_reset_map = {e["slug"]: e for e in lb_reset_res.get_json()["data"]}
        for s in ("ada_wong", "the_trapper", "sable_ward"):
            assert lb_reset_map[s]["total_votes"] == 0
            assert lb_reset_map[s]["smash_rate"] == 0.0
            assert lb_reset_map[s]["tier"] == "Eldritch Void"

        # --- STEP 6: ROUND 2 RE-VOTING (FLIPPED CHOICES) ---
        # Previously smash -> now pass on Ada Wong
        v4 = client.post(
            "/api/v1/smash-or-pass/vote",
            headers=auth_headers,
            json={"character_slug": "ada_wong", "vote_type": "pass", "roster_slug": "canon"},
        )
        assert v4.status_code == 200

        # Previously pass -> now smash on The Trapper
        v5 = client.post(
            "/api/v1/smash-or-pass/vote",
            headers=auth_headers,
            json={"character_slug": "the_trapper", "vote_type": "smash", "roster_slug": "canon"},
        )
        assert v5.status_code == 200

        # Previously super_smash -> now smash on Sable Ward
        v6 = client.post(
            "/api/v1/smash-or-pass/vote",
            headers=auth_headers,
            json={"character_slug": "sable_ward", "vote_type": "smash", "roster_slug": "canon"},
        )
        assert v6.status_code == 200

        # --- STEP 7: STATS CHECK AFTER ROUND 2 ---
        feed_r2_res = client.get("/api/v1/smash-or-pass/rosters/canon/feed", headers=auth_headers)
        assert feed_r2_res.status_code == 200
        feed_r2 = feed_r2_res.get_json()["data"]
        assert feed_r2["total_remaining"] == 95

        lb_r2_res = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
        assert lb_r2_res.status_code == 200
        lb_r2_map = {e["slug"]: e for e in lb_r2_res.get_json()["data"]}

        # Ada Wong is now Pass: 0% smash rate, Eldritch Void
        ada_r2 = lb_r2_map["ada_wong"]
        assert ada_r2["smash_count"] == 0
        assert ada_r2["pass_count"] == 1
        assert ada_r2["total_votes"] == 1
        assert ada_r2["smash_rate"] == 0.0
        assert ada_r2["tier"] == "Eldritch Void"

        # The Trapper is now Smash: 100% smash rate, God Tier!
        trapper_r2 = lb_r2_map["the_trapper"]
        assert trapper_r2["smash_count"] == 1
        assert trapper_r2["pass_count"] == 0
        assert trapper_r2["total_votes"] == 1
        assert trapper_r2["smash_rate"] == 100.0
        assert trapper_r2["tier"] == "God Tier"

        # Sable Ward is now standard Smash (not super_smash)
        sable_r2 = lb_r2_map["sable_ward"]
        assert sable_r2["smash_count"] == 1
        assert sable_r2["super_smash_count"] == 0
        assert sable_r2["total_votes"] == 1
        assert sable_r2["smash_rate"] == 100.0
        assert sable_r2["tier"] == "God Tier"

    def test_smash_voting_stats_reset_cycle_guest_session_and_sync(
        self, app: Flask, db_session: Session
    ) -> None:
        """
        Cycle test for guest session:
        1. Guest votes without logging in, verifying session feed filtering.
        2. Session reset unwinds guest session votes and restores feed.
        3. Guest revotes, registers/logs in, and syncs session votes to account.
        4. Global stats reflect synced votes, and user reset clears account votes.
        """
        client = app.test_client()
        session_id = "guest_cycle_session_42"

        # 1. Guest votes on 2 characters
        v1 = client.post(
            "/api/v1/smash-or-pass/vote",
            json={"session_id": session_id, "character_slug": "meg_thomas", "vote_type": "smash"},
        )
        assert v1.status_code == 200

        v2 = client.post(
            "/api/v1/smash-or-pass/vote",
            json={"session_id": session_id, "character_slug": "the_wraith", "vote_type": "pass"},
        )
        assert v2.status_code == 200

        # Guest feed excludes both
        feed_res = client.get(f"/api/v1/smash-or-pass/rosters/canon/feed?session_id={session_id}")
        assert feed_res.status_code == 200
        feed_data = feed_res.get_json()["data"]
        assert feed_data["total_remaining"] == 96

        # Guest votes endpoint returns 2
        uv_res = client.get(f"/api/v1/smash-or-pass/user-votes?session_id={session_id}")
        assert uv_res.status_code == 200
        assert uv_res.get_json()["count"] == 2

        # 2. Reset session
        reset_res = client.post("/api/v1/smash-or-pass/session/reset", json={"session_id": session_id})
        assert reset_res.status_code == 200
        assert reset_res.get_json()["data"]["reset_count"] == 2

        # Guest feed restored to 98
        feed_restored = client.get(f"/api/v1/smash-or-pass/rosters/canon/feed?session_id={session_id}")
        assert feed_restored.get_json()["data"]["total_remaining"] == 98

        # 3. Guest re-votes: super_smash on Meg Thomas
        v3 = client.post(
            "/api/v1/smash-or-pass/vote",
            json={"session_id": session_id, "character_slug": "meg_thomas", "vote_type": "super_smash"},
        )
        assert v3.status_code == 200

        # 4. User signs up and syncs session votes
        user = _create_user(db_session, username="synced_user", email="synced@test.com")
        token = generate_token(user.id, role="user")
        auth_headers = {"Authorization": f"Bearer {token}"}

        sync_res = client.post(
            "/api/v1/smash-or-pass/sync-session",
            headers=auth_headers,
            json={"session_id": session_id, "roster_slug": "canon"},
        )
        assert sync_res.status_code == 200
        assert sync_res.get_json()["data"]["synced_count"] == 1

        # Global stats now reflect the synced super_smash vote!
        lb_res = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
        assert lb_res.status_code == 200
        meg_stat = next(e for e in lb_res.get_json()["data"] if e["slug"] == "meg_thomas")
        assert meg_stat["super_smash_count"] == 1
        assert meg_stat["total_votes"] == 1
        assert meg_stat["smash_rate"] == 100.0
        assert meg_stat["tier"] == "God Tier"

        # Final reset of user votes unwinds Meg back to 0
        u_reset = client.post("/api/v1/smash-or-pass/user-votes/reset", headers=auth_headers, json={})
        assert u_reset.status_code == 200
        assert u_reset.get_json()["data"]["reset_count"] == 1

        lb_final = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
        meg_final = next(e for e in lb_final.get_json()["data"] if e["slug"] == "meg_thomas")
        assert meg_final["total_votes"] == 0

    def test_smash_voting_multi_user_isolation_and_stats_aggregation(
        self, app: Flask, db_session: Session
    ) -> None:
        """
        Test multi-user vote aggregation and partial reset isolation:
        - User 1 votes Smash on Dwight (100% rate).
        - User 2 votes Pass on Dwight (50% rate, Friendzone).
        - User 3 votes Pass on Dwight (33.3% rate, Eldritch Void).
        - User 2 resets their vote -> stats recompute to User 1 + User 3 (50% rate, Friendzone).
        - User 2 revotes Smash -> stats recompute to 2 Smash + 1 Pass (66.7% rate, Fatal Attraction).
        """
        client = app.test_client()

        u1 = _create_user(db_session, username="voter1", email="v1@test.com")
        u2 = _create_user(db_session, username="voter2", email="v2@test.com")
        u3 = _create_user(db_session, username="voter3", email="v3@test.com")

        t1 = generate_token(u1.id, role="user")
        t2 = generate_token(u2.id, role="user")
        t3 = generate_token(u3.id, role="user")

        # Step 1: User 1 votes Smash on Dwight
        client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {t1}"},
            json={"character_slug": "dwight_fairfield", "vote_type": "smash"},
        )
        lb1 = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard").get_json()["data"]
        dwight_s1 = next(e for e in lb1 if e["slug"] == "dwight_fairfield")
        assert dwight_s1["smash_count"] == 1
        assert dwight_s1["pass_count"] == 0
        assert dwight_s1["total_votes"] == 1
        assert dwight_s1["smash_rate"] == 100.0
        assert dwight_s1["tier"] == "God Tier"

        # Step 2: User 2 votes Pass on Dwight
        client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {t2}"},
            json={"character_slug": "dwight_fairfield", "vote_type": "pass"},
        )
        lb2 = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard").get_json()["data"]
        dwight_s2 = next(e for e in lb2 if e["slug"] == "dwight_fairfield")
        assert dwight_s2["smash_count"] == 1
        assert dwight_s2["pass_count"] == 1
        assert dwight_s2["total_votes"] == 2
        assert dwight_s2["smash_rate"] == 50.0
        assert dwight_s2["tier"] == "Friendzone"

        # Step 3: User 3 votes Pass on Dwight
        client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {t3}"},
            json={"character_slug": "dwight_fairfield", "vote_type": "pass"},
        )
        lb3 = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard").get_json()["data"]
        dwight_s3 = next(e for e in lb3 if e["slug"] == "dwight_fairfield")
        assert dwight_s3["smash_count"] == 1
        assert dwight_s3["pass_count"] == 2
        assert dwight_s3["total_votes"] == 3
        assert dwight_s3["smash_rate"] == 33.3
        assert dwight_s3["tier"] == "Eldritch Void"

        # Step 4: User 2 resets their votes (User 1 and User 3 remain untouched)
        r2_reset = client.post(
            "/api/v1/smash-or-pass/user-votes/reset",
            headers={"Authorization": f"Bearer {t2}"},
            json={},
        )
        assert r2_reset.status_code == 200
        assert r2_reset.get_json()["data"]["reset_count"] == 1

        # Post-reset check: Dwight total_votes should drop from 3 to 2, smash_count=1, pass_count=1, rate=50%
        lb_post_reset = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard").get_json()["data"]
        dwight_pr = next(e for e in lb_post_reset if e["slug"] == "dwight_fairfield")
        assert dwight_pr["smash_count"] == 1
        assert dwight_pr["pass_count"] == 1
        assert dwight_pr["total_votes"] == 2
        assert dwight_pr["smash_rate"] == 50.0
        assert dwight_pr["tier"] == "Friendzone"

        # User 2 feed has Dwight restored, but User 1 & User 3 still have him excluded
        u2_feed = client.get("/api/v1/smash-or-pass/rosters/canon/feed", headers={"Authorization": f"Bearer {t2}"}).get_json()["data"]
        u1_feed = client.get("/api/v1/smash-or-pass/rosters/canon/feed", headers={"Authorization": f"Bearer {t1}"}).get_json()["data"]
        assert "dwight_fairfield" in {e["slug"] for e in u2_feed["entities"]}
        assert "dwight_fairfield" not in {e["slug"] for e in u1_feed["entities"]}

        # Step 5: User 2 revotes Smash on Dwight
        client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {t2}"},
            json={"character_slug": "dwight_fairfield", "vote_type": "smash"},
        )

        # Stats check: Dwight now has 2 Smash (U1 + U2) and 1 Pass (U3) = 3 total, 66.7% rate ('Fatal Attraction')
        lb_final = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard").get_json()["data"]
        dwight_final = next(e for e in lb_final if e["slug"] == "dwight_fairfield")
        assert dwight_final["smash_count"] == 2
        assert dwight_final["pass_count"] == 1
        assert dwight_final["total_votes"] == 3
        assert dwight_final["smash_rate"] == 66.7
        assert dwight_final["tier"] == "Fatal Attraction"
