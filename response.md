#### 1. `backend/app/services/scraper/state.py`

```python
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

```

#### 2. `backend/app/services/scraper/assets.py`

```python
import asyncio
import io
import logging
from pathlib import Path
from typing import List, Optional

from curl_cffi.requests import AsyncSession
from PIL import Image

from app.scrapers.types import AddonData, CharacterData, ItemData, MapData, PerkData
from app.scrapers.utils import sanitize_filename
from app.services.scraper.state import ScraperStateManager

logger = logging.getLogger(__name__)

PERK_FRAME_TEMPLATE_PATH = Path(__file__).resolve().parent.parent.parent / "scrapers" / "assets" / "perk_frame.png"
_perk_frame_template_cache: Optional[Image.Image] = None


def get_perk_frame_template() -> Optional[Image.Image]:
    """Retrieve and cache the PNG diamond frame template for perks."""
    global _perk_frame_template_cache
    if _perk_frame_template_cache is None and PERK_FRAME_TEMPLATE_PATH.exists():
        _perk_frame_template_cache = Image.open(PERK_FRAME_TEMPLATE_PATH).convert("RGBA")
    return _perk_frame_template_cache


def apply_perk_diamond_frame(icon_bytes: bytes) -> bytes:
    """Composites perk icon onto the canonical diamond framing template."""
    template = get_perk_frame_template()
    if template is None:
        return icon_bytes

    size = template.size[0]
    canvas = template.copy()

    icon = Image.open(io.BytesIO(icon_bytes)).convert("RGBA")
    icon_size = int(size * 0.85)
    icon_resized = icon.resize((icon_size, icon_size), Image.LANCZOS)
    offset = ((size - icon_size) // 2, (size - icon_size) // 2)
    canvas.alpha_composite(icon_resized, offset)

    buf = io.BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


async def download_single_asset(
    client: AsyncSession,
    semaphore: asyncio.Semaphore,
    static_dir: Path,
    url: str,
    relative_path: str,
    timeout: int = 30,
    apply_perk_frame: bool = False,
) -> None:
    """Asynchronously download and persist an individual asset file."""
    if not url:
        return

    destination = static_dir / relative_path
    if destination.exists():
        ScraperStateManager.increment_progress()
        return

    destination.parent.mkdir(parents=True, exist_ok=True)

    async with semaphore:
        try:
            response = await client.get(url, timeout=timeout)
            response.raise_for_status()
            content = response.content
            if apply_perk_frame:
                try:
                    content = apply_perk_diamond_frame(content)
                except Exception as frame_err:
                    logger.warning(f"Could not frame perk icon [{url}]: {frame_err}")
            destination.write_bytes(content)
        except Exception as err:
            logger.error(f"Download failed [{url}]: {err}")
        finally:
            ScraperStateManager.increment_progress()


async def download_all_assets(
    static_dir: Path,
    perks: List[PerkData],
    characters: List[CharacterData],
    items: Optional[List[ItemData]] = None,
    addons: Optional[List[AddonData]] = None,
    maps: Optional[List[MapData]] = None,
    impersonate_browser: str = "chrome120",
    max_concurrent_downloads: int = 10,
    request_timeout: int = 30,
) -> None:
    """Batch concurrent asset downloader for characters, powers, perks, items, addons, and maps."""
    semaphore = asyncio.Semaphore(max_concurrent_downloads)
    async with AsyncSession(impersonate=impersonate_browser, verify=False) as client:
        tasks = [
            download_single_asset(
                client,
                semaphore,
                static_dir,
                perk.icon_url,
                perk.icon_local_path,
                timeout=request_timeout,
                apply_perk_frame=True,
            )
            for perk in perks
        ]
        for char in characters:
            if char.avatar_url:
                tasks.append(
                    download_single_asset(
                        client,
                        semaphore,
                        static_dir,
                        char.avatar_url,
                        char.avatar_local_path,
                        timeout=request_timeout,
                    )
                )
            if char.power and char.power.icon_url:
                p_slug = sanitize_filename(char.power.name)
                p_path = f"icons/powers/{p_slug}.png"
                char.power.icon_local_path = p_path
                tasks.append(
                    download_single_asset(
                        client,
                        semaphore,
                        static_dir,
                        char.power.icon_url,
                        p_path,
                        timeout=request_timeout,
                    )
                )
        if items:
            for item in items:
                if item.icon_url:
                    tasks.append(
                        download_single_asset(
                            client,
                            semaphore,
                            static_dir,
                            item.icon_url,
                            item.icon_local_path,
                            timeout=request_timeout,
                        )
                    )
        if addons:
            for addon in addons:
                if addon.icon_url:
                    tasks.append(
                        download_single_asset(
                            client,
                            semaphore,
                            static_dir,
                            addon.icon_url,
                            addon.icon_local_path,
                            timeout=request_timeout,
                        )
                    )
        if maps:
            for m in maps:
                if m.callout_image_url and m.callout_image_local_path:
                    tasks.append(
                        download_single_asset(
                            client,
                            semaphore,
                            static_dir,
                            m.callout_image_url,
                            m.callout_image_local_path,
                            timeout=request_timeout,
                        )
                    )

        await asyncio.gather(*tasks)

```

