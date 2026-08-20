# backend/tests/test_roster_image_scraper.py
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch
from app.scrapers.roster_images import RosterImageScraperDriver
from app.services.scraper_service import ScraperService


def test_roster_image_scraper_driver_init():
    driver = RosterImageScraperDriver(timeout=15)
    assert driver.timeout == 15
    assert "User-Agent" in driver.session.headers


def test_roster_image_scraper_scrape_portraits_mocked():
    driver = RosterImageScraperDriver()
    mock_html = """
    <html>
      <body>
        <div class="gallery">
          <img src="/images/char1_portrait.png" alt="Special Extra Hero Outfit Portrait" />
          <img src="/images/char2_render.png" alt="Special Extra Villain Render" />
          <img src="/images/other.png" alt="Random map icon" />
        </div>
      </body>
    </html>
    """
    with patch.object(driver, "fetch_page_soup") as mock_soup:
        from bs4 import BeautifulSoup
        mock_soup.return_value = BeautifulSoup(mock_html, "html.parser")
        results = driver.scrape_roster_portraits("custom_test_edition")

        assert len(results) == 2
        names = [r["character_name"] for r in results]
        assert "Special Extra Hero" in names or "Special Extra Hero Outfit" in names
        assert "Special Extra Villain" in names


def test_scraper_service_roster_integration(tmp_path):
    service = ScraperService(base_dir=tmp_path)
    assert hasattr(service, "scrape_roster_edition_images")
    assert hasattr(service, "sync_roster_edition_assets")
    assert service.roster_driver is not None
