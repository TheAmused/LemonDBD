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

from app.scrapers.utils import extract_high_res_url, sanitize_filename, save_image_as_webp, auto_save_webp

logger = logging.getLogger(__name__)

WIKI_BASE_URL = "https://deadbydaylight.wiki.gg"

# Official Wiki Collection Banners for every Roster
ROSTER_COVER_URLS: Dict[str, str] = {
    "canon": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_MidnightGrove_BC.png",
    "hooked_on_you": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_HookedOnYou.png",
    "legendary_cosplay": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_Chucky.png",
    "cyberpunk_2077": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_BioPunk.png",
    "anime_manga": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_TokyoGhoul.png",
    "gothic_eldritch": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_GothicTales.png",
}

# Explicit high-resolution authentic portrait URLs for ALL custom edition characters
EDITION_PORTRAIT_DIRECT_MAP: Dict[str, Dict[str, str]] = {
    "hooked_on_you": {
        "the_huntress_hoy": "https://deadbydaylight.wiki.gg/images/Title_Screen_The_Huntress_HoY.png",
        "the_trapper_hoy": "https://deadbydaylight.wiki.gg/images/Title_Screen_The_Trapper_HoY.png",
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
        "lisa_garland": "https://deadbydaylight.wiki.gg/images/CC007_charSelect_portrait.png",
        "naughty_bear": "https://deadbydaylight.wiki.gg/images/CC028_charSelect_portrait.png",
        "baba_yaga": "https://deadbydaylight.wiki.gg/images/CC008_charSelect_portrait.png",
        "the_look_see": "https://deadbydaylight.wiki.gg/images/CC001_charSelect_portrait.png",
        "the_mordeo": "https://deadbydaylight.wiki.gg/images/CC003_charSelect_portrait.png",
        "the_birch": "https://deadbydaylight.wiki.gg/images/CC002_charSelect_portrait.png",
        "minotaur": "https://deadbydaylight.wiki.gg/images/CC005_charSelect_portrait.png",
        "tiffany_valentine": "https://deadbydaylight.wiki.gg/images/CC029_charSelect_portrait.png",
        "chatterer": "https://deadbydaylight.wiki.gg/images/CC010_charSelect_portrait.png",
    },
    "cyberpunk_2077": {
        "cyber_trickster": "https://deadbydaylight.wiki.gg/images/Trickster_DOMREBEL_Concept_Art.png",
        "netrunner_nea": "https://deadbydaylight.wiki.gg/images/NK_outfit_014.png",
        "chrome_wesker": "https://deadbydaylight.wiki.gg/images/K29_charSelect_portrait.png",
        "neon_sable": "https://deadbydaylight.wiki.gg/images/Sable_Ward_Fiery_Spider_Cosmetic_Promo.png",
        "cyber_feng_min": "https://deadbydaylight.wiki.gg/images/FM_outfit_014.png",
        "high_tech_trapper": "https://deadbydaylight.wiki.gg/images/Trapper_DeadlyGames_Concept_Art.png",
        "hightech_trapper": "https://deadbydaylight.wiki.gg/images/Trapper_DeadlyGames_Concept_Art.png",
        "meg_turbo": "https://deadbydaylight.wiki.gg/images/S02_charSelect_portrait.png",
        "cyber_oni": "https://deadbydaylight.wiki.gg/images/K18_charSelect_portrait.png",
        "netrunner_dwight": "https://deadbydaylight.wiki.gg/images/Dwight_Fairfield_AOT_Concept_Art.jpeg",
        "neon_skull_merchant": "https://deadbydaylight.wiki.gg/images/K31_charSelect_portrait.png",
        "cyber_nurse": "https://deadbydaylight.wiki.gg/images/Nurse_Greek_Concept_Art.png",
        "cyber_david_king": "https://deadbydaylight.wiki.gg/images/DK_outfit_012.png",
    },
    "anime_manga": {
        "anime_spirit": "https://deadbydaylight.wiki.gg/images/Spirit_AOT_Concept_Art.png",
        "anime_mikaela": "https://deadbydaylight.wiki.gg/images/Mikaela_Reid_DeadlyGames_Concept_Art.jpeg",
        "anime_yui": "https://deadbydaylight.wiki.gg/images/Yui_Kimura_AOT_Concept_Art.png",
        "anime_trickster": "https://deadbydaylight.wiki.gg/images/Trickster_FireMoon_Concept_Art.jpeg",
        "anime_huntress": "https://deadbydaylight.wiki.gg/images/Huntress_Artists_Concept_Art.png",
        "anime_legion": "https://deadbydaylight.wiki.gg/images/Legion_outfit_009.png",
        "anime_meg": "https://deadbydaylight.wiki.gg/images/S02_charSelect_portrait.png",
        "anime_feng_min": "https://deadbydaylight.wiki.gg/images/FM_outfit_008.png",
        "anime_feng": "https://deadbydaylight.wiki.gg/images/FM_outfit_008.png",
        "anime_dracula": "https://deadbydaylight.wiki.gg/images/K37_charSelect_portrait.png",
        "anime_sable": "https://deadbydaylight.wiki.gg/images/Sable_Ward_Little_Red_Concept_Art.png",
        "anime_wesker": "https://deadbydaylight.wiki.gg/images/K29_charSelect_portrait.png",
    },
    "gothic_eldritch": {
        "gothic_dracula": "https://deadbydaylight.wiki.gg/images/K37_charSelect_portrait.png",
        "gothic_sable": "https://deadbydaylight.wiki.gg/images/Sable_Ward_Gothic_Romance_Concept_Art.png",
        "bloodborne_huntress": "https://deadbydaylight.wiki.gg/images/Huntress_BabaYaga_Concept_Art.png",
        "dark_fantasy_mikaela": "https://deadbydaylight.wiki.gg/images/MikaelaMidnightGroveCosmetic.png",
        "eldritch_nurse": "https://deadbydaylight.wiki.gg/images/Nurse_Greek_Concept_Art.png",
        "victorian_blight": "https://deadbydaylight.wiki.gg/images/Blight_Rare_Concept_Art.png",
        "plague_priestess": "https://deadbydaylight.wiki.gg/images/K15_charSelect_portrait.png",
        "gothic_artist": "https://deadbydaylight.wiki.gg/images/Artist_Baroque_Concept_Art.png",
        "raven_artist": "https://deadbydaylight.wiki.gg/images/Artist_Community_Concept_Art.png",
        "eldritch_dredge": "https://deadbydaylight.wiki.gg/images/Dredge_Fear_of_Reminiscence_Concept_Art.png",
        "abyssal_dredge": "https://deadbydaylight.wiki.gg/images/Dredge_Fear_of_Reminiscence_Concept_Art.png",
        "gothic_knight": "https://deadbydaylight.wiki.gg/images/Knight_VeryRare_Concept_Art.png",
        "occult_vittorio": "https://deadbydaylight.wiki.gg/images/S34_charSelect_portrait.png",
        "phantom_wraith": "https://deadbydaylight.wiki.gg/images/Wraith_Baroque_Concept_Art.png",
    },
}

