# backend/app/services/scraper/state.py
import json
import logging
import threading
from pathlib import Path
from typing import Any

from app.scrapers.types import ScraperConfig

logger = logging.getLogger(__name__)


class ScraperStateManager:
    """Thread-safe state manager for scraper pipeline status and configuration persistence in database."""

    _lock = threading.Lock()
    _status: dict[str, Any] = {
        "is_running": False,
        "progress": 0,
        "total": 0,
        "current_step": "idle",
        "last_run": None,
        "error": None,
        "fallback_used": False,
        "last_used_source": "wikigg",
    }

    @classmethod
    def get_status(cls) -> dict[str, Any]:
        with cls._lock:
            return cls._status.copy()

    @classmethod
    def update_status(cls, **kwargs: Any) -> None:
        with cls._lock:
            cls._status.update(kwargs)

    @classmethod
    def increment_progress(cls) -> None:
        with cls._lock:
            cls._status["progress"] += 1

    @staticmethod
    def load_config(config_file: Path | None = None) -> ScraperConfig:
        """Load scraper configuration from PostgreSQL database with file / in-memory fallback."""
        try:
            from app.core.extensions import db
            from app.models.minigames import ScraperSetting
            from sqlalchemy import select

            setting = db.session.scalars(select(ScraperSetting)).first()
            if setting:
                return ScraperConfig(
                    source=setting.source or "wikigg",
                    fallback_to_wiki=bool(setting.fallback_to_wiki),
                    last_used_source=setting.last_used_source or "wikigg",
                    last_run_timestamp=setting.last_run_timestamp,
                )
        except Exception as db_err:
            logger.debug(f"Database load for ScraperSetting not available: {db_err}")

        if config_file and config_file.exists():
            try:
                with open(config_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return ScraperConfig.from_dict(data)
            except Exception as file_err:
                logger.error(f"Error loading scraper config from {config_file}: {file_err}")

        return ScraperConfig(source="wikigg", fallback_to_wiki=False, last_used_source="wikigg")

    @staticmethod
    def save_config(
        config_file: Path | None,
        data: ScraperConfig | dict[str, Any],
    ) -> ScraperConfig:
        """Persist scraper configuration to PostgreSQL database and optional file."""
        if isinstance(data, ScraperConfig):
            config_obj = data
        elif isinstance(data, dict):
            current_dict = ScraperStateManager.load_config(config_file).to_dict()
            current_dict.update(data)
            config_obj = ScraperConfig.from_dict(current_dict)
        else:
            raise ValueError("Data must be a ScraperConfig instance or a dict")

        try:
            from app.core.extensions import db
            from app.models.minigames import ScraperSetting
            from sqlalchemy import select

            setting = db.session.scalars(select(ScraperSetting)).first()
            if setting:
                setting.source = config_obj.source
                setting.fallback_to_wiki = config_obj.fallback_to_wiki
                setting.last_used_source = config_obj.last_used_source
                setting.last_run_timestamp = config_obj.last_run_timestamp
            else:
                setting = ScraperSetting(
                    source=config_obj.source,
                    fallback_to_wiki=config_obj.fallback_to_wiki,
                    last_used_source=config_obj.last_used_source,
                    last_run_timestamp=config_obj.last_run_timestamp,
                )
                db.session.add(setting)
            db.session.commit()
        except Exception as db_err:
            logger.debug(f"Database persistence for ScraperSetting skipped: {db_err}")

        if config_file:
            try:
                config_file.parent.mkdir(parents=True, exist_ok=True)
                with open(config_file, "w", encoding="utf-8") as f:
                    json.dump(config_obj.to_dict(), f, indent=2, ensure_ascii=False)
            except Exception as file_err:
                logger.debug(f"File persistence for scraper config skipped: {file_err}")

        return config_obj