#### 3. `backend/app/services/scraper/db_sync.py`

```python
import json
import logging
from typing import Dict, List, Optional
from sqlalchemy import select

from app.core.extensions import db
from app.models import Addon, Character, Item, MapRealm, MapTile, Perk
from app.scrapers.types import AddonData, CharacterData, ItemData, MapData, PerkData
from app.scrapers.utils import clean_description_text, normalize_name_key, sanitize_filename

logger = logging.getLogger(__name__)


def sync_characters_to_db(characters: List[CharacterData]) -> Dict[str, Character]:
    """Upsert canonical characters and return lookup dictionary."""
    existing_chars = {
        normalize_name_key(c.name): c
        for c in db.session.scalars(select(Character)).all()
    }

    if not characters:
        return existing_chars

    for c in characters:
        role = getattr(c, "category", "Survivor")
        c_name = c.name.strip()
        norm_c_name = normalize_name_key(c_name)

        existing_char = existing_chars.get(norm_c_name)
        p_name = c.power.name if c.power else None
        p_desc = c.power.description if c.power else None
        p_icon = c.power.icon_url if c.power else None
        p_speed = c.power.movement_speed if c.power else None
        p_tr = c.power.terror_radius if c.power else None
        p_trm = c.power.terror_radius_meters if c.power else None
        p_height = c.power.height if c.power else None

        cp_raw = getattr(c, "dlc_counterparts", None)
        cp_str = json.dumps(cp_raw) if isinstance(cp_raw, list) else cp_raw

        if existing_char:
            existing_char.role = role
            existing_char.code_prefix = c.code_prefix
            existing_char.portrait_url = c.avatar_url
            existing_char.real_name = c.real_name or c_name
            existing_char.short_name = c.short_name or ""
            existing_char.wiki_slug = c.wiki_slug or ""
            existing_char.avatar_local_path = c.avatar_local_path or ""
            existing_char.release_number = c.release_number
            if getattr(c, "chapter_name", None):
                existing_char.chapter_name = c.chapter_name
            if getattr(c, "chapter_number", None):
                existing_char.chapter_number = c.chapter_number
            if getattr(c, "dlc_type", None):
                existing_char.dlc_type = c.dlc_type
            if getattr(c, "is_licensed", None) is not None:
                existing_char.is_licensed = c.is_licensed
            if getattr(c, "release_year", None):
                existing_char.release_year = c.release_year
            if getattr(c, "release_date", None):
                existing_char.release_date = c.release_date
            if cp_str is not None:
                existing_char.dlc_counterparts = cp_str
            if getattr(c, "lore", None):
                existing_char.lore = c.lore
            if c.power:
                existing_char.power_name = p_name
                existing_char.power_description = p_desc
                existing_char.power_icon_url = p_icon
                existing_char.movement_speed = p_speed
                existing_char.terror_radius = p_tr
                existing_char.terror_radius_meters = p_trm
                existing_char.height = p_height
        else:
            new_char = Character(
                name=c_name,
                role=role,
                code_prefix=c.code_prefix,
                portrait_url=c.avatar_url or "",
                real_name=c.real_name or c_name,
                short_name=c.short_name or "",
                wiki_slug=c.wiki_slug or "",
                avatar_local_path=c.avatar_local_path or "",
                release_number=c.release_number,
                chapter_name=getattr(c, "chapter_name", None),
                chapter_number=getattr(c, "chapter_number", None),
                dlc_type=getattr(c, "dlc_type", None),
                is_licensed=getattr(c, "is_licensed", False),
                release_year=getattr(c, "release_year", None),
                release_date=getattr(c, "release_date", None),
                dlc_counterparts=cp_str,
                lore=getattr(c, "lore", None),
                power_name=p_name,
                power_description=p_desc,
                power_icon_url=p_icon,
                movement_speed=p_speed,
                terror_radius=p_tr,
                terror_radius_meters=p_trm,
                height=p_height,
            )
            db.session.add(new_char)
            existing_chars[norm_c_name] = new_char

    db.session.commit()
    return existing_chars


def sync_perks_to_db(perks: List[PerkData], char_lookup: Dict[str, int]) -> None:
    """Upsert perks with automatic teachable character association."""
    if not perks:
        return

    existing_perks = {
        normalize_name_key(p.name): p
        for p in db.session.scalars(select(Perk)).all()
    }

    for p in perks:
        char_name = getattr(p, "character", None) or ""
        norm_char = normalize_name_key(char_name)

        matched_char_id = None
        if norm_char and norm_char not in ["none", "all", "general", ""]:
            matched_char_id = char_lookup.get(norm_char)

        is_teachable = matched_char_id is not None
        desc = clean_description_text(getattr(p, "description", ""))
        p_name = p.name.strip()
        norm_p_name = normalize_name_key(p_name)

        existing_perk = existing_perks.get(norm_p_name)

        if existing_perk:
            existing_perk.category = getattr(p, "category", "Survivor")
            existing_perk.is_teachable = is_teachable
            existing_perk.description = desc
            existing_perk.icon_url = p.icon_url or ""
            existing_perk.icon_local_path = p.icon_local_path or ""
            existing_perk.alternate_name = getattr(p, "alternate_name", None)
            existing_perk.is_generic_counterpart = getattr(p, "is_generic_counterpart", False)
            existing_perk.character_id = matched_char_id
        else:
            new_perk = Perk(
                name=p_name,
                alternate_name=getattr(p, "alternate_name", None),
                is_generic_counterpart=getattr(p, "is_generic_counterpart", False),
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


def sync_items_to_db(items: List[ItemData]) -> None:
    """Upsert survivor items and tools."""
    if not items:
        return

    existing_items = {
        normalize_name_key(i.name): i
        for i in db.session.scalars(select(Item)).all()
    }
    for item in items:
        i_name = item.name.strip()
        norm_i_name = normalize_name_key(i_name)
        desc = clean_description_text(getattr(item, "description", ""))
        existing_item = existing_items.get(norm_i_name)

        if existing_item:
            existing_item.category = getattr(item, "category", "")
            existing_item.role = getattr(item, "role", "Survivor")
            existing_item.description = desc
            existing_item.icon_url = item.icon_url or ""
            existing_item.icon_local_path = item.icon_local_path or ""
            existing_item.rarity = getattr(item, "rarity", "") or ""
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


def sync_addons_to_db(addons: List[AddonData]) -> None:
    """Upsert killer power addons and item addons."""
    if not addons:
        return

    existing_addons = {
        normalize_name_key(a.name): a
        for a in db.session.scalars(select(Addon)).all()
    }
    for addon in addons:
        a_name = addon.name.strip()
        norm_a_name = normalize_name_key(a_name)
        desc = clean_description_text(getattr(addon, "description", ""))
        existing_addon = existing_addons.get(norm_a_name)

        if existing_addon:
            existing_addon.associated_target = getattr(addon, "associated_target", "") or ""
            existing_addon.category = getattr(addon, "category", "")
            existing_addon.description = desc
            existing_addon.icon_url = addon.icon_url or ""
            existing_addon.icon_local_path = addon.icon_local_path or ""
            existing_addon.rarity = getattr(addon, "rarity", "") or ""
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


def sync_maps_to_db(maps: List[MapData]) -> None:
    """Upsert map realms and clock landmark tiles."""
    if not maps:
        return

    existing_maps = {
        m.map_id: m for m in db.session.scalars(select(MapRealm)).all()
    }
    for m in maps:
        m_id = getattr(m, "id", None) or f"map_{sanitize_filename(m.name)}"
        desc = ""
        if getattr(m, "clock_system", None) and isinstance(m.clock_system, dict):
            desc = m.clock_system.get("description", "")
        if not desc:
            desc = f"12-Clock callout map layout for {m.name} ({m.realm})."

        existing_map = existing_maps.get(m_id)
        if existing_map:
            existing_map.name = m.name
            existing_map.realm = m.realm
            existing_map.realm_id = m.realm_id or sanitize_filename(m.realm)
            existing_map.source = getattr(m, "source", "hens333")
            existing_map.source_label = getattr(m, "source_label", "Hens333 12-Clock Callouts")
            existing_map.callout_image_url = m.callout_image_url or ""
            existing_map.callout_image_local_path = m.callout_image_local_path or ""
            existing_map.image_url = m.callout_image_url or ""
            existing_map.description = desc
        else:
            new_map = MapRealm(
                map_id=m_id,
                name=m.name,
                realm=m.realm,
                realm_id=m.realm_id or sanitize_filename(m.realm),
                source=getattr(m, "source", "hens333"),
                source_label=getattr(m, "source_label", "Hens333 12-Clock Callouts"),
                callout_image_url=m.callout_image_url or "",
                callout_image_local_path=m.callout_image_local_path or "",
                image_url=m.callout_image_url or "",
                layout_type="Standard",
                jungle_gyms_count=4,
                totem_spawns_count=5,
                pallet_density="Medium",
                shack_has_basement=True,
                description=desc,
            )
            db.session.add(new_map)
            existing_maps[m_id] = new_map

        clock_sys = getattr(m, "clock_system", None)
        if clock_sys and isinstance(clock_sys, dict):
            existing_tiles = db.session.scalars(
                select(MapTile).where(MapTile.map_id == m_id)
            ).all()
            if not existing_tiles:
                landmark_positions = [
                    ("twelve_o_clock", "12 O'Clock: " + str(clock_sys.get("twelve_o_clock", "Main Building / North Exit Gate")), 0.5, 0.1),
                    ("three_o_clock", "3 O'Clock: " + str(clock_sys.get("three_o_clock", "East Gym / Outer Loop")), 0.9, 0.5),
                    ("six_o_clock", "6 O'Clock: " + str(clock_sys.get("six_o_clock", "Killer Shack / South Exit Gate")), 0.5, 0.9),
                    ("nine_o_clock", "9 O'Clock: " + str(clock_sys.get("nine_o_clock", "West Gym / L-T Wall")), 0.1, 0.5),
                    ("center", "Center: " + str(clock_sys.get("center", "Central Landmark")), 0.5, 0.5),
                ]
                for key, tile_name, tx, ty in landmark_positions:
                    db.session.add(
                        MapTile(
                            map_id=m_id,
                            name=tile_name,
                            type="landmark",
                            x=tx,
                            y=ty,
                            seed_variant="seed_a",
                            floor=1,
                            has_pallet=("shack" in tile_name.lower() or "gym" in tile_name.lower()),
                            has_window=("shack" in tile_name.lower() or "gym" in tile_name.lower() or "main" in tile_name.lower()),
                        )
                    )

    db.session.commit()


def sync_all_to_database(
    characters: List[CharacterData],
    perks: List[PerkData],
    items: Optional[List[ItemData]] = None,
    addons: Optional[List[AddonData]] = None,
    maps: Optional[List[MapData]] = None,
) -> Dict[str, int]:
    """Execute complete database synchronization pipeline across all DBD entity domains."""
    items = items or []
    addons = addons or []
    maps = maps or []

    existing_chars = sync_characters_to_db(characters)

    char_lookup: Dict[str, int] = {}
    for c in existing_chars.values():
        char_lookup[normalize_name_key(c.name)] = c.id
        if c.real_name:
            char_lookup[normalize_name_key(c.real_name)] = c.id
        if c.wiki_slug:
            char_lookup[normalize_name_key(c.wiki_slug)] = c.id

    sync_perks_to_db(perks, char_lookup)
    sync_items_to_db(items)
    sync_addons_to_db(addons)
    sync_maps_to_db(maps)

    return {
        "characters_synced": len(characters),
        "perks_synced": len(perks),
        "items_synced": len(items),
        "addons_synced": len(addons),
        "maps_synced": len(maps),
    }

```

