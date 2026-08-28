# backend/tests/unit/test_smash_api.py
# backend/tests/test_smash_api.py
import time
import pytest
from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models.user import User
from app.routes.others.smash_or_pass import vote_rate_limiter
from app.seeds.smash_roster_seeder import seed_smash_rosters
from app.services.others.smash_or_pass_service import SmashOrPassService


@pytest.fixture(autouse=True)
def setup_smash_data(db_session):
    """Ensure baseline smash rosters, entities, stats, and translations are seeded."""
    seed_smash_rosters()
    vote_rate_limiter.reset()
    yield
    vote_rate_limiter.reset()


def _create_user(db_session, username="testuser", email="test@example.com", role="user"):
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


def test_get_rosters(app):
    """Test GET /api/v1/smash-or-pass/rosters returns all active rosters with real-time stats."""
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


def test_get_roster_feed_success(app):
    """Test GET /api/v1/smash-or-pass/rosters/<slug>/feed returns unvoted entities feed."""
    client = app.test_client()
    res = client.get("/api/v1/smash-or-pass/rosters/canon/feed")
    assert res.status_code == 200
    json_data = res.get_json()
    assert "data" in json_data
    feed_data = json_data["data"]

    assert feed_data["roster"]["slug"] == "canon"
    assert feed_data["total_remaining"] == 98
    assert len(feed_data["entities"]) == 50  # Default limit is 50

    entity = feed_data["entities"][0]
    assert "id" in entity
    assert "name" in entity
    assert "slug" in entity
    assert "role" in entity
    assert "gender" in entity
    assert "stat" in entity


def test_get_roster_feed_with_filters_and_session(app):
    """Test feed filtering by role, gender, limit, and unvoted exclusion per session."""
    client = app.test_client()

    # Query with filters
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

    # Cast a vote for the first entity
    vote_res = client.post(
        "/api/v1/smash-or-pass/vote",
        json={
            "entity_id": first_entity["id"],
            "vote_type": "smash",
            "session_id": "test_session_feed_filter",
        },
    )
    assert vote_res.status_code == 200

    # Query feed again with the same session_id
    res_after = client.get(
        "/api/v1/smash-or-pass/rosters/canon/feed?role=Survivor&gender=female&limit=10&session_id=test_session_feed_filter"
    )
    assert res_after.status_code == 200
    feed_after = res_after.get_json()["data"]
    assert feed_after["total_remaining"] == 27

    remaining_ids = {e["id"] for e in feed_after["entities"]}
    assert first_entity["id"] not in remaining_ids


def test_get_roster_feed_not_found(app):
    """Test feed returns 404 when roster slug does not exist."""
    client = app.test_client()
    res = client.get("/api/v1/smash-or-pass/rosters/non_existent_roster/feed")
    assert res.status_code == 404
    assert "error" in res.get_json()


def test_cast_vote_valid_by_character_slug_and_entity_id(app):
    """Test casting smash, pass, super_smash votes and unwinding previous votes."""
    client = app.test_client()

    # 1. Vote smash by character_slug
    res1 = client.post(
        "/api/v1/smash-or-pass/vote",
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

    # 2. Vote super_smash on another entity by entity_id
    feed_res = client.get("/api/v1/smash-or-pass/rosters/cyberpunk_2077/feed?limit=1")
    cyber_entity = feed_res.get_json()["data"]["entities"][0]

    res2 = client.post(
        "/api/v1/smash-or-pass/vote",
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

    # 3. Change vote for Ada Wong from smash to pass (unwinds previous smash)
    res3 = client.post(
        "/api/v1/smash-or-pass/vote",
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


def test_cast_vote_authenticated_and_spoof_prevention(app, db_session):
    """Test that authenticated vote always binds to current_user.id and ignores spoofed user_id."""
    client = app.test_client()
    user = _create_user(db_session, username="alice", email="alice@test.com")
    token = generate_token(user.id, role="user")

    res = client.post(
        "/api/v1/smash-or-pass/vote",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "character_slug": "ada_wong",
            "vote_type": "smash",
            "user_id": 99999,  # Attempted spoof
        },
    )
    assert res.status_code == 200

    # Verify vote is bound to user.id in service
    service = SmashOrPassService()
    user_votes = service.get_user_votes(user_id=user.id, edition="canon")
    assert len(user_votes) == 1
    assert user_votes[0]["character_slug"] == "ada_wong"

    # Spoofed user has no votes
    spoofed_votes = service.get_user_votes(user_id=99999, edition="canon")
    assert len(spoofed_votes) == 0


def test_cast_vote_validation_errors(app):
    """Test validation errors for invalid input on POST /vote."""
    client = app.test_client()

    # Missing entity and character_slug
    res1 = client.post("/api/v1/smash-or-pass/vote", json={"vote_type": "smash"})
    assert res1.status_code == 400
    assert "required" in res1.get_json()["error"]

    # Missing vote_type
    res2 = client.post(
        "/api/v1/smash-or-pass/vote", json={"character_slug": "ada_wong"}
    )
    assert res2.status_code == 400
    assert "required" in res2.get_json()["error"]

    # Invalid vote_type
    res3 = client.post(
        "/api/v1/smash-or-pass/vote",
        json={"character_slug": "ada_wong", "vote_type": "invalid_vote"},
    )
    assert res3.status_code == 400
    assert "Invalid vote_type" in res3.get_json()["error"]

    # Non-existent character slug
    res4 = client.post(
        "/api/v1/smash-or-pass/vote",
        json={"character_slug": "non_existent_char_12345", "vote_type": "smash"},
    )
    assert res4.status_code == 400
    assert "not found" in res4.get_json()["error"].lower()


def test_cast_vote_rate_limiting_and_pruning(app):
    """Test sliding-window rate limiting returns 429 when exceeding 60 votes/min and auto-pruning works."""
    client = app.test_client()
    vote_rate_limiter.reset()

    # Send 60 valid votes within the window
    for i in range(60):
        res = client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "character_slug": "ada_wong",
                "vote_type": "smash",
                "session_id": "rate_limit_session",
            },
        )
        assert res.status_code == 200, f"Request {i+1} failed with status {res.status_code}"

    # 61st vote should be blocked by the rate limiter
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

    # Another session_id should still be allowed
    res_other = client.post(
        "/api/v1/smash-or-pass/vote",
        json={
            "character_slug": "ada_wong",
            "vote_type": "smash",
            "session_id": "other_unlimited_session",
        },
    )
    assert res_other.status_code == 200

    # Test auto-pruning
    vote_rate_limiter._requests["127.0.0.1:stale_sess"] = [time.time() - 100]
    vote_rate_limiter._prune_stale_keys(time.time() - 60)
    assert "127.0.0.1:stale_sess" not in vote_rate_limiter._requests


