# backend/tests/unit/test_phase4_services.py
import pytest
from flask.testing import FlaskClient
from app import create_app
from app.services.others.build_service import BuildService


@pytest.mark.unit
class TestPhase4Services:
    """Tests for Phase 4 Community builds: querying, search, upvotes, and mutations."""

    @pytest.fixture
    def build_service(self) -> BuildService:
        return BuildService()

    @pytest.fixture
    def client(self) -> FlaskClient:
        app = create_app()
        app.config["TESTING"] = True
        return app.test_client()

    def test_seed_builds_count(self, build_service: BuildService) -> None:
        builds = build_service.get_builds()
        assert len(builds) >= 6

    def test_filter_by_role(self, build_service: BuildService) -> None:
        survivor_builds = build_service.get_builds(role="survivor")
        killer_builds = build_service.get_builds(role="killer")

        assert all(b["role"] == "survivor" for b in survivor_builds)
        assert all(b["role"] == "killer" for b in killer_builds)
        assert len(survivor_builds) > 0
        assert len(killer_builds) > 0

    def test_filter_by_category(self, build_service: BuildService) -> None:
        otz_builds = build_service.get_builds(category="otzdarva")
        meta_builds = build_service.get_builds(category="meta")

        assert all(b["category"] == "otzdarva" for b in otz_builds)
        assert all(b["category"] == "meta" for b in meta_builds)
        assert len(otz_builds) > 0
        assert len(meta_builds) > 0

    def test_search_builds(self, build_service: BuildService) -> None:
        results = build_service.get_builds(search="Huntress")
        assert len(results) > 0
        assert "Huntress" in results[0]["title"]

    def test_sort_by_upvotes(self, build_service: BuildService) -> None:
        builds = build_service.get_builds(sort_by="upvotes")
        upvotes_list = [b["upvotes"] for b in builds]
        assert upvotes_list == sorted(upvotes_list, reverse=True)

    def test_create_and_upvote_build(self, build_service: BuildService) -> None:
        new_build = build_service.create_build(
            title="Custom Test Build",
            description="Testing creation",
            role="survivor",
            category="chase",
            character_id="dwight_fairfield",
            perks=["Bond", "Prove Thyself", "Leader", "Sprint Burst"],
            author="Tester",
        )
        assert new_build["title"] == "Custom Test Build"
        assert new_build["upvotes"] == 0

        updated_build = build_service.upvote_build(new_build["id"])
        assert updated_build["upvotes"] == 1

    def test_api_list_builds(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/builds/?role=killer&category=otzdarva")
        assert res.status_code == 200
        data = res.get_json()
        assert "builds" in data
        assert all(b["role"] == "killer" for b in data["builds"])

    def test_api_create_build(self, client: FlaskClient) -> None:
        payload = {
            "title": "API Created Loadout",
            "description": "API Test loadout description",
            "role": "killer",
            "category": "stealth",
            "character_id": "ghost_face",
            "perks": ["Thrilling Tremors", "I'm All Ears", "Furtive Chase", "Nemesis"],
            "author": "Ghosty",
        }
        res = client.post("/api/v1/builds/", json=payload)
        assert res.status_code == 201
        data = res.get_json()
        assert data["build"]["title"] == "API Created Loadout"

    def test_api_upvote_build(self, client: FlaskClient) -> None:
        create_res = client.post(
            "/api/v1/builds/",
            json={
                "title": "Upvote Target Build",
                "description": "Target build",
                "role": "survivor",
                "category": "meme",
                "perks": ["Head On"],
                "author": "MemeKing",
            },
        )
        build_id = create_res.get_json()["build"]["id"]

        upvote_res = client.post(f"/api/v1/builds/{build_id}/upvote")
        assert upvote_res.status_code == 200
        upvote_data = upvote_res.get_json()
        assert upvote_data["build"]["upvotes"] == 1
