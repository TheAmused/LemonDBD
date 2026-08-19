# backend/app/services/scraper_service.py
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from app.scrapers.maps import HensMapScraperDriver, SamoelColtMapScraperDriver
from app.scrapers.types import (
    AddonData,
    CharacterData,
    ItemData,
    MapData,
    PerkData,
    ScraperConfig,
)
from app.scrapers.utils import (
    classify_portrait,
    clean_description_text,
    extract_high_res_url,
    extract_slug_from_href,
    normalize_name_key,
    sanitize_filename,
)
from app.scrapers.wikigg import WikiGGScraperDriver
from app.services.scraper import (
    PERK_FRAME_TEMPLATE_PATH,
    apply_perk_diamond_frame,
    download_all_assets,
    execute_sync_pipeline,
    get_perk_frame_template,
    seed_canonical_characters_initial,
    sync_all_to_database,
)
from app.services.scraper.state import ScraperStateManager

logger = logging.getLogger(__name__)


class ScraperService:
    """Facade for the Dead by Daylight data synchronization and scraping pipeline."""

    IMPERSONATE_BROWSER: str = "chrome120"
    REQUEST_TIMEOUT: int = 30
    MAX_CONCURRENT_DOWNLOADS: int = 10

    clean_description_text = staticmethod(clean_description_text)
    normalize_name_key = staticmethod(normalize_name_key)
    sanitize_filename = staticmethod(sanitize_filename)
    extract_high_res_url = staticmethod(extract_high_res_url)
    extract_slug_from_href = staticmethod(extract_slug_from_href)
    classify_portrait = staticmethod(classify_portrait)

    _lock = ScraperStateManager._lock
    _status = ScraperStateManager._status

    _PERK_FRAME_TEMPLATE_PATH = PERK_FRAME_TEMPLATE_PATH

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        return ScraperStateManager.get_status()

    @classmethod
    def _update_status(cls, **kwargs: Any) -> None:
        ScraperStateManager.update_status(**kwargs)

    @classmethod
    def _get_perk_frame_template(cls):
        return get_perk_frame_template()

    @classmethod
    def _apply_perk_diamond_frame(cls, icon_bytes: bytes) -> bytes:
        return apply_perk_diamond_frame(icon_bytes)

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_dir = Path(base_dir)
        self.config_file = self.base_dir / "data" / "scraper_config.json"
        self.static_dir = self.base_dir / "app" / "static"
        self.data_dir = self.base_dir / "data"
        self.wikigg_driver = WikiGGScraperDriver(self.base_dir)
        self.hens_map_driver = HensMapScraperDriver()
        self.samoel_map_driver = SamoelColtMapScraperDriver()

    def load_config(self) -> ScraperConfig:
        return ScraperStateManager.load_config(self.config_file)

    def save_config(self, data: Union[ScraperConfig, Dict[str, Any]]) -> ScraperConfig:
        return ScraperStateManager.save_config(self.config_file, data)

    async def download_all_assets_async(
        self,
        perks: List[PerkData],
        characters: List[CharacterData],
        items: Optional[List[ItemData]] = None,
        addons: Optional[List[AddonData]] = None,
        maps: Optional[List[MapData]] = None,
    ) -> None:
        await download_all_assets(
            static_dir=self.static_dir,
            perks=perks,
            characters=characters,
            items=items,
            addons=addons,
            maps=maps,
            impersonate_browser=self.IMPERSONATE_BROWSER,
            max_concurrent_downloads=self.MAX_CONCURRENT_DOWNLOADS,
            request_timeout=self.REQUEST_TIMEOUT,
        )

    def seed_canonical_characters(self) -> None:
        seed_canonical_characters_initial(self.wikigg_driver)

    def run_sync_pipeline(
        self,
        override_source: Optional[str] = None,
        override_fallback: Optional[bool] = None,
        download_assets: bool = True,
    ) -> Dict[str, Any]:
        return execute_sync_pipeline(
            base_dir=self.base_dir,
            static_dir=self.static_dir,
            data_dir=self.data_dir,
            config_file=self.config_file,
            wikigg_driver=self.wikigg_driver,
            hens_map_driver=self.hens_map_driver,
            samoel_map_driver=self.samoel_map_driver,
            override_source=override_source,
            override_fallback=override_fallback,
            download_assets=download_assets,
            impersonate_browser=self.IMPERSONATE_BROWSER,
            max_concurrent_downloads=self.MAX_CONCURRENT_DOWNLOADS,
            request_timeout=self.REQUEST_TIMEOUT,
        )

    def sync_to_database(
        self,
        characters: List[CharacterData],
        perks: List[PerkData],
        items: Optional[List[ItemData]] = None,
        addons: Optional[List[AddonData]] = None,
        maps: Optional[List[MapData]] = None,
    ) -> Dict[str, int]:
        return sync_all_to_database(
            characters=characters,
            perks=perks,
            items=items,
            addons=addons,
            maps=maps,
        )

