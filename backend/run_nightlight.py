import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.scraper_service import ScraperService

app = create_app()

with app.app_context():
    scraper = ScraperService()
    print("Starting deadbydaylight.wiki.gg scraper...")
    stats = scraper.run_sync_pipeline()
    print("Scraping finished successfully!")
    print(stats)