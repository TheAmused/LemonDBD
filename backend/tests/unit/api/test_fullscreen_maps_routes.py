# backend/tests/unit/api/test_fullscreen_maps_routes.py
import pytest
from flask import Flask
from flask.testing import FlaskClient
from app import create_app


@pytest.mark.unit
class TestFullscreenMapsRoutes:
    """Tests for Map SVG and Floor detail HTTP routes."""

    @pytest.fixture
    def client(self) -> FlaskClient:
        app = create_app()
        app.config["TESTING"] = True
        return app.test_client()

    @pytest.mark.parametrize(
        "seed, floor",
        [
            ("seed_a", 1),
            ("seed_b", 2),
            ("seed_c", 1),
        ],
    )
    def test_get_map_detail_with_seed_and_floor_params(
        self, client: FlaskClient, seed: str, floor: int
    ) -> None:
        response = client.get(f"/api/v1/maps/coal_tower?seed={seed}&floor={floor}")
        assert response.status_code == 200
        data = response.get_json()
        assert "map" in data
        map_detail = data["map"]
        assert "tiles" in map_detail
        assert "objectives" in map_detail
        assert map_detail.get("seed_variant") == seed
        assert map_detail.get("floor") == floor

    def test_get_map_detail_default_seed_a_floor_1(self, client: FlaskClient) -> None:
        response = client.get("/api/v1/maps/coal_tower?seed=seed_a&floor=1")
        assert response.status_code == 200
        data = response.get_json()
        assert "map" in data
        map_detail = data["map"]
        assert "tiles" in map_detail
        assert "objectives" in map_detail
        assert map_detail.get("seed_variant") == "seed_a"
        assert map_detail.get("floor") == 1
