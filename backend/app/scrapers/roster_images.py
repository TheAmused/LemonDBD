# backend/app/scrapers/roster_images.py
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import unquote, urljoin

from curl_cffi import requests
from bs4 import BeautifulSoup

from app.scrapers.utils import extract_high_res_url, sanitize_filename

logger = logging.getLogger(__name__)

WIKI_BASE_URL = "https://deadbydaylight.wiki.gg"

# Known custom roster categories and their official wiki galleries
ROSTER_GALLERY_URLS = {
    "hooked_on_you": "https://deadbydaylight.wiki.gg/wiki/Hooked_on_You_Collection",
    "legendary_cosplay": "https://deadbydaylight.wiki.gg/wiki/Legendary_Cosmetics",
    "collabs": "https://deadbydaylight.wiki.gg/wiki/Store_Collections",
}

# Explicit high-resolution portrait URLs for all custom edition characters
EDITION_PORTRAIT_DIRECT_MAP: Dict[str, Dict[str, str]] = {
    "hooked_on_you": {
        "the_trapper_hoy": "https://deadbydaylight.wiki.gg/images/Title_Screen_The_Trapper_HoY.png",
        "the_huntress_hoy": "https://deadbydaylight.wiki.gg/images/Title_Screen_The_Huntress_HoY.png",
        "the_spirit_hoy": "https://deadbydaylight.wiki.gg/images/Title_Screen_The_Spirit_HoY.png",
        "the_wraith_hoy": "https://deadbydaylight.wiki.gg/images/Title_Screen_The_Wraith_HoY.png",
        "claudette_morel_hoy": "https://deadbydaylight.wiki.gg/images/Claudette_outfit_006.png",
        "dwight_fairfield_hoy": "https://deadbydaylight.wiki.gg/images/Summer_vacation.jpeg",
        "the_trickster_hoy": "https://deadbydaylight.wiki.gg/images/Trickster_Crescendo_Concept_Art.jpeg",
        "the_ocean_hoy": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_HookedOnYou.png",
    },
    "legendary_cosplay": {
        "william_birkin": "https://deadbydaylight.wiki.gg/images/CC021_charSelect_portrait.png",
        "hunk": "https://deadbydaylight.wiki.gg/images/CC020_charSelect_portrait.png",
        "james_sunderland": "https://deadbydaylight.wiki.gg/images/CC011_charSelect_portrait.png",
        "maria": "https://deadbydaylight.wiki.gg/images/CC023_charSelect_portrait.png",
        "cybil_bennett": "https://deadbydaylight.wiki.gg/images/CC009_charSelect_portrait.png",
        "lisa_garland": "https://deadbydaylight.wiki.gg/images/CC009_charSelect_portrait.png",
        "naughty_bear": "https://deadbydaylight.wiki.gg/images/CC028_charSelect_portrait.png",
        "baba_yaga": "https://deadbydaylight.wiki.gg/images/CC008_charSelect_portrait.png",
        "the_look_see": "https://deadbydaylight.wiki.gg/images/CC001_charSelect_portrait.png",
        "the_mordeo": "https://deadbydaylight.wiki.gg/images/CC003_charSelect_portrait.png",
        "the_birch": "https://deadbydaylight.wiki.gg/images/CC002_charSelect_portrait.png",
        "carlita": "https://deadbydaylight.wiki.gg/images/CC022_charSelect_portrait.png",
        "tubular_david": "https://deadbydaylight.wiki.gg/images/CC013_charSelect_portrait.png",
        "rain_david": "https://deadbydaylight.wiki.gg/images/CC014_charSelect_portrait.png",
    },
}

# Character Category Subdirectory Mapping (killers vs survivors)
EDITION_ROLE_DIR_MAP: Dict[str, str] = {
    "the_trapper_hoy": "killers",
    "the_huntress_hoy": "killers",
    "the_spirit_hoy": "killers",
    "the_wraith_hoy": "killers",
    "claudette_morel_hoy": "survivors",
    "dwight_fairfield_hoy": "survivors",
    "the_trickster_hoy": "killers",
    "the_ocean_hoy": "killers",
    "william_birkin": "killers",
    "hunk": "killers",
    "james_sunderland": "survivors",
    "maria": "survivors",
    "cybil_bennett": "survivors",
    "lisa_garland": "survivors",
    "naughty_bear": "killers",
    "baba_yaga": "killers",
    "the_look_see": "killers",
    "the_mordeo": "killers",
    "the_birch": "killers",
    "carlita": "survivors",
    "tubular_david": "survivors",
    "rain_david": "survivors",
}


