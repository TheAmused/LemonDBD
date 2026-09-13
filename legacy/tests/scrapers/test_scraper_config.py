# backend/tests/unit/scrapers/test_scraper_config.py
import json
import tempfile
from pathlib import Path
from typing import Generator
import pytest
from app.services.scraper_service import ScraperConfig, ScraperService


@pytest.mark.unit
class TestScraperConfig:
    """Tests for persistent scraper configuration serialization and fallback defaults."""

    @pytest.fixture
    def temp_scraper_service(self) -> Generator[tuple[ScraperService, Path], None, None]:
        temp_dir = tempfile.TemporaryDirectory()
        base_dir = Path(temp_dir.name)
        service = ScraperService(base_dir=base_dir)
        yield service, base_dir
        temp_dir.cleanup()

    def test_scraper_config_defaults(self) -> None:
        config = ScraperConfig()
        assert config.source == "wikigg"
        assert config.fallback_to_wiki is False
        assert config.last_used_source == "wikigg"
        assert config.last_run_timestamp is None

    def test_load_config_returns_defaults_when_file_missing(
        self, temp_scraper_service: tuple[ScraperService, Path]
    ) -> None:
        service, _ = temp_scraper_service
        config = service.load_config()
        assert isinstance(config, ScraperConfig)
        assert config.source == "wikigg"
        assert config.fallback_to_wiki is False
        assert config.last_used_source == "wikigg"
        assert config.last_run_timestamp is None

    def test_save_and_load_config_with_dict(
        self, temp_scraper_service: tuple[ScraperService, Path]
    ) -> None:
        service, base_dir = temp_scraper_service
        updated = service.save_config(
            {
                "source": "wiki",
                "fallback_to_wiki": False,
                "last_used_source": "wiki",
                "last_run_timestamp": "2026-08-10T12:00:00Z",
            }
        )
        assert isinstance(updated, ScraperConfig)
        assert updated.source == "wiki"
        assert updated.fallback_to_wiki is False

        loaded = service.load_config()
        assert loaded.source == "wiki"
        assert loaded.fallback_to_wiki is False
        assert loaded.last_used_source == "wiki"
        assert loaded.last_run_timestamp == "2026-08-10T12:00:00Z"

        config_path = base_dir / "data" / "scraper_config.json"
        assert config_path.exists()
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert data["source"] == "wiki"

    def test_save_and_load_config_with_dataclass(
        self, temp_scraper_service: tuple[ScraperService, Path]
    ) -> None:
        service, _ = temp_scraper_service
        config_obj = ScraperConfig(
            source="custom",
            fallback_to_wiki=False,
            last_used_source="custom",
            last_run_timestamp="2026-01-01T00:00:00Z",
        )
        saved = service.save_config(config_obj)
        assert saved.source == "custom"

        loaded = service.load_config()
        assert loaded.source == "custom"
        assert loaded.fallback_to_wiki is False
        assert loaded.last_used_source == "custom"
        assert loaded.last_run_timestamp == "2026-01-01T00:00:00Z"
