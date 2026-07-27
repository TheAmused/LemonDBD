import sys
from app import create_app
from app.services.scraper_service import ScraperService

app = create_app()

if __name__ == "__main__":
    if "--scrape" in sys.argv:
        print("Starting manual perk scrape task...")
        scraper = ScraperService()
        stats = scraper.run_sync_pipeline()
        print(f"Done! Synced {stats['total']} total perks.")
    else:
        app.run(host="0.0.0.0", port=5000, debug=True)