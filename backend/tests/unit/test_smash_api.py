# backend/tests/unit/test_smash_api.py
import time
from typing import Generator
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy.orm import Session
from app.core.security import generate_token, hash_password
from app.models.user import User
from app.routes.others.smash_or_pass import vote_rate_limiter
from app.seeds.smash_roster_seeder import seed_smash_rosters
from app.services.others.smash_or_pass_service import SmashOrPassService


@pytest.fixture(autouse=True)
def setup_smash_data(db_session: Session) -> Generator[None, None, None]:
    seed_smash_rosters()
    vote_rate_limiter.reset()
    yield
    vote_rate_limiter.reset()


def _create_user(
    db_session: Session,
    username: str = "testuser",
    email: str = "test@example.com",
    role: str = "user",
) -> User:
    user = User(
        username=username,
        email=email,
        password_hash=hash_password("password123"),
        role=role,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.mark.unit
class TestSmashOrPassAPI:
    """Tests for Smash or Pass community editions, voting, leaderboards, and rate limits."""

    def test_get_rosters(self, app: Flask) -> None:
        client = app.test_client()
        res = client.get("/api/v1/smash-or-pass/rosters")
        assert res.status_code == 200
        json_data = res.get_json()
        assert json_data["count"] == 6
        assert len(json_data["data"]) == 6

        slugs = {r["slug"] for r in json_data["data"]}
        assert slugs == {
            "canon",
            "hooked_on_you",
            "legendary_cosplay",
            "cyberpunk_2077",
            "anime_manga",
            "gothic_eldritch",
        }

        canon = next(r for r in json_data["data"] if r["slug"] == "canon")
        assert canon["entity_count"] == 98
        assert canon["total_votes"] == 0
        assert canon["is_active"] is True
        assert "theme_color" in canon
        assert "name_i18n_key" in canon

    def test_get_roster_feed_success(self, app: Flask) -> None:
        client = app.test_client()
        res = client.get("/api/v1/smash-or-pass/rosters/canon/feed")
        assert res.status_code == 200
        json_data = res.get_json()
        assert "data" in json_data
        feed_data = json_data["data"]

        assert feed_data["roster"]["slug"] == "canon"
        assert feed_data["total_remaining"] == 98
        assert len(feed_data["entities"]) == 98

        entity = feed_data["entities"][0]
        assert "id" in entity
        assert "name" in entity
        assert "slug" in entity
        assert "role" in entity
        assert "gender" in entity
        assert "stat" in entity

    def test_get_roster_feed_with_filters_and_session(self, app: Flask) -> None:
        client = app.test_client()

        res = client.get(
            "/api/v1/smash-or-pass/rosters/canon/feed?role=Survivor&gender=female&limit=10"
        )
        assert res.status_code == 200
        feed_data = res.get_json()["data"]
        assert len(feed_data["entities"]) == 10
        assert feed_data["total_remaining"] == 28
        assert all(
            e["role"] == "Survivor" and e["gender"] == "female"
            for e in feed_data["entities"]
        )

        first_entity = feed_data["entities"][0]

        vote_res = client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "entity_id": first_entity["id"],
                "vote_type": "smash",
                "session_id": "test_session_feed_filter",
            },
        )
        assert vote_res.status_code == 200

        res_after = client.get(
            "/api/v1/smash-or-pass/rosters/canon/feed?role=Survivor&gender=female&limit=10&session_id=test_session_feed_filter"
        )
        assert res_after.status_code == 200
        feed_after = res_after.get_json()["data"]
        assert feed_after["total_remaining"] == 27

        remaining_ids = {e["id"] for e in feed_after["entities"]}
        assert first_entity["id"] not in remaining_ids

    def test_get_roster_feed_not_found(self, app: Flask) -> None:
        client = app.test_client()
        res = client.get("/api/v1/smash-or-pass/rosters/non_existent_roster/feed")
        assert res.status_code == 404
        assert "error" in res.get_json()

    def test_cast_vote_valid_by_character_slug_and_entity_id(
        self, app: Flask, db_session: Session
    ) -> None:
        client = app.test_client()
        user = _create_user(db_session, username="vote_user_1", email="voter1@test.com")
        token = generate_token(user.id, role="user")

        res1 = client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "character_slug": "ada_wong",
                "vote_type": "smash",
                "session_id": "sess_cast_test",
            },
        )
        assert res1.status_code == 200
        data1 = res1.get_json()["data"]
        assert data1["character_slug"] == "ada_wong"
        assert data1["smash_count"] == 1
        assert data1["pass_count"] == 0
        assert data1["total_votes"] == 1
        assert data1["smash_rate"] == 100.0

        feed_res = client.get("/api/v1/smash-or-pass/rosters/cyberpunk_2077/feed?limit=1")
        cyber_entity = feed_res.get_json()["data"]["entities"][0]

        res2 = client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "entity_id": cyber_entity["id"],
                "vote_type": "super_smash",
                "session_id": "sess_cast_test",
            },
        )
        assert res2.status_code == 200
        data2 = res2.get_json()["data"]
        assert data2["id"] == cyber_entity["id"]
        assert data2["super_smash_count"] == 1
        assert data2["total_votes"] == 1

        res3 = client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "character_slug": "ada_wong",
                "vote_type": "pass",
                "session_id": "sess_cast_test",
            },
        )
        assert res3.status_code == 200
        data3 = res3.get_json()["data"]
        assert data3["smash_count"] == 0
        assert data3["pass_count"] == 1
        assert data3["total_votes"] == 1
        assert data3["smash_rate"] == 0.0

    def test_cast_vote_authenticated_and_spoof_prevention(
        self, app: Flask, db_session: Session
    ) -> None:
        client = app.test_client()
        user = _create_user(db_session, username="alice", email="alice@test.com")
        token = generate_token(user.id, role="user")

        res = client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "character_slug": "ada_wong",
                "vote_type": "smash",
                "user_id": 99999,
            },
        )
        assert res.status_code == 200

        service = SmashOrPassService()
        user_votes = service.get_user_votes(user_id=user.id, edition="canon")
        assert len(user_votes) == 1
        assert user_votes[0]["character_slug"] == "ada_wong"

        spoofed_votes = service.get_user_votes(user_id=99999, edition="canon")
        assert len(spoofed_votes) == 0

    def test_cast_vote_validation_errors(self, app: Flask) -> None:
        client = app.test_client()

        res1 = client.post("/api/v1/smash-or-pass/vote", json={"vote_type": "smash"})
        assert res1.status_code == 400
        assert "required" in res1.get_json()["error"]

        res2 = client.post(
            "/api/v1/smash-or-pass/vote", json={"character_slug": "ada_wong"}
        )
        assert res2.status_code == 400
        assert "required" in res2.get_json()["error"]

        res3 = client.post(
            "/api/v1/smash-or-pass/vote",
            json={"character_slug": "ada_wong", "vote_type": "invalid_vote"},
        )
        assert res3.status_code == 400
        assert "Invalid vote_type" in res3.get_json()["error"]

        res4 = client.post(
            "/api/v1/smash-or-pass/vote",
            json={"character_slug": "non_existent_char_12345", "vote_type": "smash"},
        )
        assert res4.status_code == 400
        assert "not found" in res4.get_json()["error"].lower()

    def test_cast_vote_rate_limiting_and_pruning(self, app: Flask) -> None:
        client = app.test_client()
        vote_rate_limiter.reset()

        for _ in range(60):
            res = client.post(
                "/api/v1/smash-or-pass/vote",
                json={
                    "character_slug": "ada_wong",
                    "vote_type": "smash",
                    "session_id": "rate_limit_session",
                },
            )
            assert res.status_code == 200

        res_blocked = client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "character_slug": "ada_wong",
                "vote_type": "smash",
                "session_id": "rate_limit_session",
            },
        )
        assert res_blocked.status_code == 429
        assert "Rate limit exceeded" in res_blocked.get_json()["error"]

        res_other = client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "character_slug": "ada_wong",
                "vote_type": "smash",
                "session_id": "other_unlimited_session",
            },
        )
        assert res_other.status_code == 200

        vote_rate_limiter._requests["127.0.0.1:stale_sess"] = [time.time() - 100]
        vote_rate_limiter._prune_stale_keys(time.time() - 60)
        assert "127.0.0.1:stale_sess" not in vote_rate_limiter._requests

    def test_get_leaderboard_success_and_sorting(
        self, app: Flask, db_session: Session
    ) -> None:
        client = app.test_client()

        for i in range(3):
            u = _create_user(db_session, username=f"ada_user_{i}", email=f"ada_{i}@test.com")
            token = generate_token(u.id, role="user")
            client.post(
                "/api/v1/smash-or-pass/vote",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "character_slug": "ada_wong",
                    "vote_type": "smash",
                    "session_id": f"lb_sess_ada_{i}",
                },
            )

        for i in range(2):
            u = _create_user(db_session, username=f"sable_user_s_{i}", email=f"sable_s_{i}@test.com")
            token = generate_token(u.id, role="user")
            client.post(
                "/api/v1/smash-or-pass/vote",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "character_slug": "sable_ward",
                    "vote_type": "smash",
                    "session_id": f"lb_sess_sable_s_{i}",
                },
            )
        u_p = _create_user(db_session, username="sable_user_p", email="sable_p@test.com")
        token_p = generate_token(u_p.id, role="user")
        client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {token_p}"},
            json={
                "character_slug": "sable_ward",
                "vote_type": "pass",
                "session_id": "lb_sess_sable_p",
            },
        )

        for i in range(2):
            u_t = _create_user(db_session, username=f"trap_user_{i}", email=f"trap_{i}@test.com")
            token_t = generate_token(u_t.id, role="user")
            client.post(
                "/api/v1/smash-or-pass/vote",
                headers={"Authorization": f"Bearer {token_t}"},
                json={
                    "character_slug": "the_trapper",
                    "vote_type": "pass",
                    "session_id": f"lb_sess_trap_{i}",
                },
            )

        res = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard?sort_by=smash_rate")
        assert res.status_code == 200
        json_data = res.get_json()
        assert json_data["roster"] == "canon"
        assert json_data["count"] > 0

        leaderboard = json_data["data"]
        ada_entry = next(e for e in leaderboard if e["slug"] == "ada_wong")
        assert ada_entry["rank"] == 1
        assert ada_entry["tier"] == "God Tier"
        assert ada_entry["smash_rate"] == 100.0

        sable_entry = next(e for e in leaderboard if e["slug"] == "sable_ward")
        assert sable_entry["tier"] == "Fatal Attraction"

        trapper_entry = next(e for e in leaderboard if e["slug"] == "the_trapper")
        assert trapper_entry["tier"] == "Eldritch Void"
        assert trapper_entry["smash_rate"] == 0.0

        res_surv = client.get(
            "/api/v1/smash-or-pass/rosters/canon/leaderboard?role=Survivor&limit=5"
        )
        assert res_surv.status_code == 200
        surv_data = res_surv.get_json()["data"]
        assert len(surv_data) == 5
        assert all(e["role"] == "Survivor" for e in surv_data)

        res_404 = client.get("/api/v1/smash-or-pass/rosters/unknown_roster/leaderboard")
        assert res_404.status_code == 404

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

    @pytest.mark.parametrize(
        "locale, expected_tier_str",
        [
            ("en", "God Tier"),
            ("ja", "神ティア"),
        ],
    )
    def test_get_translations_smash_route(
        self, app: Flask, locale: str, expected_tier_str: str
    ) -> None:
        client = app.test_client()
        res = client.get(f"/api/v1/smash-or-pass/translations?locale={locale}")
        assert res.status_code == 200
        data = res.get_json()
        assert data["locale"] == locale
        assert data["data"]["smashOrPass.tiers.godTier"] == expected_tier_str

    @pytest.mark.parametrize(
        "locale, expected_tier_str",
        [
            ("en", "God Tier"),
            ("ja", "神ティア"),
            ("es", "Nivel Dios"),
            ("de", "Götter-Stufe"),
            ("pl", "Boski Poziom"),
        ],
    )
    def test_global_i18n_dynamic_endpoint(
        self, app: Flask, locale: str, expected_tier_str: str
    ) -> None:
        client = app.test_client()
        res = client.get(f"/api/v1/i18n/{locale}")
        assert res.status_code == 200
        data = res.get_json()
        assert data["locale"] == locale
        assert data["data"]["smashOrPass.tiers.godTier"] == expected_tier_str

    def test_legacy_routes_backward_compatibility(
        self, app: Flask, db_session: Session
    ) -> None:
        client = app.test_client()
        user = _create_user(db_session, username="legacy_user", email="legacy@test.com")
        token = generate_token(user.id, role="user")

        res_ed = client.get("/api/v1/smash-or-pass/editions")
        assert res_ed.status_code == 200
        ed_data = res_ed.get_json()["data"]
        assert len(ed_data) >= 2

        res_chars = client.get(
            "/api/v1/smash-or-pass/characters?edition=canon&role=Survivor&search=Leon"
        )
        assert res_chars.status_code == 200
        chars_data = res_chars.get_json()
        assert chars_data["count"] == 1
        assert chars_data["data"][0]["character_slug"] == "leon_scott_kennedy"

        client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "character_slug": "leon_scott_kennedy",
                "vote_type": "smash",
            },
        )

        res_uv = client.get(
            "/api/v1/smash-or-pass/user-votes",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_uv.status_code == 200
        uv_data = res_uv.get_json()
        assert uv_data["count"] == 1
        assert uv_data["data"][0]["character_slug"] == "leon_scott_kennedy"

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

    def test_get_rosters_query_optimization_and_grouping(
        self, app: Flask, db_session: Session
    ) -> None:
        """
        Verify that get_rosters correctly calculates grouped entity counts and total votes
        across multiple rosters without N+1 query discrepancies.
        """
        client = app.test_client()
        user = _create_user(db_session, username="roster_test_user", email="roster_u@test.com")
        token = generate_token(user.id, role="user")

        # Cast votes in canon roster
        client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {token}"},
            json={"character_slug": "sable_ward", "vote_type": "smash", "roster_slug": "canon"},
        )
        client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {token}"},
            json={"character_slug": "the_trapper", "vote_type": "pass", "roster_slug": "canon"},
        )

        # Cast vote in cyberpunk_2077 roster
        feed_res = client.get("/api/v1/smash-or-pass/rosters/cyberpunk_2077/feed?limit=1")
        assert feed_res.status_code == 200
        cyber_char = feed_res.get_json()["data"]["entities"][0]
        client.post(
            "/api/v1/smash-or-pass/vote",
            headers={"Authorization": f"Bearer {token}"},
            json={"entity_id": cyber_char["id"], "vote_type": "super_smash", "roster_slug": "cyberpunk_2077"},
        )

        # Fetch rosters
        res = client.get("/api/v1/smash-or-pass/rosters")
        assert res.status_code == 200
        data = res.get_json()["data"]

        canon = next(r for r in data if r["slug"] == "canon")
        assert canon["entity_count"] == 98
        assert canon["total_votes"] == 2

        cyber = next(r for r in data if r["slug"] == "cyberpunk_2077")
        assert cyber["entity_count"] == 10
        assert cyber["total_votes"] == 1

        hoy = next(r for r in data if r["slug"] == "hooked_on_you")
        assert hoy["entity_count"] == 8
        assert hoy["total_votes"] == 0

    def test_feed_pagination_and_role_gender_matrix(
        self, app: Flask
    ) -> None:
        """
        Verify feed pagination, limits, and role/gender query matrix combinations.
        """
        client = app.test_client()

        # Limit 5
        res_limit_5 = client.get("/api/v1/smash-or-pass/rosters/canon/feed?limit=5")
        assert res_limit_5.status_code == 200
        data_5 = res_limit_5.get_json()["data"]
        assert len(data_5["entities"]) == 5
        assert data_5["total_remaining"] == 98

        # Role=Killer, Gender=male
        res_killer_male = client.get(
            "/api/v1/smash-or-pass/rosters/canon/feed?role=Killer&gender=male&limit=50"
        )
        assert res_killer_male.status_code == 200
        data_km = res_killer_male.get_json()["data"]
        assert all(e["role"] == "Killer" and e["gender"] == "male" for e in data_km["entities"])
        assert data_km["total_remaining"] > 0



