# legacy/scripts/rescrape_chapter_banners.py
# backend/scripts/rescrape_chapter_banners.py
"""One-off backfill: re-scrape chapter banner images, now preferring the
homepage's illustrated "Chapter DLC" capsule art over the small text-logo
used previously. Only touches the chapters table -- does not run the full
scraper pipeline."""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.scrapers.wikigg import WikiGGScraperDriver
from app.services.db.asset_bundling import get_static_dir
from app.services.scraper.assets import download_all_assets
from app.services.scraper.db_sync import sync_chapters_to_db

app = create_app()

with app.app_context():
    driver = WikiGGScraperDriver()
    print("Scraping chapter capsule images from wiki.gg's homepage...")
    chapters = driver.scrape_chapter_images()
    print(f"Found {len(chapters)} chapters.")

    # download_single_asset silently skips any URL whose destination file
    # already exists (a deliberate optimization for the routine pipeline, so
    # it doesn't re-download unchanged assets on every re-scrape) -- but this
    # is a one-off *replace* run, and every chapter's file already exists
    # from the app's normal startup scraping, so without deleting them first
    # every single "download" here would silently no-op and leave the old
    # image bytes in place while the DB row points at a URL that was never
    # actually fetched.
    static_dir = get_static_dir()
    for ch in chapters:
        if not ch.banner_local_path:
            continue
        # Files are always actually written as .webp regardless of the
        # extension scrape_chapter_images asked for (matches
        # download_all_assets's own _to_webp_path correction below).
        webp_path = Path(ch.banner_local_path).with_suffix(".webp")
        existing = static_dir / webp_path
        if existing.exists():
            existing.unlink()

    # download_all_assets always writes the file as .webp and corrects
    # ch.banner_local_path's extension to match in place -- it must run
    # before sync_chapters_to_db, or the DB ends up with the pre-correction
    # (wrong) extension pointing at a file that was never written.
    asyncio.run(
        download_all_assets(
            static_dir=get_static_dir(),
            perks=[],
            characters=[],
            chapters=chapters,
        )
    )
    print("Downloaded chapter banner image files.")

    sync_chapters_to_db(chapters)
    print("Synced chapter banner_url/banner_local_path to the database.")
