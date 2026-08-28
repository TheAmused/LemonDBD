# backend/tests/unit/api/test_scraper_routes.py
from unittest.mock import MagicMock, patch
import pytest
from flask.testing import FlaskClient
from app.services.scraper_service import ScraperConfig, ScraperService


@pytest.mark.unit
class TestScraperRoutes:
    """Tests for administrative Scraper trigger and configuration endpoints."""

    @patch(
        "app.core.security.get_current_user",
        return_value=MagicMock(is_admin=True, role="admin", is_anonymous=False),
    )
    @patch.object(ScraperService, "load_config")
    @patch.object(ScraperService, "save_config")
    def test_get_and_post_scrape_config(
        self,
        mock_save_config: MagicMock,
        mock_load_config: MagicMock,
        mock_user: MagicMock,
        client: FlaskClient,
    ) -> None:
        mock_load_config.return_value = ScraperConfig(source="nightlight", fallback_to_wiki=True)
        mock_save_config.return_value = ScraperConfig(source="wiki", fallback_to_wiki=False)

        response = client.get("/api/v1/scrape/config")
        assert response.status_code == 200
        data = response.get_json()
        assert "source" in data
        assert "fallback_to_wiki" in data
        assert data["source"] == "nightlight"
        assert data["fallback_to_wiki"] is True

        payload = {"source": "wiki", "fallback_to_wiki": False}
        post_response = client.post("/api/v1/scrape/config", json=payload)
        assert post_response.status_code == 200
        post_data = post_response.get_json()
        assert "message" in post_data
        assert "config" in post_data
        assert post_data["config"]["source"] == "wiki"
        assert post_data["config"]["fallback_to_wiki"] is False
        mock_save_config.assert_called_once_with(payload)

    @patch(
        "app.core.security.get_current_user",
        return_value=MagicMock(is_admin=True, role="admin", is_anonymous=False),
    )
    @patch("app.routes.perks.threading.Thread")
    @patch.object(ScraperService, "get_status", return_value={"is_running": False})
    def test_trigger_scrape_with_overrides(
        self,
        mock_status: MagicMock,
        mock_thread: MagicMock,
        mock_user: MagicMock,
        client: FlaskClient,
    ) -> None:
        response = client.post(
            "/api/v1/scrape",
            json={"source": "wiki", "fallback": False},
        )
        assert response.status_code == 202
        mock_thread.assert_called_once()
        _, kwargs = mock_thread.call_args
        assert "kwargs" in kwargs
        assert kwargs["kwargs"].get("override_source") == "wiki"
        assert kwargs["kwargs"].get("override_fallback") is False