#### 4. `backend/app/services/scraper/pipeline.py`

```python
import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy import select

from app.core.extensions import db
from app.models import Character
from app.scrapers.maps import HensMapScraperDriver, SamoelColtMapScraperDriver
from app.scrapers.types import MapData
from app.scrapers.wikigg import WikiGGScraperDriver
from app.services.scraper.assets import download_all_assets
from app.services.scraper.db_sync import sync_all_to_database
from app.services.scraper.state import ScraperStateManager

logger = logging.getLogger(__name__)


def seed_canonical_characters_initial(wikigg_driver: WikiGGScraperDriver) -> None:
    """Startup check that seeds initial character data if characters table is empty."""
    try:
        existing = db.session.scalars(select(Character)).first()
        if existing:
            return
        logger.info("Initializing character table from wiki.gg...")
        chars = wikigg_driver.scrape_characters_dynamically()
        sync_all_to_database(characters=chars, perks=[], items=[], addons=[], maps=[])
    except Exception as e:
        logger.warning(f"Could not auto-seed characters on startup: {e}")


def execute_sync_pipeline(
    base_dir: Path,
    static_dir: Path,
    data_dir: Path,
    config_file: Path,
    wikigg_driver: WikiGGScraperDriver,
    hens_map_driver: HensMapScraperDriver,
    samoel_map_driver: SamoelColtMapScraperDriver,
    override_source: Optional[str] = None,
    override_fallback: Optional[bool] = None,
    download_assets: bool = True,
    impersonate_browser: str = "chrome120",
    max_concurrent_downloads: int = 10,
    request_timeout: int = 30,
) -> Dict[str, Any]:
    """Runs data extraction, database persistence, JSON caching, and asset fetching."""
    if ScraperStateManager.get_status()["is_running"]:
        logger.warning("Scrape pipeline already running.")
        return {}

    ScraperStateManager.update_status(
        is_running=True,
        progress=0,
        total=0,
        current_step="scraping_characters",
        error=None,
        fallback_used=False,
        last_used_source="wikigg",
    )

    try:
        logger.info("Scraping deadbydaylight.wiki.gg dynamic data via API...")
        characters, perks, items, addons = wikigg_driver.scrape_all()

        maps: List[MapData] = []
        try:
            logger.info("Scraping Hens333 maps...")
            maps.extend(hens_map_driver.scrape_maps())
        except Exception as map_err:
            logger.warning(f"Failed scraping Hens333 maps: {map_err}")

        try:
            logger.info("Scraping SamoelColt Steam Workshop maps...")
            maps.extend(samoel_map_driver.scrape_maps())
        except Exception as map_err:
            logger.warning(f"Failed scraping SamoelColt maps: {map_err}")

        ScraperStateManager.update_status(current_step="seeding_database")
        db_sync_metrics = sync_all_to_database(
            characters=characters,
            perks=perks,
            items=items,
            addons=addons,
            maps=maps,
        )

        try:
            data_dir.mkdir(parents=True, exist_ok=True)
            if maps:
                maps_export = [
                    {
                        "id": m.id,
                        "name": m.name,
                        "realm": m.realm,
                        "realm_id": m.realm_id,
                        "source": m.source,
                        "source_label": m.source_label,
                        "callout_image_url": m.callout_image_url,
                        "callout_image_local_path": m.callout_image_local_path,
                        "image_url": m.callout_image_url,
                        "clock_system": m.clock_system,
                        "description": m.clock_system.get("description", "") if m.clock_system else "",
                    }
                    for m in maps
                ]
                with open(data_dir / "maps.json", "w", encoding="utf-8") as f:
                    json.dump(maps_export, f, indent=2, ensure_ascii=False)
        except Exception as export_err:
            logger.warning(f"Could not update maps.json cache: {export_err}")

        if download_assets:
            total_downloads = (
                len(perks)
                + sum(1 for c in characters if getattr(c, "avatar_url", None))
                + len(items)
                + len(addons)
                + len(maps)
            )
            ScraperStateManager.update_status(
                current_step="downloading_assets",
                total=total_downloads,
                progress=0,
            )

            asyncio.run(
                download_all_assets(
                    static_dir,
                    perks,
                    characters,
                    items=items,
                    addons=addons,
                    maps=maps,
                    impersonate_browser=impersonate_browser,
                    max_concurrent_downloads=max_concurrent_downloads,
                    request_timeout=request_timeout,
                )
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        ScraperStateManager.save_config(
            config_file,
            {
                "source": "wikigg",
                "last_used_source": "wikigg",
                "last_run_timestamp": now_iso,
            },
        )

        survivor_count = sum(1 for p in perks if getattr(p, "category", "") == "Survivor")
        killer_count = sum(1 for p in perks if getattr(p, "category", "") == "Killer")

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
            "total_maps": len(maps),
        }
        stats.update(db_sync_metrics)

        ScraperStateManager.update_status(
            is_running=False,
            current_step="completed",
            last_run=now_iso,
            last_used_source="wikigg",
            fallback_used=False,
        )
        return stats

    except Exception as e:
        logger.error(f"Sync pipeline failed: {e}")
        ScraperStateManager.update_status(
            is_running=False,
            current_step="failed",
            error=str(e),
        )
        raise

```

#### 5. `backend/app/services/scraper/__init__.py`

```python
from app.services.scraper.assets import (
    PERK_FRAME_TEMPLATE_PATH,
    apply_perk_diamond_frame,
    download_all_assets,
    download_single_asset,
    get_perk_frame_template,
)
from app.services.scraper.db_sync import (
    sync_addons_to_db,
    sync_all_to_database,
    sync_characters_to_db,
    sync_items_to_db,
    sync_maps_to_db,
    sync_perks_to_db,
)
from app.services.scraper.pipeline import (
    execute_sync_pipeline,
    seed_canonical_characters_initial,
)
from app.services.scraper.state import ScraperStateManager

__all__ = [
    "ScraperStateManager",
    "PERK_FRAME_TEMPLATE_PATH",
    "get_perk_frame_template",
    "apply_perk_diamond_frame",
    "download_single_asset",
    "download_all_assets",
    "sync_characters_to_db",
    "sync_perks_to_db",
    "sync_items_to_db",
    "sync_addons_to_db",
    "sync_maps_to_db",
    "sync_all_to_database",
    "seed_canonical_characters_initial",
    "execute_sync_pipeline",
]

```

#### 6. `backend/app/services/scraper_service.py`

```python
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

```