import unittest
from unittest.mock import MagicMock, patch

from app import create_app
from app.services.scraper_service import ScraperConfig, ScraperService


class TestScraperRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    @patch.object(ScraperService, "load_config")
    @patch.object(ScraperService, "save_config")
    def test_get_and_post_scrape_config(self, mock_save_config, mock_load_config):
        mock_load_config.return_value = ScraperConfig(source="nightlight", fallback_to_wiki=True)
        mock_save_config.return_value = ScraperConfig(source="wiki", fallback_to_wiki=False)

        # GET /api/v1/scrape/config
        response = self.client.get("/api/v1/scrape/config")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("source", data)
        self.assertIn("fallback_to_wiki", data)
        self.assertEqual(data["source"], "nightlight")
        self.assertTrue(data["fallback_to_wiki"])

        # POST /api/v1/scrape/config
        payload = {"source": "wiki", "fallback_to_wiki": False}
        post_response = self.client.post("/api/v1/scrape/config", json=payload)
        self.assertEqual(post_response.status_code, 200)
        post_data = post_response.get_json()
        self.assertIn("message", post_data)
        self.assertIn("config", post_data)
        self.assertEqual(post_data["config"]["source"], "wiki")
        self.assertFalse(post_data["config"]["fallback_to_wiki"])
        mock_save_config.assert_called_once_with(payload)

    @patch("app.routes.perks.threading.Thread")
    @patch.object(ScraperService, "get_status", return_value={"is_running": False})
    def test_trigger_scrape_with_overrides(self, mock_status, mock_thread):
        response = self.client.post(
            "/api/v1/scrape",
            json={"source": "wiki", "fallback": False},
        )
        self.assertEqual(response.status_code, 202)
        mock_thread.assert_called_once()
        _, kwargs = mock_thread.call_args
        self.assertIn("kwargs", kwargs)
        self.assertEqual(kwargs["kwargs"].get("override_source"), "wiki")
        self.assertEqual(kwargs["kwargs"].get("override_fallback"), False)


if __name__ == "__main__":
    unittest.main()
