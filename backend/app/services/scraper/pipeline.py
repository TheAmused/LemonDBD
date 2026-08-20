# backend/app/services/scraper/pipeline.py
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

        chars_file = Path(__file__).resolve().parent.parent.parent.parent / "data" / "characters.json"
        if chars_file.exists():
            logger.info("Initializing character table from local seed data/characters.json...")
            from app.services.perk_service import PerkService
            perk_service = PerkService()
            perk_service.reload_data()
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

            try:
                static_dir.mkdir(parents=True, exist_ok=True)
                (static_dir / "icons").mkdir(parents=True, exist_ok=True)
            except Exception as static_prep_err:
                logger.warning(f"Could not prepare static icons directory {static_dir}: {static_prep_err}")

            try:
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
            except Exception as asset_err:
                logger.warning(f"Asset downloading encountered an issue: {asset_err}")

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

