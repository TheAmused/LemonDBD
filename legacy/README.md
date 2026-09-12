# Legacy Scrapers & Retired Pipelines Archive
 
This directory archives the retired Wiki.gg and NightLight live web scrapers, along with their associated services, pipeline drivers, scripts, and test suites.

## Why was this code retired?
1. **Zero External Scraping**: The LemonDBD application now relies exclusively on clean, modular, and verified offline static JSON datasets (backend/app/seeds/data/) as its single source of truth.
2. **Speed & Determinism**: Static database seeding and merge-upsert patching boot in milliseconds without external HTTP rate limiting, Cloudflare CAPTCHAs, or wiki DOM changes breaking database ingestion.
3. **Ghost Record Prevention**: Live wiki scrapers and fuzzy name matchers caused orphan/ghost gameplay entities with missing icons or conflicting metadata.

## Contents
- **frontend/**: Original admin panel Wiki sync button and client-side trigger logic (`AdminScraperSyncButton.tsx`).
- **scrapers/**: Original wiki.gg scraper modules (wikigg.py, wikigg_*.py), driver mixins, and Hens map/roster asset scrapers.
- **services/**: Original scraper orchestration service (scraper_service.py), sync pipeline (pipeline.py), asset downloader (assets.py), and scraper state managers.
- **scripts/**: One-off scraper execution scripts (run_scrapper.py, rescrape_chapter_banners.py).
- **tests/**: Scraper-specific unit tests verifying historical DOM parsing rules.

## Current Architecture
- **Canonical Seed Data**: backend/app/seeds/data/
- **Dynamic Updates Drop Folder**: backend/app/seeds/updates/ (and data/updates/)
- **Seeder & Patch Engine**: backend/app/seeds/static_db_seeder.py
- **Production CLI Updater**: backend/scripts/import_database_updates.py
