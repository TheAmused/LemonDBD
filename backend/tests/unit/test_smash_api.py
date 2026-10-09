# backend/tests/unit/test_smash_api.py
import time
import pytest
from flask import Flask
from sqlalchemy.orm import Session
from app.core.security import generate_token
from app.routes.smash_or_pass import vote_rate_limiter
from app.services.smash_or_pass_service import SmashOrPassService
from tests.unit.smash_api_support import create_user as _create_user, setup_smash_data  # noqa: F401 (autouse fixture)


@pytest.mark.unit
class TestSmashOrPassAPI:
    """Tests for Smash or Pass rosters, feeds, voting, leaderboards, and rate limits."""

    def test_get_rosters(self, app: Flask) -> None:
        client = app.test_client()
        res = client.get("/api/v1/smash-or-pass/rosters")
        assert res.status_code == 200
        json_data = res.get_json()
        assert json_data["count"] == 7
        assert len(json_data["data"]) == 7

        slugs = {r["slug"] for r in json_data["data"]}
        assert slugs == {
            "canon",
            "canon_gemini",
            "hooked_on_you",
            "legendary_characters",
            "cyberpunk_2077",
            "anime_manga",
            "gothic_eldritch",
        }

        canon = next(r for r in json_data["data"] if r["slug"] == "canon")
        assert canon["entity_count"] == 98
        assert canon["total_votes"] == 0
        assert canon["is_active"] is True
        assert "theme_color" in canon
        assert canon["name"] == "Dead by Daylight: Fog Canon"
        assert "name_i18n_key" not in canon
        assert "description_i18n_key" not in canon

        # Localized roster endpoint (?lang=pl)
        res_pl = client.get("/api/v1/smash-or-pass/rosters?lang=pl")
        assert res_pl.status_code == 200
        canon_pl = next(r for r in res_pl.get_json()["data"] if r["slug"] == "canon")
        assert canon_pl["name"] == "Dead by Daylight: Kanon Mgły"
        assert canon_pl["description"] == "Oficjalne 98 postaci z mgły próby."
        assert "name_i18n_key" not in canon_pl
        assert "description_i18n_key" not in canon_pl

        # Test alias endpoint /api/v1/smash/rosters?lang=pl
        res_alias = client.get("/api/v1/smash/rosters?lang=pl")
        assert res_alias.status_code == 200
        canon_alias = next(r for r in res_alias.get_json()["data"] if r["slug"] == "canon")
        assert canon_alias["name"] == "Dead by Daylight: Kanon Mgły"
        assert "name_i18n_key" not in canon_alias

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
        assert feed_data["total_remaining"] == 29
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
        assert feed_after["total_remaining"] == 28

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
