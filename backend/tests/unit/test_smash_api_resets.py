# backend/tests/unit/test_smash_api_resets.py
import pytest
from flask import Flask
from sqlalchemy.orm import Session
from app.core.security import generate_token
from app.services.smash_or_pass_service import SmashOrPassService
from tests.unit.smash_api_support import create_user as _create_user, setup_smash_data  # noqa: F401 (autouse fixture)


@pytest.mark.unit
class TestSmashOrPassResetsAndSync:
    """Tests for resetting votes, guest-to-user sync, and the Hall of Fame anti-exploit rules."""

    def test_post_session_reset(self, app: Flask) -> None:
        client = app.test_client()

        client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "character_slug": "ada_wong",
                "vote_type": "smash",
                "session_id": "session_to_reset_123",
            },
        )
        client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "character_slug": "sable_ward",
                "vote_type": "pass",
                "session_id": "session_to_reset_123",
            },
        )

        res = client.post(
            "/api/v1/smash-or-pass/session/reset",
            json={"session_id": "session_to_reset_123"},
        )
        assert res.status_code == 200
        json_data = res.get_json()
        assert json_data["status"] == "success"
        assert json_data["data"]["reset_count"] == 2

        res_again = client.post(
            "/api/v1/smash-or-pass/session/reset",
            json={"session_id": "session_to_reset_123"},
        )
        assert res_again.status_code == 200
        assert res_again.get_json()["data"]["reset_count"] == 0

        res_bad = client.post("/api/v1/smash-or-pass/session/reset", json={})
        assert res_bad.status_code == 400

    def test_post_user_votes_reset_and_idor_protection(
        self, app: Flask, db_session: Session
    ) -> None:
        client = app.test_client()
        user1 = _create_user(db_session, username="bob", email="bob@test.com")
        user2 = _create_user(db_session, username="charlie", email="charlie@test.com")
        admin = _create_user(
            db_session, username="admin_bob", email="admin_bob@test.com", role="admin"
        )

        token1 = generate_token(user1.id, role="user")
        token_admin = generate_token(admin.id, role="admin")

        service = SmashOrPassService()
        service.cast_vote(character_slug="feng_min", vote_type="super_smash", user_id=user1.id)
        assert len(service.get_user_votes(user1.id, "canon")) == 1

        res_unauth_no_id = client.post("/api/v1/smash-or-pass/user-votes/reset", json={})
        assert res_unauth_no_id.status_code == 400

        res_unauth_with_id = client.post(
            "/api/v1/smash-or-pass/user-votes/reset", json={"user_id": user1.id}
        )
        assert res_unauth_with_id.status_code == 401

        res_idor = client.post(
            "/api/v1/smash-or-pass/user-votes/reset",
            headers={"Authorization": f"Bearer {token1}"},
            json={"user_id": user2.id},
        )
        assert res_idor.status_code == 403

        res_own = client.post(
            "/api/v1/smash-or-pass/user-votes/reset",
            headers={"Authorization": f"Bearer {token1}"},
            json={},
        )
        assert res_own.status_code == 200
        assert res_own.get_json()["data"]["reset_count"] == 1
        assert len(service.get_user_votes(user1.id, "canon")) == 0

        service.cast_vote(character_slug="feng_min", vote_type="smash", user_id=user2.id)
        assert len(service.get_user_votes(user2.id, "canon")) == 1

        res_admin = client.post(
            "/api/v1/smash-or-pass/user-votes/reset",
            headers={"Authorization": f"Bearer {token_admin}"},
            json={"user_id": user2.id},
        )
        assert res_admin.status_code == 200
        assert res_admin.get_json()["data"]["reset_count"] == 1
        assert len(service.get_user_votes(user2.id, "canon")) == 0

    def test_guest_votes_do_not_count_towards_global_leaderboard(
        self, app: Flask
    ) -> None:
        client = app.test_client()
        guest_sess = "sess_guest_exclusive_123"

        # Guest casts 5 votes
        for slug in ["sable_ward", "mikaela_reid", "feng_min", "kate_denson", "meg_thomas"]:
            res = client.post(
                "/api/v1/smash-or-pass/vote",
                json={
                    "character_slug": slug,
                    "vote_type": "smash",
                    "session_id": guest_sess,
                    "roster_slug": "canon",
                },
            )
            assert res.status_code == 200

        # Feed for guest excludes those 5 voted items (98 - 5 = 93 remaining)
        res_feed = client.get(f"/api/v1/smash-or-pass/rosters/canon/feed?session_id={guest_sess}")
        assert res_feed.status_code == 200
        assert res_feed.get_json()["data"]["total_remaining"] == 93

        # BUT Global Hall of Fame / Leaderboard MUST have 0 total votes because guests don't count!
        res_lb = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
        assert res_lb.status_code == 200
        lb_items = res_lb.get_json()["data"]
        total_global_votes = sum(item["total_votes"] for item in lb_items)
        assert total_global_votes == 0, f"Expected 0 global votes from guests, got {total_global_votes}"

    def test_sync_session_migrates_guest_votes_to_user_and_updates_hall_of_fame(
        self, app: Flask, db_session: Session
    ) -> None:
        client = app.test_client()
        guest_sess = "sess_migration_test_999"

        # 1. Guest votes 3 characters (2 smash, 1 pass)
        client.post(
            "/api/v1/smash-or-pass/vote",
            json={"character_slug": "sable_ward", "vote_type": "smash", "session_id": guest_sess},
        )
        client.post(
            "/api/v1/smash-or-pass/vote",
            json={"character_slug": "mikaela_reid", "vote_type": "smash", "session_id": guest_sess},
        )
        client.post(
            "/api/v1/smash-or-pass/vote",
            json={"character_slug": "the_trapper", "vote_type": "pass", "session_id": guest_sess},
        )

        # Verify global leaderboard has 0 votes
        res_lb_pre = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
        assert sum(i["total_votes"] for i in res_lb_pre.get_json()["data"]) == 0

        # 2. User registers and logs in
        user = _create_user(db_session, username="new_player", email="player@example.com")
        token = generate_token(user.id, role="user")

        # 3. Synchronize guest session to account
        sync_res = client.post(
            "/api/v1/smash-or-pass/sync-session",
            headers={"Authorization": f"Bearer {token}"},
            json={"session_id": guest_sess, "roster_slug": "canon"},
        )
        assert sync_res.status_code == 200
        sync_data = sync_res.get_json()["data"]
        assert sync_data["synced_count"] == 3

        # 4. Hall of Fame Leaderboard MUST now count those 3 votes as official global votes!
        res_lb_post = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
        assert res_lb_post.status_code == 200
        lb_post_items = res_lb_post.get_json()["data"]
        total_global_votes = sum(item["total_votes"] for item in lb_post_items)
        assert total_global_votes == 3

        # Sable Ward should have 1 smash (100%), Trapper should have 1 pass (0%)
        sable = next(i for i in lb_post_items if i["slug"] == "sable_ward")
        assert sable["smash_count"] == 1
        assert sable["total_votes"] == 1
        assert sable["smash_rate"] == 100.0

        trapper = next(i for i in lb_post_items if i["slug"] == "the_trapper")
        assert trapper["pass_count"] == 1
        assert trapper["total_votes"] == 1
        assert trapper["smash_rate"] == 0.0

    def test_authenticated_user_reset_votes_workflow(
        self, app: Flask, db_session: Session
    ) -> None:
        client = app.test_client()
        user = _create_user(db_session, username="reset_player", email="resetter@example.com")
        token = generate_token(user.id, role="user")

        # 1. User votes on 3 characters
        for slug in ["sable_ward", "mikaela_reid", "feng_min"]:
            res_v = client.post(
                "/api/v1/smash-or-pass/vote",
                headers={"Authorization": f"Bearer {token}"},
                json={"character_slug": slug, "vote_type": "smash", "roster_slug": "canon"},
            )
            assert res_v.status_code == 200

        # 2. Verify feed shows 95 remaining (98 - 3)
        res_feed = client.get(
            "/api/v1/smash-or-pass/rosters/canon/feed",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_feed.status_code == 200
        assert res_feed.get_json()["data"]["total_remaining"] == 95

        # 3. Verify user votes endpoint returns 3 votes
        res_uv = client.get(
            "/api/v1/smash-or-pass/user-votes?edition=canon",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_uv.status_code == 200
        assert res_uv.get_json()["count"] == 3

        # 4. Verify leaderboard shows 3 global votes
        res_lb = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
        assert sum(i["total_votes"] for i in res_lb.get_json()["data"]) == 3

        # 5. User resets votes with Authorization header
        res_reset = client.post(
            "/api/v1/smash-or-pass/user-votes/reset",
            headers={"Authorization": f"Bearer {token}"},
            json={"roster_slug": "canon"},
        )
        assert res_reset.status_code == 200
        reset_data = res_reset.get_json()["data"]
        assert reset_data["status"] == "success"
        assert reset_data["reset_count"] == 3

        # 6. Verify feed is completely restored to 98
        res_feed_after = client.get(
            "/api/v1/smash-or-pass/rosters/canon/feed",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_feed_after.status_code == 200
        assert res_feed_after.get_json()["data"]["total_remaining"] == 98

        # 7. Verify user votes is empty (0)
        res_uv_after = client.get(
            "/api/v1/smash-or-pass/user-votes?edition=canon",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_uv_after.status_code == 200
        assert res_uv_after.get_json()["count"] == 0

        # 8. Verify global leaderboard is unwound to 0 votes
        res_lb_after = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
        assert sum(i["total_votes"] for i in res_lb_after.get_json()["data"]) == 0

    def test_anti_exploit_repeated_vote_and_reset_cannot_stuff_hall_of_fame(
        self, app: Flask, db_session: Session
    ) -> None:
        """
        Anti-exploit proof: Repeatedly voting and resetting MUST NEVER artificially 
        pump vote counts or smash rates in the Hall of Fame. 
        Active stats are strictly the exact SQL aggregate of existing authenticated votes.
        """
        client = app.test_client()
        user = _create_user(db_session, username="spammer_user", email="spammer@example.com")
        token = generate_token(user.id, role="user")

        for iteration in range(10):
            # 1. Vote for Sable Ward
            res_v = client.post(
                "/api/v1/smash-or-pass/vote",
                headers={"Authorization": f"Bearer {token}"},
                json={"character_slug": "sable_ward", "vote_type": "smash", "roster_slug": "canon"},
            )
            assert res_v.status_code == 200

            # 2. Check Hall of Fame - MUST be exactly 1 vote, NEVER iteration + 1
            res_lb = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
            assert res_lb.status_code == 200
            sable = next(i for i in res_lb.get_json()["data"] if i["slug"] == "sable_ward")
            assert sable["smash_count"] == 1, f"Iteration {iteration}: expected 1 smash, got {sable['smash_count']}"
            assert sable["total_votes"] == 1
            assert sable["smash_rate"] == 100.0

            # 3. Reset votes
            res_r = client.post(
                "/api/v1/smash-or-pass/user-votes/reset",
                headers={"Authorization": f"Bearer {token}"},
                json={"roster_slug": "canon"},
            )
            assert res_r.status_code == 200

            # 4. Check Hall of Fame - MUST be exactly 0 votes
            res_lb_0 = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
            sable_0 = next(i for i in res_lb_0.get_json()["data"] if i["slug"] == "sable_ward")
            assert sable_0["smash_count"] == 0
            assert sable_0["total_votes"] == 0
            assert sable_0["smash_rate"] == 0.0

    def test_multi_user_selective_reset_preserves_other_users_votes_in_hall_of_fame(
        self, app: Flask, db_session: Session
    ) -> None:
        """
        Verify that when User A resets their votes:
        1. User A's votes are completely removed.
        2. User B's and User C's votes in the Hall of Fame remain 100% intact.
        3. Hall of Fame for shared characters decrements by only User A's portion.
        """
        client = app.test_client()
        user_a = _create_user(db_session, username="alice_voter", email="alice@test.com")
        user_b = _create_user(db_session, username="bob_voter", email="bob_v@test.com")
        user_c = _create_user(db_session, username="clara_voter", email="clara@test.com")

        token_a = generate_token(user_a.id, role="user")
        token_b = generate_token(user_b.id, role="user")
        token_c = generate_token(user_c.id, role="user")

        # User A votes: Sable (smash), Feng (smash)
        client.post("/api/v1/smash-or-pass/vote", headers={"Authorization": f"Bearer {token_a}"}, json={"character_slug": "sable_ward", "vote_type": "smash"})
        client.post("/api/v1/smash-or-pass/vote", headers={"Authorization": f"Bearer {token_a}"}, json={"character_slug": "feng_min", "vote_type": "smash"})

        # User B votes: Sable (smash), Mikaela (smash)
        client.post("/api/v1/smash-or-pass/vote", headers={"Authorization": f"Bearer {token_b}"}, json={"character_slug": "sable_ward", "vote_type": "smash"})
        client.post("/api/v1/smash-or-pass/vote", headers={"Authorization": f"Bearer {token_b}"}, json={"character_slug": "mikaela_reid", "vote_type": "smash"})

        # User C votes: Sable (pass), Trapper (pass)
        client.post("/api/v1/smash-or-pass/vote", headers={"Authorization": f"Bearer {token_c}"}, json={"character_slug": "sable_ward", "vote_type": "pass"})
        client.post("/api/v1/smash-or-pass/vote", headers={"Authorization": f"Bearer {token_c}"}, json={"character_slug": "the_trapper", "vote_type": "pass"})

        # Verify initial Hall of Fame:
        # Sable Ward: 2 smash, 1 pass = 3 total (66.7% rate)
        # Feng Min: 1 smash = 1 total (100% rate)
        # Mikaela: 1 smash = 1 total (100% rate)
        # Trapper: 1 pass = 1 total (0% rate)
        res_lb_1 = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
        lb_1 = res_lb_1.get_json()["data"]

        sable_1 = next(i for i in lb_1 if i["slug"] == "sable_ward")
        assert sable_1["smash_count"] == 2
        assert sable_1["pass_count"] == 1
        assert sable_1["total_votes"] == 3
        assert sable_1["smash_rate"] == 66.7

        feng_1 = next(i for i in lb_1 if i["slug"] == "feng_min")
        assert feng_1["smash_count"] == 1
        assert feng_1["total_votes"] == 1

        # Now User A resets their votes
        res_reset_a = client.post("/api/v1/smash-or-pass/user-votes/reset", headers={"Authorization": f"Bearer {token_a}"}, json={"roster_slug": "canon"})
        assert res_reset_a.status_code == 200
        assert res_reset_a.get_json()["data"]["reset_count"] == 2

        # Verify Hall of Fame AFTER User A resets:
        # Sable Ward: 1 smash (User B), 1 pass (User C) = 2 total (50.0% rate) -> User A's smash was removed!
        # Feng Min: 0 votes -> User A's smash was removed!
        # Mikaela: 1 smash (User B) -> 100% PRESERVED!
        # Trapper: 1 pass (User C) -> 100% PRESERVED!
        res_lb_2 = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard")
        lb_2 = res_lb_2.get_json()["data"]

        sable_2 = next(i for i in lb_2 if i["slug"] == "sable_ward")
        assert sable_2["smash_count"] == 1, f"Expected 1 smash, got {sable_2['smash_count']}"
        assert sable_2["pass_count"] == 1
        assert sable_2["total_votes"] == 2
        assert sable_2["smash_rate"] == 50.0

        feng_2 = next(i for i in lb_2 if i["slug"] == "feng_min")
        assert feng_2["smash_count"] == 0
        assert feng_2["total_votes"] == 0

        mikaela_2 = next(i for i in lb_2 if i["slug"] == "mikaela_reid")
        assert mikaela_2["smash_count"] == 1
        assert mikaela_2["total_votes"] == 1
        assert mikaela_2["smash_rate"] == 100.0

        trapper_2 = next(i for i in lb_2 if i["slug"] == "the_trapper")
        assert trapper_2["pass_count"] == 1
        assert trapper_2["total_votes"] == 1
        assert trapper_2["smash_rate"] == 0.0
