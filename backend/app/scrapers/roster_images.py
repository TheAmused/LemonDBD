# backend/app/scrapers/roster_images.py
import json
import logging
import os
import re
import shutil
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
        "minotaur": "https://deadbydaylight.wiki.gg/images/CC005_charSelect_portrait.png",
        "tiffany_valentine": "https://deadbydaylight.wiki.gg/images/CC029_charSelect_portrait.png",
        "chatterer": "https://deadbydaylight.wiki.gg/images/CC010_charSelect_portrait.png",
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
    "minotaur": "killers",
    "tiffany_valentine": "killers",
    "chatterer": "killers",
}

# Fallback base portraits for styled/cyberpunk/anime/gothic rosters
FALLBACK_AVATAR_MAP: Dict[str, str] = {
    # Cyberpunk
    "killers/cyber_trickster.png": "killers/the_trickster.png",
    "survivors/netrunner_nea.png": "survivors/nea_karlsson.png",
    "killers/chrome_wesker.png": "killers/the_mastermind.png",
    "survivors/neon_sable.png": "survivors/sable_ward.png",
    "survivors/cyber_feng_min.png": "survivors/feng_min.png",
    "killers/high_tech_trapper.png": "killers/the_trapper.png",
    "killers/hightech_trapper.png": "killers/the_trapper.png",
    "survivors/meg_turbo.png": "survivors/meg_thomas.png",
    "killers/cyber_oni.png": "killers/the_oni.png",
    "survivors/netrunner_dwight.png": "survivors/dwight_fairfield.png",
    "killers/neon_skull_merchant.png": "killers/the_skull_merchant.png",
    "killers/cyber_nurse.png": "killers/the_nurse.png",
    "survivors/cyber_david_king.png": "survivors/david_king.png",
    # Anime / Manga
    "killers/anime_spirit.png": "killers/the_spirit.png",
    "survivors/anime_mikaela.png": "survivors/mikaela_reid.png",
    "survivors/anime_yui.png": "survivors/yui_kimura.png",
    "killers/anime_trickster.png": "killers/the_trickster.png",
    "killers/anime_huntress.png": "killers/the_huntress.png",
    "killers/anime_legion.png": "killers/the_legion.png",
    "survivors/anime_meg.png": "survivors/meg_thomas.png",
    "survivors/anime_feng.png": "survivors/feng_min.png",
    "survivors/anime_feng_min.png": "survivors/feng_min.png",
    "killers/anime_dracula.png": "killers/the_dark_lord.png",
    "survivors/anime_sable.png": "survivors/sable_ward.png",
    "killers/anime_wesker.png": "killers/the_mastermind.png",
    # Gothic Eldritch
    "killers/gothic_dracula.png": "killers/the_dark_lord.png",
    "survivors/gothic_sable.png": "survivors/sable_ward.png",
    "killers/bloodborne_huntress.png": "killers/the_huntress.png",
    "survivors/dark_fantasy_mikaela.png": "survivors/mikaela_reid.png",
    "killers/eldritch_nurse.png": "killers/the_nurse.png",
    "killers/victorian_blight.png": "killers/the_blight.png",
    "killers/plague_priestess.png": "killers/the_plague.png",
    "killers/gothic_artist.png": "killers/the_artist.png",
    "killers/raven_artist.png": "killers/the_artist.png",
    "killers/eldritch_dredge.png": "killers/the_dredge.png",
    "killers/abyssal_dredge.png": "killers/the_dredge.png",
    "killers/gothic_knight.png": "killers/the_knight.png",
    "survivors/occult_vittorio.png": "survivors/vittorio_toscano.png",
    "killers/phantom_wraith.png": "killers/the_wraith.png",
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
        target_url = ROSTER_GALLERY_URLS.get(edition_id, ROSTER_GALLERY_URLS.get("hooked_on_you", WIKI_BASE_URL))
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
            if output_path.exists() and output_path.stat().st_size > 500:
                return True
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

    def sync_all_rosters(self, static_dir: Path) -> Dict[str, Any]:
        """
        Scrapes and downloads all portraits and covers across all custom rosters,
        applying high-fidelity fallback copies where applicable.
        """
        total_downloaded = 0
        avatars_dir = static_dir / "avatars"
        survivors_dir = avatars_dir / "survivors"
        killers_dir = avatars_dir / "killers"
        rosters_cover_dir = avatars_dir / "rosters"

        survivors_dir.mkdir(parents=True, exist_ok=True)
        killers_dir.mkdir(parents=True, exist_ok=True)
        rosters_cover_dir.mkdir(parents=True, exist_ok=True)

        # 1. Download mapped online images
        for edition_id in ["hooked_on_you", "legendary_cosplay"]:
            portraits = self.scrape_roster_portraits(edition_id)
            for item in portraits:
                dest = static_dir / item["relative_path"]
                if not dest.exists():
                    ok = self.download_roster_image(item["image_url"], dest)
                    if ok:
                        total_downloaded += 1

        # 2. Apply fallback copies for any themed/augmented cosmetics
        for rel_dest, rel_src in FALLBACK_AVATAR_MAP.items():
            dest = avatars_dir / rel_dest
            src = avatars_dir / rel_src
            if not dest.exists() and src.exists():
                shutil.copyfile(src, dest)
                logger.info(f"Copied fallback avatar {rel_dest} from {rel_src}")

        # 3. Ensure roster cover images exist
        cover_mappings = [
            ("canon", "survivors/sable_ward.png"),
            ("hooked_on_you", "killers/the_huntress_hoy.png"),
            ("legendary_cosplay", "killers/baba_yaga.png"),
            ("cyberpunk_2077", "survivors/feng_min.png"),
            ("anime_manga", "killers/the_spirit.png"),
            ("gothic_eldritch", "killers/the_dark_lord.png"),
        ]
        for r_slug, rel_src in cover_mappings:
            cover_dest = rosters_cover_dir / f"{r_slug}.png"
            src = avatars_dir / rel_src
            if not cover_dest.exists() and src.exists():
                shutil.copyfile(src, cover_dest)

        return {
            "status": "success",
            "total_downloaded": total_downloaded,
            "static_avatars_dir": str(avatars_dir),
        }

    def sync_and_seed_all(self, static_dir: Path) -> Dict[str, Any]:
        """
        Syncs all assets across rosters and automatically invokes seed_smash_rosters()
        to upsert the database.
        """
        sync_result = self.sync_all_rosters(static_dir)

        # Upsert database records from JSON files
        from app.seeds.smash_roster_seeder import seed_smash_rosters
        seed_smash_rosters()

        sync_result["database_seeded"] = True
        return sync_result