# Character Category Subdirectory Mapping (killers vs survivors)
EDITION_ROLE_DIR_MAP: Dict[str, str] = {
    # HoY
    "the_trapper_hoy": "killers",
    "the_huntress_hoy": "killers",
    "the_spirit_hoy": "killers",
    "the_wraith_hoy": "killers",
    "claudette_morel_hoy": "survivors",
    "dwight_fairfield_hoy": "survivors",
    "the_trickster_hoy": "killers",
    "the_ocean_hoy": "killers",
    # Legendary
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
    "minotaur": "killers",
    "tiffany_valentine": "killers",
    "chatterer": "killers",
    # Cyberpunk
    "cyber_trickster": "killers",
    "netrunner_nea": "survivors",
    "chrome_wesker": "killers",
    "neon_sable": "survivors",
    "cyber_feng_min": "survivors",
    "high_tech_trapper": "killers",
    "hightech_trapper": "killers",
    "meg_turbo": "survivors",
    "cyber_oni": "killers",
    "netrunner_dwight": "survivors",
    "neon_skull_merchant": "killers",
    "cyber_nurse": "killers",
    "cyber_david_king": "survivors",
    # Anime
    "anime_spirit": "killers",
    "anime_mikaela": "survivors",
    "anime_yui": "survivors",
    "anime_trickster": "killers",
    "anime_huntress": "killers",
    "anime_legion": "killers",
    "anime_meg": "survivors",
    "anime_feng_min": "survivors",
    "anime_feng": "survivors",
    "anime_dracula": "killers",
    "anime_sable": "survivors",
    "anime_wesker": "killers",
    # Gothic
    "gothic_dracula": "killers",
    "gothic_sable": "survivors",
    "bloodborne_huntress": "killers",
    "dark_fantasy_mikaela": "survivors",
    "eldritch_nurse": "killers",
    "victorian_blight": "killers",
    "plague_priestess": "killers",
    "gothic_artist": "killers",
    "raven_artist": "killers",
    "eldritch_dredge": "killers",
    "abyssal_dredge": "killers",
    "gothic_knight": "killers",
    "gothic_dracula": "killers",
    "gothic_sable": "survivors",
    "bloodborne_huntress": "killers",
    "dark_fantasy_mikaela": "survivors",
    "eldritch_nurse": "killers",
    "victorian_blight": "killers",
    "plague_priestess": "killers",
    "gothic_artist": "killers",
    "raven_artist": "killers",
    "eldritch_dredge": "killers",
    "abyssal_dredge": "killers",
    "gothic_knight": "killers",
    "occult_vittorio": "survivors",
    "phantom_wraith": "killers",
}


