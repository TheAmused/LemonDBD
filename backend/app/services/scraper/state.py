# backend/app/services/scraper/state.py
import json
import logging
import threading
from pathlib import Path
from typing import Any, Dict, Union

from app.scrapers.types import ScraperConfig

logger = logging.getLogger(__name__)


class ScraperStateManager:
    """Thread-safe state manager for scraper pipeline status and configuration persistence."""

    _lock = threading.Lock()
    _status: Dict[str, Any] = {
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
    def get_status(cls) -> Dict[str, Any]:
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
    def load_config(config_file: Path) -> ScraperConfig:
        if not config_file.exists():
            return ScraperConfig(source="wikigg", fallback_to_wiki=False, last_used_source="wikigg")
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return ScraperConfig.from_dict(data)
        except Exception as e:
            logger.error(f"Error loading scraper config from {config_file}: {e}")
            return ScraperConfig(source="wikigg", fallback_to_wiki=False, last_used_source="wikigg")

    @staticmethod
    def save_config(config_file: Path, data: Union[ScraperConfig, Dict[str, Any]]) -> ScraperConfig:
        if isinstance(data, ScraperConfig):
            config_obj = data
        elif isinstance(data, dict):
            current_dict = ScraperStateManager.load_config(config_file).to_dict()
            current_dict.update(data)
            config_obj = ScraperConfig.from_dict(current_dict)
        else:
            raise ValueError("Data must be a ScraperConfig instance or a dict")

        config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(config_file, "w", encoding="utf-8") as f:
            json.dump(config_obj.to_dict(), f, indent=2, ensure_ascii=False)

        return config_obj

