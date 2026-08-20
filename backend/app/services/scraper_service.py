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
    normalise_character_name,
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


from app.scrapers.roster_images import RosterImageScraperDriver


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
    normalise_character_name = staticmethod(normalise_character_name)

    def __init__(
        self,
        base_dir: Optional[Path] = None,
        config_file: Optional[Path] = None,
    ):
        if base_dir is None:
            self.base_dir = Path(__file__).resolve().parent.parent.parent
        else:
            self.base_dir = Path(base_dir)
        self.static_dir = self.base_dir / "app" / "static"
        self.data_dir = self.base_dir / "data"
        self.config_file = config_file or (self.data_dir / "scraper_config.json")
        self.state_manager = ScraperStateManager()
        self.wikigg_driver = WikiGGScraperDriver(self.base_dir)
        self.hens_map_driver = HensMapScraperDriver()
        self.samoel_map_driver = SamoelColtMapScraperDriver()
        self.roster_driver = RosterImageScraperDriver(
            timeout=self.REQUEST_TIMEOUT,
        )

    def scrape_roster_edition_images(self, edition_id: str = "hooked_on_you") -> List[Dict[str, Any]]:
        """Scrape character portrait image URLs for a specific Smash-or-Pass edition."""
        return self.roster_driver.scrape_roster_portraits(edition_id)

    def sync_roster_edition_assets(self, edition_id: str = "hooked_on_you", static_dir: Optional[Path] = None) -> Dict[str, Any]:
        """Scrape and download artwork assets for a custom edition into static assets directory."""
        target_static = static_dir or self.static_dir
        return self.roster_driver.sync_edition_assets(edition_id, target_static)

    def parse_character_page(self, html: str, page_category: str = "") -> List[CharacterData]:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        characters = []
        seen = set()
        for a in soup.find_all("a"):
            title = a.get("title", "").strip()
            href = a.get("href", "")
            img = a.find("img")
            if not title or not img:
                continue
            src = img.get("src", "")
            classified = classify_portrait(src)
            if not classified:
                continue
            role, rel_num = classified
            if title in seen:
                continue
            seen.add(title)
            slug = extract_slug_from_href(href) or title.replace(" ", "_")
            role_folder = "killers" if role == "Killer" else "survivors"
            s_fn = sanitize_filename(title)
            characters.append(
                CharacterData(
                    name=title,
                    real_name=title,
                    wiki_slug=slug,
                    short_name=s_fn,
                    category=role,
                    avatar_url=src,
                    avatar_local_path=f"avatars/{role_folder}/{s_fn}.png",
                    release_number=rel_num,
                    code_prefix=f"{role[0]}{rel_num:02d}",
                )
            )
        return characters

    def match_perk_owner(self, owner_str: str, characters: List[CharacterData]) -> Optional[CharacterData]:
        if not owner_str:
            return None
        norm = normalize_name_key(owner_str)
        for c in characters:
            if normalize_name_key(c.name) == norm or normalize_name_key(c.real_name) == norm:
                return c
            if c.category == "Killer":
                norm_c = normalize_name_key(normalise_character_name(c.name, "Killer"))
                if norm == norm_c:
                    return c
        return None

    def parse_perks(self, html: str, characters: List[CharacterData]) -> List[PerkData]:
        return self.wikigg_driver.parse_perks(html, characters)

    def prune_stale_character_rows(self, valid_characters: Any) -> Dict[str, int]:
        from app.services.db_service import DatabaseService
        if isinstance(valid_characters, list):
            valid_names = {c.name for c in valid_characters}
        elif isinstance(valid_characters, set):
            valid_names = valid_characters
        else:
            valid_names = set()
        return DatabaseService().prune_stale_character_rows(valid_names)

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