def test_get_leaderboard_success_and_sorting(app):
    """Test GET /api/v1/smash-or-pass/rosters/<slug>/leaderboard rankings, tiers, and sorting."""
    client = app.test_client()

    # Seed varied votes
    # Ada Wong: 3 smashes -> 100% -> God Tier
    for i in range(3):
        client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "character_slug": "ada_wong",
                "vote_type": "smash",
                "session_id": f"lb_sess_ada_{i}",
            },
        )

    # Sable Ward: 2 smashes, 1 pass -> 66.7% -> Fatal Attraction
    for i in range(2):
        client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "character_slug": "sable_ward",
                "vote_type": "smash",
                "session_id": f"lb_sess_sable_s_{i}",
            },
        )
    client.post(
        "/api/v1/smash-or-pass/vote",
        json={
            "character_slug": "sable_ward",
            "vote_type": "pass",
            "session_id": "lb_sess_sable_p",
        },
    )

    # Trapper: 2 passes -> 0% -> Eldritch Void
    for i in range(2):
        client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "character_slug": "the_trapper",
                "vote_type": "pass",
                "session_id": f"lb_sess_trap_{i}",
            },
        )

    # Fetch leaderboard
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

    # Test filtering by role
    res_surv = client.get(
        "/api/v1/smash-or-pass/rosters/canon/leaderboard?role=Survivor&limit=5"
    )
    assert res_surv.status_code == 200
    surv_data = res_surv.get_json()["data"]
    assert len(surv_data) == 5
    assert all(e["role"] == "Survivor" for e in surv_data)

    # Test not found
    res_404 = client.get("/api/v1/smash-or-pass/rosters/unknown_roster/leaderboard")
    assert res_404.status_code == 404


def test_post_session_reset(app):
    """Test POST /api/v1/smash-or-pass/session/reset unwinds votes for a given session."""
    client = app.test_client()

    # Cast 2 votes
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

    # Reset session votes
    res = client.post(
        "/api/v1/smash-or-pass/session/reset",
        json={"session_id": "session_to_reset_123"},
    )
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data["status"] == "success"
    assert json_data["data"]["reset_count"] == 2

    # Reset again (should be 0)
    res_again = client.post(
        "/api/v1/smash-or-pass/session/reset",
        json={"session_id": "session_to_reset_123"},
    )
    assert res_again.status_code == 200
    assert res_again.get_json()["data"]["reset_count"] == 0

    # Missing session_id
    res_bad = client.post("/api/v1/smash-or-pass/session/reset", json={})
    assert res_bad.status_code == 400