class RosterImageScraperDriver:
    """
    Dedicated scraper driver for acquiring high-resolution character portraits,
    alternate outfits, and dating sim artwork for custom Smash-or-Pass editions.
    Automatically converts all downloaded images to WebP for maximum compression and performance.
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

    def scrape_roster_portraits(self, edition_id: str) -> List[Dict[str, Any]]:
        """
        Scrape portrait image URLs and character identities for a specified edition roster.
        """
        results: List[Dict[str, Any]] = []
        if edition_id in EDITION_PORTRAIT_DIRECT_MAP:
            for slug, img_url in EDITION_PORTRAIT_DIRECT_MAP[edition_id].items():
                role_sub = EDITION_ROLE_DIR_MAP.get(slug, "killers")
                results.append({
                    "edition": edition_id,
                    "character_name": slug.replace("_", " ").title(),
                    "slug": slug,
                    "image_url": img_url,
                    "relative_path": f"avatars/{role_sub}/{slug}.png",
                    "source_page": WIKI_BASE_URL,
                })
        return results

    @auto_save_webp(quality=90)
    def download_roster_image(self, image_url: str, output_path: Path) -> bool:
        """Download a single roster image to the target local filesystem path and save as WebP."""
        try:
            output_path = Path(output_path)
            webp_path = output_path.with_suffix(".webp")
            if output_path.exists() and output_path.stat().st_size > 500 and webp_path.exists():
                return True
            output_path.parent.mkdir(parents=True, exist_ok=True)
            resp = self.session.get(image_url, timeout=self.timeout, impersonate="chrome120", verify=False)
            if resp.status_code == 200 and len(resp.content) > 500:
                with open(output_path, "wb") as f:
                    f.write(resp.content)
                save_image_as_webp(resp.content, output_path, quality=90)
                logger.info(f"Successfully downloaded & converted image: {output_path.name} ({len(resp.content):,} bytes)")
                return True
        except Exception as e:
            logger.error(f"Failed to download image from {image_url}: {e}")
        return False

    def sync_all_rosters(self, static_dir: Path) -> Dict[str, Any]:
        """
        Scrapes and downloads all unique portraits and covers across all custom rosters,
        converting all assets to WebP format.
        """
        total_downloaded = 0
        avatars_dir = static_dir / "avatars"
        survivors_dir = avatars_dir / "survivors"
        killers_dir = avatars_dir / "killers"
        rosters_cover_dir = avatars_dir / "rosters"

        survivors_dir.mkdir(parents=True, exist_ok=True)
        killers_dir.mkdir(parents=True, exist_ok=True)
        rosters_cover_dir.mkdir(parents=True, exist_ok=True)

        # 1. Download unique official collection banners for every roster
        for r_slug, banner_url in ROSTER_COVER_URLS.items():
            dest = rosters_cover_dir / f"{r_slug}.png"
            ok = self.download_roster_image(banner_url, dest)
            if ok:
                total_downloaded += 1

        # 2. Download unique character artworks for all rosters
        for edition_id in ["hooked_on_you", "legendary_cosplay", "cyberpunk_2077", "anime_manga", "gothic_eldritch"]:
            portraits = self.scrape_roster_portraits(edition_id)
            for item in portraits:
                dest = static_dir / item["relative_path"]
                ok = self.download_roster_image(item["image_url"], dest)
                if ok:
                    total_downloaded += 1

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
