# backend/tests/live/api/test_live_perks_api.py
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
class TestLivePerksAndEquipmentAPI:
    """Tests for Perk listings, Character profiles, Items, Addons, and Maps against live PostgreSQL."""

    def test_live_list_perks_pagination_and_filtering(self, live_client: FlaskClient) -> None:
        res = live_client.get("/api/v1/perks?limit=20")
        assert res.status_code == 200
        data = res.get_json()
        assert "data" in data
        assert len(data["data"]) == 20
        assert data["pagination"]["total"] > 200

        res_surv = live_client.get("/api/v1/perks?category=Survivor&limit=10")
        assert res_surv.status_code == 200
        surv_data = res_surv.get_json()
        assert all(
            p["category"] == "Survivor" or p.get("role") == "Survivor"
            for p in surv_data["data"]
        )

        res_killer = live_client.get("/api/v1/perks?category=Killer&limit=10")
        assert res_killer.status_code == 200
        killer_data = res_killer.get_json()
        assert all(
            p["category"] == "Killer" or p.get("role") == "Killer"
            for p in killer_data["data"]
        )

        res_search = live_client.get("/api/v1/perks?search=Sprint")
        assert res_search.status_code == 200
        search_data = res_search.get_json()
        assert any("Sprint" in p["name"] for p in search_data["data"])

    def test_live_get_perk_by_identifier(self, live_client: FlaskClient) -> None:
        res = live_client.get("/api/v1/perks/Sprint_Burst")
        if res.status_code == 404:
            res = live_client.get("/api/v1/perks/sprint-burst")
        assert res.status_code == 200
        data = res.get_json()
        perk = data.get("data", data)
        assert "Sprint Burst" in perk["name"]

    def test_live_list_characters_and_details(self, live_client: FlaskClient) -> None:
        res = live_client.get("/api/v1/characters")
        assert res.status_code == 200
        data = res.get_json()
        characters = data.get("data", []) if isinstance(data, dict) else data
        assert len(characters) >= 50

        res_trapper = live_client.get("/api/v1/characters/The_Trapper/detail")
        if res_trapper.status_code == 404:
            res_trapper = live_client.get("/api/v1/characters/The%20Trapper/detail")
        assert res_trapper.status_code == 200
        trapper_data = res_trapper.get_json()["data"]
        assert trapper_data["character"]["name"] == "The Trapper"
        assert len(trapper_data["perks"]) > 0

    def test_live_list_items_and_addons(self, live_client: FlaskClient) -> None:
        res_items = live_client.get("/api/v1/items")
        assert res_items.status_code == 200
        items_data = res_items.get_json()
        items = items_data.get("data", []) if isinstance(items_data, dict) else items_data
        assert len(items) >= 5

        res_addons = live_client.get("/api/v1/addons")
        assert res_addons.status_code == 200
        addons_data = res_addons.get_json()
        addons = addons_data.get("data", []) if isinstance(addons_data, dict) else addons_data
        assert len(addons) >= 10

    def test_live_list_maps(self, live_client: FlaskClient) -> None:
        res = live_client.get("/api/v1/maps")
        assert res.status_code == 200
        maps_data = res.get_json()
        maps_list = maps_data.get("maps", [])
        assert isinstance(maps_list, list)
