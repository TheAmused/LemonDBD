# backend/tests/unit/test_phase5_services.py
import pytest
from flask.testing import FlaskClient
from app import create_app
from app.services.others.custom_perk_service import CustomPerkService


@pytest.mark.unit
class TestPhase5Services:
    """Tests for Phase 5 Custom Perks: community submissions, search, upvotes, and validation."""

    @pytest.fixture
    def service(self) -> CustomPerkService:
        return CustomPerkService()

    @pytest.fixture
    def client(self) -> FlaskClient:
        app = create_app()
        app.config["TESTING"] = True
        return app.test_client()

    def test_seed_custom_perks(self, service: CustomPerkService) -> None:
        perks = service.get_custom_perks()
        assert len(perks) >= 4

        names = [p["name"] for p in perks]
        assert "Hex: Shadow Veil" in names
        assert "Adrenaline Rush: Overdrive" in names
        assert "Totem Whisperer" in names
        assert "Entity's Shadow" in names

    def test_filter_by_role(self, service: CustomPerkService) -> None:
        survivors = service.get_custom_perks(role="survivor")
        killers = service.get_custom_perks(role="killer")

        assert all(p["role"] == "survivor" for p in survivors)
        assert all(p["role"] == "killer" for p in killers)
        assert len(survivors) > 0
        assert len(killers) > 0

    def test_filter_by_rarity(self, service: CustomPerkService) -> None:
        iri_perks = service.get_custom_perks(rarity="Iridescent")
        vr_perks = service.get_custom_perks(rarity="Very Rare")

        assert all(p["rarity"] == "Iridescent" for p in iri_perks)
        assert all(p["rarity"] == "Very Rare" for p in vr_perks)
        assert len(iri_perks) > 0

    def test_search_custom_perks(self, service: CustomPerkService) -> None:
        results = service.get_custom_perks(search="Shadow")
        assert len(results) > 0
        assert any("Shadow" in p["name"] or "Shadow" in p["description"] for p in results)

    def test_sort_custom_perks(self, service: CustomPerkService) -> None:
        upvote_sorted = service.get_custom_perks(sort_by="upvotes")
        upvotes_list = [p["upvotes"] for p in upvote_sorted]
        assert upvotes_list == sorted(upvotes_list, reverse=True)

    def test_create_and_upvote_custom_perk(self, service: CustomPerkService) -> None:
        new_perk = service.create_custom_perk(
            name="Test Custom Perk",
            role="survivor",
            character_name="Dwight Fairfield",
            rarity="Iridescent",
            icon_preset="sparkles",
            description="Grants immunity to all status effects for 10 seconds.",
            author="UnitTester",
        )
        assert new_perk["name"] == "Test Custom Perk"
        assert new_perk["role"] == "survivor"
        assert new_perk["upvotes"] == 0

        updated_perk = service.upvote_custom_perk(new_perk["id"])
        assert updated_perk is not None
        assert updated_perk["upvotes"] == 1

    def test_upvote_nonexistent_custom_perk(self, service: CustomPerkService) -> None:
        res = service.upvote_custom_perk(999999)
        assert res is None

    def test_api_list_custom_perks(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/custom-perks/?role=killer")
        assert res.status_code == 200
        data = res.get_json()
        assert "custom_perks" in data
        assert all(p["role"] == "killer" for p in data["custom_perks"])

    def test_api_create_custom_perk(self, client: FlaskClient) -> None:
        payload = {
            "name": "API Perk Concept",
            "role": "killer",
            "character_name": "The Nurse",
            "rarity": "Very Rare",
            "icon_preset": "zap",
            "description": "Blink distance increased by 20%.",
            "author": "BlinkMaster",
        }
        res = client.post("/api/v1/custom-perks/", json=payload)
        assert res.status_code == 201
        data = res.get_json()
        assert "custom_perk" in data
        assert data["custom_perk"]["name"] == "API Perk Concept"

    def test_api_create_custom_perk_validation_error(self, client: FlaskClient) -> None:
        res = client.post("/api/v1/custom-perks/", json={"role": "survivor", "description": "Test"})
        assert res.status_code == 400

    def test_api_upvote_custom_perk(self, client: FlaskClient) -> None:
        create_res = client.post(
            "/api/v1/custom-perks/",
            json={
                "name": "Upvote Target Perk",
                "role": "survivor",
                "character_name": "Claudette Morel",
                "rarity": "Uncommon",
                "icon_preset": "heart",
                "description": "Self-heal speed increased by 10%.",
                "author": "Medic",
            },
        )
        perk_id = create_res.get_json()["custom_perk"]["id"]

        upvote_res = client.post(f"/api/v1/custom-perks/{perk_id}/upvote")
        assert upvote_res.status_code == 200
        upvote_data = upvote_res.get_json()
        assert upvote_data["custom_perk"]["upvotes"] == 1

    def test_api_upvote_nonexistent_perk(self, client: FlaskClient) -> None:
        res = client.post("/api/v1/custom-perks/999999/upvote")
        assert res.status_code == 404
