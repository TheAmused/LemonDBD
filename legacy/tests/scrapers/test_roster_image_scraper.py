# backend/tests/unit/scrapers/test_roster_image_scraper.py
from pathlib import Path
import pytest
from app.scrapers.roster_images import RosterImageScraperDriver
from app.services.scraper_service import ScraperService


@pytest.mark.unit
class TestRosterImageScraper:
    """Tests for scraping and synchronizing multi-edition portrait assets."""

    def test_roster_image_scraper_driver_init(self) -> None:
        driver = RosterImageScraperDriver(timeout=15)
        assert driver.timeout == 15
        assert "User-Agent" in driver.session.headers

    def test_roster_image_scraper_scrape_portraits_mocked(self) -> None:
        driver = RosterImageScraperDriver()
        results = driver.scrape_roster_portraits("hooked_on_you")

        assert len(results) > 0
        names = [r["character_name"] for r in results]
        assert any("Huntress" in name for name in names)
        assert any("Trapper" in name for name in names)
        for r in results:
            assert r["edition"] == "hooked_on_you"
            assert r["relative_path"].startswith("avatars/")
            assert r["image_url"].startswith("http")

    def test_scraper_service_roster_integration(self, tmp_path: Path) -> None:
        service = ScraperService(base_dir=tmp_path)
        assert hasattr(service, "scrape_roster_edition_images")
        assert hasattr(service, "sync_roster_edition_assets")
        assert service.roster_driver is not None