class RosterImageScraperDriver:
    """
    Dedicated scraper driver for acquiring high-resolution character portraits,
    alternate outfits, and dating sim artwork for custom Smash-or-Pass editions.
    """

    def __init__(self, timeout: int = 25, user_agent: Optional[str] = None):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": user_agent
            or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        })

    def fetch_page_soup(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch and parse an HTML page with resilient error handling."""
        try:
            resp = self.session.get(url, timeout=self.timeout, impersonate="chrome120", verify=False)
            if resp.status_code == 200:
                return BeautifulSoup(resp.text, "html.parser")
            logger.warning(f"Failed to fetch {url} (status: {resp.status_code})")
        except Exception as e:
            logger.error(f"Error fetching page {url}: {e}")
        return None

    def scrape_roster_portraits(self, edition_id: str = "hooked_on_you") -> List[Dict[str, Any]]:
        """
        Scrape portrait image URLs and character identities for a specified edition roster.
        """
        results: List[Dict[str, Any]] = []
        seen_slugs = set()

        # 1. First include known high-resolution direct mapped portraits
        if edition_id in EDITION_PORTRAIT_DIRECT_MAP:
            for slug, img_url in EDITION_PORTRAIT_DIRECT_MAP[edition_id].items():
                seen_slugs.add(slug)
                role_sub = EDITION_ROLE_DIR_MAP.get(slug, "killers")
                results.append({
                    "edition": edition_id,
                    "character_name": slug.replace("_", " ").title(),
                    "slug": slug,
                    "image_url": img_url,
                    "relative_path": f"avatars/{role_sub}/{slug}.png",
                    "source_page": ROSTER_GALLERY_URLS.get(edition_id, WIKI_BASE_URL),
                })

        # 2. Scrape live wiki page for any newly released cosmetics or characters
        target_url = ROSTER_GALLERY_URLS.get(edition_id, ROSTER_GALLERY_URLS["hooked_on_you"])
        soup = self.fetch_page_soup(target_url)
        if soup:
            for img_tag in soup.find_all("img"):
                src = img_tag.get("src", "")
                alt = img_tag.get("alt", "").strip() or img_tag.get("title", "").strip()
                if not src or not alt:
                    continue

                lower_alt = alt.lower()
                if any(term in lower_alt for term in ["portrait", "outfit", "render", "charselect", "skin"]):
                    name_clean = re.sub(r"(?i)\s*(portrait|icon|render|fullbody|outfit|character|charselect|cosmetic|skin)\s*", "", alt).strip()
                    slug = sanitize_filename(name_clean.lower().replace(" ", "_"))
                    if slug and slug not in seen_slugs:
                        seen_slugs.add(slug)
                        high_res = extract_high_res_url(img_tag, WIKI_BASE_URL) or urljoin(WIKI_BASE_URL, src)
                        role_sub = EDITION_ROLE_DIR_MAP.get(slug, "killers")
                        results.append({
                            "edition": edition_id,
                            "character_name": name_clean,
                            "slug": slug,
                            "image_url": high_res,
                            "relative_path": f"avatars/{role_sub}/{slug}.png",
                            "source_page": target_url,
                        })

        logger.info(f"Resolved {len(results)} roster portraits for edition '{edition_id}'")
        return results

    def download_roster_image(self, image_url: str, output_path: Path) -> bool:
        """Download a single roster image to the target local filesystem path."""
        try:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            resp = self.session.get(image_url, timeout=self.timeout, impersonate="chrome120", verify=False)
            if resp.status_code == 200 and len(resp.content) > 500:
                with open(output_path, "wb") as f:
                    f.write(resp.content)
                logger.info(f"Successfully downloaded image: {output_path.name} ({len(resp.content):,} bytes)")
                return True
        except Exception as e:
            logger.error(f"Failed to download image from {image_url}: {e}")
        return False

    def sync_edition_assets(self, edition_id: str, static_dir: Path) -> Dict[str, Any]:
        """
        Scrapes and downloads all portraits for a custom roster edition into the static folder.
        """
        portraits = self.scrape_roster_portraits(edition_id)
        downloaded = 0

        for item in portraits:
            dest = static_dir / item["relative_path"]
            ok = self.download_roster_image(item["image_url"], dest)
            if ok or dest.exists():
                downloaded += 1

        return {
            "edition": edition_id,
            "total_found": len(portraits),
            "downloaded": downloaded,
            "output_directory": str(static_dir / "avatars"),
        }