def test_post_user_votes_reset_and_idor_protection(app, db_session):
    """Test POST /api/v1/smash-or-pass/user-votes/reset with authorization and IDOR protections."""
    client = app.test_client()
    user1 = _create_user(db_session, username="bob", email="bob@test.com")
    user2 = _create_user(db_session, username="charlie", email="charlie@test.com")
    admin = _create_user(db_session, username="admin_bob", email="admin_bob@test.com", role="admin")

    token1 = generate_token(user1.id, role="user")
    token_admin = generate_token(admin.id, role="admin")

    # Cast a vote for user1
    service = SmashOrPassService()
    service.cast_vote(character_slug="feng_min", vote_type="super_smash", user_id=user1.id)
    assert len(service.get_user_votes(user1.id, "canon")) == 1

    # 1. Unauthenticated reset without user_id -> 400
    res_unauth_no_id = client.post("/api/v1/smash-or-pass/user-votes/reset", json={})
    assert res_unauth_no_id.status_code == 400

    # 2. Unauthenticated reset with user_id -> 401
    res_unauth_with_id = client.post(
        "/api/v1/smash-or-pass/user-votes/reset", json={"user_id": user1.id}
    )
    assert res_unauth_with_id.status_code == 401

    # 3. User1 attempts IDOR against User2 -> 403
    res_idor = client.post(
        "/api/v1/smash-or-pass/user-votes/reset",
        headers={"Authorization": f"Bearer {token1}"},
        json={"user_id": user2.id},
    )
    assert res_idor.status_code == 403

    # 4. User1 resets their own votes -> 200
    res_own = client.post(
        "/api/v1/smash-or-pass/user-votes/reset",
        headers={"Authorization": f"Bearer {token1}"},
        json={},
    )
    assert res_own.status_code == 200
    assert res_own.get_json()["data"]["reset_count"] == 1
    assert len(service.get_user_votes(user1.id, "canon")) == 0

    # 5. Admin resets another user's votes -> 200
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


def test_get_translations_smash_route(app):
    """Test GET /api/v1/smash-or-pass/translations dynamic localized dictionary."""
    client = app.test_client()

    # English
    res_en = client.get("/api/v1/smash-or-pass/translations?locale=en")
    assert res_en.status_code == 200
    data_en = res_en.get_json()
    assert data_en["locale"] == "en"
    assert data_en["data"]["smashOrPass.tiers.godTier"] == "God Tier"

    # Japanese
    res_ja = client.get("/api/v1/smash-or-pass/translations?locale=ja")
    assert res_ja.status_code == 200
    data_ja = res_ja.get_json()
    assert data_ja["locale"] == "ja"
    assert data_ja["data"]["smashOrPass.tiers.godTier"] == "神ティア"


def test_global_i18n_dynamic_endpoint(app):
    """Test global dynamic route GET /api/v1/i18n/<locale> for all supported languages."""
    client = app.test_client()

    # English
    res_en = client.get("/api/v1/i18n/en")
    assert res_en.status_code == 200
    data_en = res_en.get_json()
    assert data_en["locale"] == "en"
    assert data_en["data"]["smashOrPass.rosters.canon.name"] == "Dead by Daylight: Fog Canon"
    assert data_en["data"]["smashOrPass.tiers.godTier"] == "God Tier"

    # Japanese
    res_ja = client.get("/api/v1/i18n/ja")
    assert res_ja.status_code == 200
    data_ja = res_ja.get_json()
    assert data_ja["locale"] == "ja"
    assert "霧の正史" in data_ja["data"]["smashOrPass.rosters.canon.name"]
    assert data_ja["data"]["smashOrPass.tiers.godTier"] == "神ティア"

    # Spanish
    res_es = client.get("/api/v1/i18n/es")
    assert res_es.status_code == 200
    data_es = res_es.get_json()
    assert data_es["locale"] == "es"
    assert data_es["data"]["smashOrPass.tiers.godTier"] == "Nivel Dios"

    # German
    res_de = client.get("/api/v1/i18n/de")
    assert res_de.status_code == 200
    data_de = res_de.get_json()
    assert data_de["locale"] == "de"
    assert data_de["data"]["smashOrPass.tiers.godTier"] == "Götter-Stufe"

    # Polish
    res_pl = client.get("/api/v1/i18n/pl")
    assert res_pl.status_code == 200
    data_pl = res_pl.get_json()
    assert data_pl["locale"] == "pl"
    assert data_pl["data"]["smashOrPass.tiers.godTier"] == "Boski Poziom"


def test_legacy_routes_backward_compatibility(app, db_session):
    """Test legacy smash-or-pass endpoints for backward compatibility."""
    client = app.test_client()
    user = _create_user(db_session, username="legacy_user", email="legacy@test.com")
    token = generate_token(user.id, role="user")

    # 1. GET /editions
    res_ed = client.get("/api/v1/smash-or-pass/editions")
    assert res_ed.status_code == 200
    ed_data = res_ed.get_json()["data"]
    assert len(ed_data) >= 6

    # 2. GET /characters
    res_chars = client.get(
        "/api/v1/smash-or-pass/characters?edition=canon&role=Survivor&search=Leon"
    )
    assert res_chars.status_code == 200
    chars_data = res_chars.get_json()
    assert chars_data["count"] == 1
    assert chars_data["data"][0]["character_slug"] == "leon_scott_kennedy"

    # 3. GET /user-votes
    # First vote as authenticated user
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
