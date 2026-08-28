# backend/tests/unit/api/test_generator_routes.py
import pytest
from flask import Flask
from flask.testing import FlaskClient
from app import create_app


@pytest.mark.unit
class TestGeneratorRoutes:
    """Tests for Generator configuration and persistent perk draw state."""

    @pytest.fixture
    def client(self) -> FlaskClient:
        app = create_app()
        app.config["TESTING"] = True
        return app.test_client()

    def test_get_config_returns_200(self, client: FlaskClient) -> None:
        response = client.get("/api/v1/generator/config")
        assert response.status_code == 200
        data = response.get_json()
        assert "config" in data

    def test_update_config_returns_200(self, client: FlaskClient) -> None:
        response = client.post("/api/v1/generator/config", json={"gen_mode": "wheel"})
        assert response.status_code == 200
        data = response.get_json()
        assert "config" in data
        assert data["config"]["gen_mode"] == "wheel"

    @pytest.mark.parametrize("role", ["Survivor", "Killer"])
    def test_get_drawn_perks_returns_200(self, client: FlaskClient, role: str) -> None:
        response = client.get(f"/api/v1/generator/drawn?role={role}")
        assert response.status_code == 200
        data = response.get_json()
        assert "drawn_perks" in data
        assert isinstance(data["drawn_perks"], list)

    def test_add_drawn_perks_returns_200(self, client: FlaskClient) -> None:
        response = client.post(
            "/api/v1/generator/draw",
            json={"role": "Survivor", "perks": ["Sprint Burst", "Adrenaline"]},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert "drawn_perks" in data
        assert "Sprint Burst" in data["drawn_perks"]

    def test_reset_drawn_perks_returns_200(self, client: FlaskClient) -> None:
        response = client.post("/api/v1/generator/reset", json={"role": "Survivor"})
        assert response.status_code == 200
        data = response.get_json()
        assert data["drawn_perks"] == []
