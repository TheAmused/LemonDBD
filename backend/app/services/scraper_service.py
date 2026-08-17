import asyncio
import io
import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Union

from curl_cffi.requests import AsyncSession
from flask import current_app
from sqlalchemy import select

from app.extensions import db
from app.models import Character, Perk, Item, Addon
from app.scrapers.types import (
    ScraperConfig,
    CharacterData,
    ItemData,
    AddonData,
    PerkData,
    MapData,
)
from app.scrapers.constants_wikigg import (
    PORTRAIT_PATTERN,
    CANONICAL_DLC_INFO,
    CANONICAL_KILLER_POWERS,
    CHARACTER_ALIASES,
    EXCLUDED_SLUGS,
)
from app.scrapers.utils import (
    clean_description_text,
    normalize_name_key,
    sanitize_filename,
    extract_high_res_url,
    extract_slug_from_href,
    classify_portrait,
    normalise_character_name,
)
from app.scrapers.wikigg import WikiGGScraperDriver
from app.scrapers.maps import (
    get_map_landmarks_data,
    HensMapScraperDriver,
    SamoelColtMapScraperDriver,
)

logger = logging.getLogger(__name__)


class ScraperService:
    PERKS_URL = WikiGGScraperDriver.PERKS_URL
    SURVIVORS_URL = WikiGGScraperDriver.SURVIVORS_URL
    KILLERS_URL = WikiGGScraperDriver.KILLERS_URL

    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30
    MAX_CONCURRENT_DOWNLOADS = 10

    HEADERS = WikiGGScraperDriver.HEADERS
    CHARACTER_ALIASES = CHARACTER_ALIASES

    clean_description_text = staticmethod(clean_description_text)
    normalize_name_key = staticmethod(normalize_name_key)
    sanitize_filename = staticmethod(sanitize_filename)
    extract_high_res_url = staticmethod(extract_high_res_url)
    extract_slug_from_href = staticmethod(extract_slug_from_href)
    classify_portrait = staticmethod(classify_portrait)
    normalise_character_name = staticmethod(normalise_character_name)

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

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_dir = Path(base_dir)
        self.config_file = self.base_dir / "data" / "scraper_config.json"
        self.static_dir = self.base_dir / "app" / "static"
        self.wikigg_driver = WikiGGScraperDriver(self.base_dir)
        self.hens_map_driver = HensMapScraperDriver()
        self.samoel_map_driver = SamoelColtMapScraperDriver()

    def load_config(self) -> ScraperConfig:
        if not self.config_file.exists():
            return ScraperConfig(source="wikigg", fallback_to_wiki=False, last_used_source="wikigg")
        try:
            with open(self.config_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return ScraperConfig.from_dict(data)
        except Exception as e:
            logger.error(f"Error loading scraper config: {e}")
            return ScraperConfig(source="wikigg", fallback_to_wiki=False, last_used_source="wikigg")

    def save_config(self, data: Union[ScraperConfig, Dict[str, Any]]) -> ScraperConfig:
        if isinstance(data, ScraperConfig):
            config_obj = data
        elif isinstance(data, dict):
            current_dict = self.load_config().to_dict()
            current_dict.update(data)
            config_obj = ScraperConfig.from_dict(current_dict)
        else:
            raise ValueError("Data must be a ScraperConfig instance or a dict")

        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(config_obj.to_dict(), f, indent=2, ensure_ascii=False)

        return config_obj

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        with cls._lock:
            return cls._status.copy()

    @classmethod
    def _update_status(cls, **kwargs) -> None:
        with cls._lock:
            cls._status.update(kwargs)

    def fetch_html(self, url: str) -> str:
        return self.wikigg_driver.fetch_html(url)

    def parse_character_page(self, html: str) -> List[CharacterData]:
        return self.wikigg_driver.parse_character_page(html)

    def scrape_characters_dynamically(self) -> List[CharacterData]:
        return self.wikigg_driver.scrape_characters_dynamically()

    def parse_perks(self, html_content: str, characters: List[CharacterData]) -> List[PerkData]:
        return self.wikigg_driver.parse_perks(html_content, characters)

    def scrape_items_and_addons(self) -> Tuple[List[ItemData], List[AddonData]]:
        try:
            html_items = self.wikigg_driver.fetch_html(self.wikigg_driver.ITEMS_URL)
            items = self.wikigg_driver.parse_wiki_items(html_items)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg items: {e}")
            items = []
        try:
            html_addons = self.wikigg_driver.fetch_html(self.wikigg_driver.ADDONS_URL)
            addons = self.wikigg_driver.parse_wiki_addons(html_addons)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg addons: {e}")
            addons = []
        return items, addons

    _PERK_FRAME_TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "scrapers" / "assets" / "perk_frame.png"
    _perk_frame_template_cache = None

    @classmethod
    def _get_perk_frame_template(cls):
        from PIL import Image

        if cls._perk_frame_template_cache is None:
            cls._perk_frame_template_cache = Image.open(cls._PERK_FRAME_TEMPLATE_PATH).convert("RGBA")
        return cls._perk_frame_template_cache

    @classmethod
    def _apply_perk_diamond_frame(cls, icon_bytes: bytes) -> bytes:
        """wiki.gg only serves the bare perk glyph, with no rarity frame baked in
        (unlike nightlight.gg's icons). Paste the glyph onto a real diamond-frame
        background lifted from a nightlight.gg icon so perks keep their familiar
        framed look regardless of rarity."""
        from PIL import Image

        template = cls._get_perk_frame_template()
        size = template.size[0]
        canvas = template.copy()

        icon = Image.open(io.BytesIO(icon_bytes)).convert("RGBA")
        icon_size = int(size * 0.62)
        icon_resized = icon.resize((icon_size, icon_size), Image.LANCZOS)
        offset = ((size - icon_size) // 2, (size - icon_size) // 2)
        canvas.alpha_composite(icon_resized, offset)

        buf = io.BytesIO()
        canvas.save(buf, format="PNG")
        return buf.getvalue()

    async def _download_asset(
        self,
        client: AsyncSession,
        semaphore: asyncio.Semaphore,
        url: str,
        relative_path: str,
        apply_perk_frame: bool = False,
    ) -> None:
        if not url:
            return

        destination = self.static_dir / relative_path
        if destination.exists():
            with self._lock:
                self._status["progress"] += 1
            return

        destination.parent.mkdir(parents=True, exist_ok=True)

        async with semaphore:
            try:
                response = await client.get(url, headers=self.HEADERS, timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                content = response.content
                if apply_perk_frame:
                    try:
                        content = self._apply_perk_diamond_frame(content)
                    except Exception as frame_err:
                        logger.warning(f"Could not frame perk icon [{url}]: {frame_err}")
                destination.write_bytes(content)
            except Exception as err:
                logger.error(f"Download failed [{url}]: {err}")
            finally:
                with self._lock:
                    self._status["progress"] += 1

    async def download_all_assets_async(
        self,
        perks: List[PerkData],
        characters: List[CharacterData],
        items: Optional[List[ItemData]] = None,
        addons: Optional[List[AddonData]] = None,
        maps: Optional[List[MapData]] = None,
    ) -> None:
        semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_DOWNLOADS)
        async with AsyncSession(impersonate=self.IMPERSONATE_BROWSER, verify=False) as client:
            tasks = [
                self._download_asset(
                    client, semaphore, perk.icon_url, perk.icon_local_path, apply_perk_frame=True
                )
                for perk in perks
            ]
            for char in characters:
                if char.avatar_url:
                    tasks.append(
                        self._download_asset(client, semaphore, char.avatar_url, char.avatar_local_path)
                    )
            if items:
                for item in items:
                    if item.icon_url:
                        tasks.append(
                            self._download_asset(client, semaphore, item.icon_url, item.icon_local_path)
                        )
            if addons:
                for addon in addons:
                    if addon.icon_url:
                        tasks.append(
                            self._download_asset(client, semaphore, addon.icon_url, addon.icon_local_path)
                        )
            if maps:
                for m in maps:
                    if m.callout_image_url and m.callout_image_local_path:
                        tasks.append(
                            self._download_asset(client, semaphore, m.callout_image_url, m.callout_image_local_path)
                        )

            await asyncio.gather(*tasks)

    def _preserve_release_numbers(self, characters: List[CharacterData]) -> None:
        db_release_map = {}
        try:
            if current_app:
                db_chars = db.session.scalars(select(Character)).all()
                for c in db_chars:
                    if c.release_number and c.release_number > 0:
                        db_release_map[normalize_name_key(c.name)] = (c.release_number, c.code_prefix)
        except Exception as e:
            logger.debug(f"Could not load release numbers from database: {e}")

        for character in characters:
            norm_name = normalize_name_key(character.name)
            if norm_name in db_release_map:
                rel_num, code_pref = db_release_map[norm_name]
                if not character.release_number or character.release_number <= 0:
                    character.release_number = rel_num
                if not character.code_prefix:
                    character.code_prefix = code_pref

            dlc = CANONICAL_DLC_INFO.get(character.name.lower().strip())
            if not dlc:
                alias_target = CHARACTER_ALIASES.get(character.name.lower().strip())
                if alias_target:
                    dlc = CANONICAL_DLC_INFO.get(alias_target.lower().strip())

            if dlc:
                if not character.release_number or character.release_number <= 0:
                    character.release_number = dlc.get("release_number", 0)
                if not character.code_prefix:
                    character.code_prefix = dlc.get("code_prefix")
                if not character.chapter_name:
                    character.chapter_name = dlc.get("chapter_name")
                if not character.chapter_number:
                    character.chapter_number = dlc.get("chapter_number")
                if not character.dlc_type:
                    character.dlc_type = dlc.get("dlc_type")
                if not character.is_licensed:
                    character.is_licensed = dlc.get("is_licensed", False)
                if not character.release_year:
                    character.release_year = dlc.get("release_year")
                if not character.release_date:
                    character.release_date = dlc.get("release_date")
                if not character.dlc_counterparts:
                    character.dlc_counterparts = dlc.get("dlc_counterparts")
                if not character.lore:
                    character.lore = dlc.get("lore")

    def run_sync_pipeline(
        self,
        override_source: Optional[str] = None,
        override_fallback: Optional[bool] = None,
    ) -> Dict[str, int]:
        if self.get_status()["is_running"]:
            logger.warning("Scrape pipeline already running.")
            return {}

        self._update_status(
            is_running=True,
            progress=0,
            total=0,
            current_step="scraping_characters",
            error=None,
            fallback_used=False,
            last_used_source="wikigg",
        )

        try:
            logger.info("Scraping deadbydaylight.wiki.gg data...")
            characters, perks, items, addons = self.wikigg_driver.scrape_all()

            self._preserve_release_numbers(characters)

            maps: List[MapData] = []
            try:
                logger.info("Scraping Hens333 maps...")
                hens_maps = self.hens_map_driver.scrape_maps()
                maps.extend(hens_maps)
            except Exception as map_err:
                logger.warning(f"Failed scraping Hens333 maps: {map_err}")

            try:
                logger.info("Scraping SamoelColt Steam Workshop maps...")
                samoel_maps = self.samoel_map_driver.scrape_maps()
                maps.extend(samoel_maps)
            except Exception as map_err:
                logger.warning(f"Failed scraping SamoelColt maps: {map_err}")

            self._update_status(current_step="seeding_database")
            db_sync_metrics = self.sync_to_database(
                characters=characters,
                perks=perks,
                items=items,
                addons=addons,
                maps=maps,
            )

            total_downloads = (
                len(perks)
                + sum(1 for c in characters if getattr(c, "avatar_url", None))
                + len(items)
                + len(addons)
                + len(maps)
            )
            self._update_status(
                current_step="downloading_assets",
                total=total_downloads,
                progress=0,
            )

            asyncio.run(
                self.download_all_assets_async(
                    perks, characters, items=items, addons=addons, maps=maps
                )
            )

            now_iso = datetime.now(timezone.utc).isoformat()
            self.save_config(
                {
                    "source": "wikigg",
                    "last_used_source": "wikigg",
                    "last_run_timestamp": now_iso,
                }
            )

            survivor_count = sum(
                1 for p in perks if getattr(p, "category", "") == "Survivor"
            )
            killer_count = sum(
                1 for p in perks if getattr(p, "category", "") == "Killer"
            )

            stats = {
                "status": "success",
                "characters_synced": len(characters),
                "perks_synced": len(perks),
                "total_perks": len(perks),
                "total_characters": len(characters),
                "survivors": survivor_count,
                "killers": killer_count,
                "total_items": len(items),
                "total_addons": len(addons),
            }
            stats.update(db_sync_metrics)

            self._update_status(
                is_running=False,
                current_step="completed",
                last_run=now_iso,
                last_used_source="wikigg",
                fallback_used=False,
            )
            return stats

        except Exception as e:
            logger.error(f"Sync pipeline failed: {e}")
            self._update_status(
                is_running=False,
                current_step="failed",
                error=str(e),
            )
            raise

    def seed_canonical_characters(self) -> None:
        seen_codes = set()
        chars: List[CharacterData] = []

        for key, dlc in CANONICAL_DLC_INFO.items():
            code = dlc.get("code_prefix")
            if not code or code in seen_codes:
                continue
            seen_codes.add(code)

            role = dlc.get("role", "Survivor")

            if role == "Killer":
                words = key.split()
                display_name = " ".join(w.capitalize() for w in words)
                if key == "the onryo":
                    display_name = "The Onryō"
            else:
                words = key.split()
                display_name = " ".join(w.capitalize() for w in words)
                if "bill" in key:
                    display_name = 'William "Bill" Overbeck'
                elif "ash" in key:
                    display_name = "Ashley J. Williams"
                elif "elodie" in key or "élodie" in key:
                    display_name = "Élodie Rakoto"
                elif "leon" in key:
                    display_name = "Leon S. Kennedy"
                elif "yun-jin" in key or "lee yun-jin" in key:
                    display_name = "Yun-Jin Lee"

            real_name = display_name
            if key in CANONICAL_KILLER_POWERS:
                targets = CANONICAL_KILLER_POWERS[key].get("targets", [])
                if len(targets) >= 3:
                    real_name = targets[-1]
                elif len(targets) >= 2:
                    real_name = targets[1]

            sanitized = sanitize_filename(display_name)
            sub_dir = "survivors" if role == "Survivor" else "killers"
            slug = display_name.replace(" ", "_")

            chars.append(
                CharacterData(
                    name=display_name,
                    real_name=real_name,
                    wiki_slug=slug,
                    short_name=key.lower(),
                    category=role,
                    avatar_url="",
                    avatar_local_path=f"avatars/{sub_dir}/{sanitized}.png",
                    release_number=dlc.get("release_number", 0),
                    code_prefix=code,
                    chapter_name=dlc.get("chapter_name"),
                    chapter_number=dlc.get("chapter_number"),
                    dlc_type=dlc.get("dlc_type"),
                    is_licensed=dlc.get("is_licensed", False),
                    release_year=dlc.get("release_year"),
                    release_date=dlc.get("release_date"),
                    dlc_counterparts=dlc.get("dlc_counterparts"),
                    lore=dlc.get("lore"),
                )
            )

        self.sync_to_database(characters=chars, perks=[], items=[], addons=[], maps=[])

    def sync_to_database(
        self,
        characters: List[Any],
        perks: List[Any],
        items: Optional[List[Any]] = None,
        addons: Optional[List[Any]] = None,
        maps: Optional[List[Any]] = None,
    ) -> Dict[str, int]:
        items = items or []
        addons = addons or []
        maps = maps or []

        existing_chars = {
            normalize_name_key(c.name): c
            for c in db.session.scalars(select(Character)).all()
        }

        if characters:
            for c in characters:
                role = getattr(c, "category", None) or getattr(c, "role", "Survivor")
                portrait = getattr(c, "avatar_url", "")
                code_prefix = getattr(c, "code_prefix", None)
                if not code_prefix and portrait:
                    m = PORTRAIT_PATTERN.search(portrait.split("/")[-1])
                    if m:
                        code_prefix = f"{m.group(1)}{m.group(2)}"

                c_name = c.name.strip()
                norm_c_name = normalize_name_key(c_name)
                dlc = CANONICAL_DLC_INFO.get(c_name.lower()) or {}

                existing_char = existing_chars.get(norm_c_name)

                if existing_char:
                    existing_char.role = role
                    if code_prefix or dlc.get("code_prefix"):
                        existing_char.code_prefix = code_prefix or dlc.get("code_prefix")
                    if portrait:
                        existing_char.portrait_url = portrait
                    if getattr(c, "real_name", None):
                        existing_char.real_name = c.real_name
                    if getattr(c, "short_name", None):
                        existing_char.short_name = c.short_name
                    if getattr(c, "wiki_slug", None):
                        existing_char.wiki_slug = c.wiki_slug
                    if getattr(c, "avatar_local_path", None):
                        existing_char.avatar_local_path = c.avatar_local_path
                    if dlc.get("release_number"):
                        existing_char.release_number = dlc.get("release_number")
                    if dlc.get("chapter_name"):
                        existing_char.chapter_name = dlc.get("chapter_name")
                    if dlc.get("chapter_number"):
                        existing_char.chapter_number = dlc.get("chapter_number")
                    if dlc.get("dlc_type"):
                        existing_char.dlc_type = dlc.get("dlc_type")
                    if "is_licensed" in dlc:
                        existing_char.is_licensed = dlc.get("is_licensed")
                    if dlc.get("release_year"):
                        existing_char.release_year = dlc.get("release_year")
                    if dlc.get("release_date"):
                        existing_char.release_date = dlc.get("release_date")
                    if dlc.get("dlc_counterparts"):
                        existing_char.dlc_counterparts = dlc.get("dlc_counterparts")
                    if dlc.get("lore"):
                        existing_char.lore = dlc.get("lore")
                else:
                    new_char = Character(
                        name=c_name,
                        role=role,
                        code_prefix=code_prefix or dlc.get("code_prefix"),
                        portrait_url=portrait or "",
                        real_name=getattr(c, "real_name", c_name) or c_name,
                        short_name=getattr(c, "short_name", "") or "",
                        wiki_slug=getattr(c, "wiki_slug", "") or "",
                        avatar_local_path=getattr(c, "avatar_local_path", "") or "",
                        release_number=getattr(c, "release_number", None) or dlc.get("release_number"),
                        chapter_name=getattr(c, "chapter_name", None) or dlc.get("chapter_name"),
                        chapter_number=getattr(c, "chapter_number", None) or dlc.get("chapter_number"),
                        dlc_type=getattr(c, "dlc_type", None) or dlc.get("dlc_type"),
                        is_licensed=getattr(c, "is_licensed", False) or dlc.get("is_licensed", False),
                        release_year=getattr(c, "release_year", None) or dlc.get("release_year"),
                        release_date=getattr(c, "release_date", None) or dlc.get("release_date"),
                        dlc_counterparts=getattr(c, "dlc_counterparts", None) or dlc.get("dlc_counterparts"),
                        lore=getattr(c, "lore", None) or dlc.get("lore"),
                    )
                    db.session.add(new_char)
                    existing_chars[norm_c_name] = new_char
            db.session.commit()

        char_lookup = {}
        for c in existing_chars.values():
            char_lookup[normalize_name_key(c.name)] = c.id
            if c.real_name:
                char_lookup[normalize_name_key(c.real_name)] = c.id
            if c.wiki_slug:
                char_lookup[normalize_name_key(c.wiki_slug)] = c.id
            if c.short_name:
                char_lookup[normalize_name_key(c.short_name)] = c.id

        if perks:
            existing_perks = {
                normalize_name_key(p.name): p
                for p in db.session.scalars(select(Perk)).all()
            }
            for p in perks:
                char_name = getattr(p, "character", None) or ""
                norm_char = normalize_name_key(char_name)

                matched_char_id = None
                if norm_char and norm_char not in ["none", "all", "general", ""]:
                    alias_target = CHARACTER_ALIASES.get(char_name.lower())
                    if alias_target:
                        matched_char_id = char_lookup.get(normalize_name_key(alias_target))
                    if not matched_char_id:
                        matched_char_id = char_lookup.get(norm_char)

                is_teachable = matched_char_id is not None
                desc = clean_description_text(getattr(p, "description", ""))
                p_name = p.name.strip()
                norm_p_name = normalize_name_key(p_name)

                existing_perk = existing_perks.get(norm_p_name)

                if existing_perk:
                    existing_perk.category = getattr(p, "category", "Survivor")
                    existing_perk.is_teachable = is_teachable
                    if desc and "unavailable" not in desc.lower():
                        existing_perk.description = desc
                    if getattr(p, "icon_url", None):
                        existing_perk.icon_url = p.icon_url
                    if getattr(p, "icon_local_path", None):
                        existing_perk.icon_local_path = p.icon_local_path
                    if matched_char_id is not None:
                        existing_perk.character_id = matched_char_id
                else:
                    new_perk = Perk(
                        name=p_name,
                        category=getattr(p, "category", "Survivor"),
                        is_teachable=is_teachable,
                        description=desc,
                        icon_url=getattr(p, "icon_url", "") or "",
                        icon_local_path=getattr(p, "icon_local_path", "") or "",
                        character_id=matched_char_id,
                    )
                    db.session.add(new_perk)
                    existing_perks[norm_p_name] = new_perk
            db.session.commit()

        if items:
            existing_items = {
                normalize_name_key(i.name): i
                for i in db.session.scalars(select(Item)).all()
            }
            for item in items:
                i_name = item.name.strip()
                norm_i_name = normalize_name_key(i_name)
                existing_item = existing_items.get(norm_i_name)

                desc = clean_description_text(getattr(item, "description", ""))
                if existing_item:
                    existing_item.category = getattr(item, "category", "")
                    existing_item.role = getattr(item, "role", "Survivor")
                    if desc:
                        existing_item.description = desc
                    if getattr(item, "icon_url", None):
                        existing_item.icon_url = item.icon_url
                    if getattr(item, "icon_local_path", None):
                        existing_item.icon_local_path = item.icon_local_path
                    if getattr(item, "rarity", None):
                        existing_item.rarity = item.rarity
                else:
                    new_item = Item(
                        name=i_name,
                        category=getattr(item, "category", ""),
                        role=getattr(item, "role", "Survivor"),
                        description=desc,
                        icon_url=getattr(item, "icon_url", "") or "",
                        icon_local_path=getattr(item, "icon_local_path", "") or "",
                        rarity=getattr(item, "rarity", "") or "",
                    )
                    db.session.add(new_item)
                    existing_items[norm_i_name] = new_item
            db.session.commit()

        if addons:
            existing_addons = {
                normalize_name_key(a.name): a
                for a in db.session.scalars(select(Addon)).all()
            }
            for addon in addons:
                a_name = addon.name.strip()
                norm_a_name = normalize_name_key(a_name)
                existing_addon = existing_addons.get(norm_a_name)

                desc = clean_description_text(getattr(addon, "description", ""))
                if existing_addon:
                    existing_addon.associated_target = (
                        getattr(addon, "associated_target", "") or ""
                    )
                    existing_addon.category = getattr(addon, "category", "")
                    if desc:
                        existing_addon.description = desc
                    if getattr(addon, "icon_url", None):
                        existing_addon.icon_url = addon.icon_url
                    if getattr(addon, "icon_local_path", None):
                        existing_addon.icon_local_path = addon.icon_local_path
                    if getattr(addon, "rarity", None):
                        existing_addon.rarity = addon.rarity
                else:
                    new_addon = Addon(
                        name=a_name,
                        associated_target=getattr(addon, "associated_target", "") or "",
                        category=getattr(addon, "category", ""),
                        description=desc,
                        icon_url=getattr(addon, "icon_url", "") or "",
                        icon_local_path=getattr(addon, "icon_local_path", "") or "",
                        rarity=getattr(addon, "rarity", "") or "",
                    )
                    db.session.add(new_addon)
                    existing_addons[norm_a_name] = new_addon
            db.session.commit()

        return {
            "characters_synced": len(characters),
            "perks_synced": len(perks),
            "items_synced": len(items),
            "addons_synced": len(addons),
        }