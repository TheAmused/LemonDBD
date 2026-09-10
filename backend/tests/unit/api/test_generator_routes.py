# backend/tests/unit/api/test_generator_routes.py
import pytest
from flask import Flask
from flask.testing import FlaskClient
from app import create_app


@pytest.mark.unit
class TestGeneratorRoutesRemoved:
    """Tests asserting that legacy generator API endpoints are decoupled and return 404."""

    @pytest.fixture
    def client(self) -> FlaskClient:
        app = create_app()
        app.config["TESTING"] = True
        return app.test_client()

    def test_generator_config_get_returns_404(self, client: FlaskClient) -> None:
        response = client.get("/api/v1/generator/config")
        assert response.status_code == 404

    def test_generator_config_post_returns_404(self, client: FlaskClient) -> None:
        response = client.post("/api/v1/generator/config", json={"gen_mode": "wheel"})
        assert response.status_code == 404

    @pytest.mark.parametrize("role", ["Survivor", "Killer"])
    def test_generator_drawn_get_returns_404(self, client: FlaskClient, role: str) -> None:
        response = client.get(f"/api/v1/generator/drawn?role={role}")
        assert response.status_code == 404

    def test_generator_draw_post_returns_404(self, client: FlaskClient) -> None:
        response = client.post(
            "/api/v1/generator/draw",
            json={"role": "Survivor", "perks": ["Sprint Burst", "Adrenaline"]},
        )
        assert response.status_code == 404

    def test_generator_reset_post_returns_404(self, client: FlaskClient) -> None:
        response = client.post("/api/v1/generator/reset", json={"role": "Survivor"})
        assert response.status_code == 404
