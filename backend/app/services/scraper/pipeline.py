# backend/app/services/scraper/pipeline.py
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
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
    """Startup check that seeds initial game data directly into PostgreSQL if characters table is empty."""
    try:
        existing = db.session.scalars(select(Character)).first()
        if existing:
            return

        logger.info("Initializing full PostgreSQL database and downloading assets from wiki.gg...")
        from app.services.scraper_service import ScraperService
        scraper = ScraperService()
        scraper.run_sync_pipeline(download_assets=True)
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
    override_source: str | None = None,
    override_fallback: bool | None = None,
    download_assets: bool = True,
    impersonate_browser: str = "chrome120",
    max_concurrent_downloads: int = 10,
    request_timeout: int = 30,
) -> dict[str, Any]:
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
        characters, perks, items, addons, offerings = wikigg_driver.scrape_all()

        maps: list[MapData] = []
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
            offerings=offerings,
        )

        if download_assets:
            total_downloads = (
                len(perks)
                + sum(1 for c in characters if getattr(c, "avatar_url", None))
                + len(items)
                + len(addons)
                + len(maps)
                + len(offerings)
            )
            ScraperStateManager.update_status(
                current_step="downloading_assets",
                total=total_downloads,
                progress=0,
            )

            try:
                static_dir.mkdir(parents=True, exist_ok=True)
                (static_dir / "icons").mkdir(parents=True, exist_ok=True)
                (static_dir / "icons" / "offerings").mkdir(parents=True, exist_ok=True)
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
                        offerings=offerings,
                        impersonate_browser=impersonate_browser,
                        max_concurrent_downloads=max_concurrent_downloads,
                        request_timeout=request_timeout,
                    )
                )
            except Exception as asset_err:
                logger.warning(f"Asset downloading encountered an issue: {asset_err}")

        try:
            logger.info("Auto-syncing translations across EN, PL, DE, ES, JA...")
            from app.services.translations import TranslationService
            trans_service = TranslationService()
            trans_service.sync_all_locales_to_db(locales=["en", "pl", "de", "es", "ja"])
        except Exception as trans_pipeline_err:
            logger.warning(f"Could not auto-sync translations in scraper pipeline: {trans_pipeline_err}")

        try:
            logger.info("Auto-seeding Smash or Pass rosters, rich entities, and stats...")
            from app.seeds.smash_roster_seeder import seed_smash_rosters
            seed_smash_rosters()
        except Exception as smash_seed_err:
            logger.warning(f"Could not auto-seed Smash or Pass in scraper pipeline: {smash_seed_err}")

        try:
            from app.scrapers.roster_images import RosterImageScraperDriver
            roster_driver = RosterImageScraperDriver(timeout=request_timeout)
            for ed in ["hooked_on_you", "legendary_cosplay"]:
                roster_driver.sync_edition_assets(ed, static_dir)
        except Exception as ed_asset_err:
            logger.warning(f"Could not sync custom edition assets: {ed_asset_err}")

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
            "total_offerings": len(offerings),
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
