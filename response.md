### backend/app/scrapers/__init__.py
```python
from app.scrapers.constants import (
    GENERIC_PERK_CANONICAL_MAP,
    KNOWN_KILLER_POWER_ALIASES,
)
from app.scrapers.maps import (
    HensMapScraperDriver,
    SamoelColtMapScraperDriver,
    get_map_landmarks_data,
)
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

__all__ = [
    "ScraperConfig",
    "CharacterData",
    "ItemData",
    "AddonData",
    "PerkData",
    "MapData",
    "GENERIC_PERK_CANONICAL_MAP",
    "KNOWN_KILLER_POWER_ALIASES",
    "clean_description_text",
    "normalize_name_key",
    "sanitize_filename",
    "extract_high_res_url",
    "extract_slug_from_href",
    "classify_portrait",
    "WikiGGScraperDriver",
    "get_map_landmarks_data",
    "HensMapScraperDriver",
    "SamoelColtMapScraperDriver",
]
```

### backend/app/scrapers/constants.py
```python
GENERIC_PERK_CANONICAL_MAP: dict[str, tuple[str, str]] = {
    "will to live": ("Decisive Strike", "Will to Live"),
    "down to the last": ("Sole Survivor", "Down to the Last"),
    "bound by obsession": ("Object of Obsession", "Bound by Obsession"),
    "keep them waiting": ("Save the Best for Last", "Keep Them Waiting"),
    "see how they run": ("Play with Your Food", "See How They Run"),
    "cull the weak": ("Dying Light", "Cull the Weak"),
    "no holds barred": ("Deadlock", "No Holds Barred"),
    "hex fortune s fool": ("Hex: Plaything", "Hex: Fortune's Fool"),
    "hex fortunes fool": ("Hex: Plaything", "Hex: Fortune's Fool"),
    "scourge hook weeping wounds": ("Scourge Hook: Gift of Pain", "Scourge Hook: Weeping Wounds"),
    "jolt": ("Surge", "Jolt"),
    "fearmonger": ("Mindbreaker", "Fearmonger"),
    "claustrophobia": ("Cruel Limits", "Claustrophobia"),
    "guardian": ("Babysitter", "Guardian"),
    "kinship": ("Camaraderie", "Kinship"),
    "self aware": ("Fixated", "Self-Aware"),
    "selfaware": ("Fixated", "Self-Aware"),
    "situational awareness": ("Better Together", "Situational Awareness"),
    "inner healing": ("Inner Strength", "Inner Healing"),
    "renewal": ("Second Wind", "Renewal"),
}

KNOWN_KILLER_POWER_ALIASES: dict[str, str] = {
    "bear trap": "The Trapper",
    "bear traps": "The Trapper",
    "wailing bell": "The Wraith",
    "the chainsaw": "The Hillbilly",
    "chainsaw": "The Hillbilly",
    "spencer s last breath": "The Nurse",
    "spencers last breath": "The Nurse",
    "evil within": "The Shape",
    "blackened catalyst": "The Hag",
    "carter s spark": "The Doctor",
    "carters spark": "The Doctor",
    "hunting hatchets": "The Huntress",
    "hunting hatchet": "The Huntress",
    "bubba s chainsaw": "The Cannibal",
    "bubbas chainsaw": "The Cannibal",
    "dream demon": "The Nightmare",
    "jigsaw s baptism": "The Pig",
    "jigsaws baptism": "The Pig",
    "the afterpiece tonic": "The Clown",
    "afterpiece tonic": "The Clown",
    "yamaoka s haunting": "The Spirit",
    "yamaokas haunting": "The Spirit",
    "feral frenzy": "The Legion",
    "vile purge": "The Plague",
    "night shroud": "The Ghost Face",
    "of the abyss": "The Demogorgon",
    "yamaoka s wrath": "The Oni",
    "yamaokas wrath": "The Oni",
    "the redeemer": "The Deathslinger",
    "redeemer": "The Deathslinger",
    "rites of judgement": "The Executioner",
    "blighted corruption": "The Blight",
    "blood bond": "The Twins",
    "showstopper": "The Trickster",
    "t virus": "The Nemesis",
    "summons of pain": "The Cenobite",
    "birds of torment": "The Artist",
    "deluge of fear": "The Onryō",
    "reign of darkness": "The Dredge",
    "virulent bound": "The Mastermind",
    "guardia compagnia": "The Knight",
    "eyes in the sky": "The Skull Merchant",
    "quantum instantiation": "The Singularity",
    "hidden pursuit": "The Xenomorph",
    "playtime s over": "The Good Guy",
    "playtimes over": "The Good Guy",
    "uvx": "The Unknown",
    "vile darkness": "The Lich",
    "viledarkness": "The Lich",
    "vampiric shift": "The Dark Lord",
    "scent of blood": "The Houndmaster",
    "one eyed terror": "The Ghoul",
    "fazbear s fright": "The Animatronic",
    "fazbears fright": "The Animatronic",
    "unbodied flesh": "The Krasue",
    "test subject 001": "The First",
    "test subject 1": "The First",
    "omnipresent evil": "The Slasher",
    "will of the gods": "The Judgment",
}
```

### backend/app/scrapers/maps.py
```python
import logging
import re
import time
from typing import Any
from bs4 import BeautifulSoup
from curl_cffi import requests
from flask import current_app
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.core.extensions import db
from app.models import MapRealm
from app.scrapers.types import MapData
from app.scrapers.utils import normalize_name_key, sanitize_filename

logger = logging.getLogger(__name__)


def get_map_landmarks_data(
    map_name: str, realm_name: str, source: str = "hens333"
) -> dict[str, Any]:
    try:
        if current_app:
            norm_map = normalize_name_key(map_name)
            maps = db.session.scalars(
                select(MapRealm).options(joinedload(MapRealm.tiles))
            ).all()
            for m in maps:
                m_norm = normalize_name_key(m.name)
                if norm_map and (norm_map == m_norm or norm_map in m_norm or m_norm in norm_map):
                    twelve = next(
                        (t.name for t in m.tiles if "twelve" in t.name.lower() or t.y < 0.25),
                        "Main Building / North Exit Gate",
                    )
                    three = next(
                        (t.name for t in m.tiles if "three" in t.name.lower() or t.x > 0.75),
                        "East Jungle Gym / Outer Loop",
                    )
                    six = next(
                        (t.name for t in m.tiles if "six" in t.name.lower() or "shack" in t.name.lower() or t.y > 0.75),
                        "Killer Shack & Basement / South Exit Gate",
                    )
                    nine = next(
                        (t.name for t in m.tiles if "nine" in t.name.lower() or t.x < 0.25),
                        "West Gym / L-T Walls",
                    )
                    center = next(
                        (t.name for t in m.tiles if "center" in t.name.lower() or (0.4 <= t.x <= 0.6 and 0.4 <= t.y <= 0.6)),
                        "Center Spine / Central Generator",
                    )
                    desc = m.description or f"Landmark layout for {m.name} ({m.realm})."
                    return {
                        "description": f"12-Clock Callout System for {m.name} ({m.realm}). {desc}".strip(),
                        "twelve_o_clock": twelve,
                        "three_o_clock": three,
                        "six_o_clock": six,
                        "nine_o_clock": nine,
                        "center": center,
                    }
    except Exception:
        pass

    return {
        "description": f"12-Clock Callout System for {map_name} ({realm_name}). Standard top-middle starts at 12 o'clock.",
        "twelve_o_clock": "Main Landmark / North Exit Gate",
        "three_o_clock": "East Loop Tile / Generator Cluster",
        "six_o_clock": "Killer Shack & Basement / South Exit Gate",
        "nine_o_clock": "West Jungle Gym / Pallet Gym",
        "center": "Center Landmark / Central Generator",
    }


class HensMapScraperDriver:
    HENS_CALLOUTS_URL = "https://hens333.com/callouts"
    CDN_BASE = "https://hens333.com/img/dbd/callouts/"
    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 25

    def scrape_maps(self) -> list[MapData]:
        logger.info("Scraping map callouts from Hens333...")
        session = requests.Session(impersonate=self.IMPERSONATE_BROWSER)
        res = None
        for attempt in range(3):
            try:
                res = session.get(
                    self.HENS_CALLOUTS_URL,
                    verify=False,
                    timeout=self.REQUEST_TIMEOUT,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.9",
                    },
                )
                if res.status_code == 200:
                    break
                logger.warning(f"Attempt {attempt + 1}: Hens333 returned HTTP {res.status_code}")
                time.sleep(1.5)
            except Exception as req_err:
                logger.warning(f"Attempt {attempt + 1}: Failed to fetch Hens333 callouts: {req_err}")
                time.sleep(1.5)

        if not res or res.status_code != 200:
            logger.warning("Could not retrieve Hens333 callouts page after multiple attempts.")
            return []

        try:
            soup = BeautifulSoup(res.text, "html.parser")
            maps: list[MapData] = []
            seen_ids = set()

            realm_wrappers = soup.find_all("div", class_="realm-wrapper")
            if not realm_wrappers:
                buttons = soup.find_all(attrs={"data-path": True})
                for btn in buttons:
                    dpath = btn.get("data-path", "").strip()
                    if not dpath:
                        continue
                    map_name = btn.get_text(strip=True) or dpath.split("/")[-1].split(".")[0]
                    map_slug = sanitize_filename(map_name)
                    realm_name = dpath.split("/")[0] if "/" in dpath else "General Realm"
                    realm_slug = sanitize_filename(realm_name)

                    encoded_dpath = re.sub(r"\s", "%20", dpath)
                    remote_url = f"{self.CDN_BASE}{encoded_dpath}" if not dpath.startswith("http") else dpath
                    rel_static_path = f"maps/callouts/hens333/{realm_slug}/{map_slug}.webp"
                    unique_id = f"hens_{realm_slug}_{map_slug}"

                    if unique_id in seen_ids:
                        continue
                    seen_ids.add(unique_id)

                    maps.append(
                        MapData(
                            id=unique_id,
                            name=map_name,
                            realm=realm_name,
                            realm_id=realm_slug,
                            callout_image_url=remote_url,
                            callout_image_local_path=rel_static_path,
                            dpath=dpath,
                            clock_system=get_map_landmarks_data(
                                map_name=map_name,
                                realm_name=realm_name,
                                source="hens333",
                            ),
                            source="hens333",
                            source_label="Hens333 12-Clock Callouts",
                        )
                    )
                logger.info(f"Scraped {len(maps)} maps from Hens333 (fallback structure).")
                return maps

            for rw in realm_wrappers:
                h1 = rw.find(["h1", "h2", "h3", "div"], class_=lambda c: not c or "realm" in str(c).lower())
                realm_name = h1.get_text(strip=True) if h1 else "General Realm"
                realm_slug = sanitize_filename(realm_name)

                for btn in rw.find_all(attrs={"data-path": True}):
                    dpath = btn["data-path"].strip()
                    if not dpath:
                        continue
                    map_name = btn.get_text(strip=True)
                    if not map_name:
                        map_name = dpath.split("/")[-1].split(".")[0]
                    map_slug = sanitize_filename(map_name)

                    encoded_dpath = re.sub(r"\s", "%20", dpath)
                    remote_url = f"{self.CDN_BASE}{encoded_dpath}" if not dpath.startswith("http") else dpath
                    rel_static_path = f"maps/callouts/hens333/{realm_slug}/{map_slug}.webp"
                    unique_id = f"hens_{realm_slug}_{map_slug}"

                    if unique_id in seen_ids:
                        continue
                    seen_ids.add(unique_id)

                    maps.append(
                        MapData(
                            id=unique_id,
                            name=map_name,
                            realm=realm_name,
                            realm_id=realm_slug,
                            callout_image_url=remote_url,
                            callout_image_local_path=rel_static_path,
                            dpath=dpath,
                            clock_system=get_map_landmarks_data(
                                map_name=map_name,
                                realm_name=realm_name,
                                source="hens333",
                            ),
                            source="hens333",
                            source_label="Hens333 12-Clock Callouts",
                        )
                    )
            logger.info(f"Scraped {len(maps)} maps from Hens333.")
            return maps
        except Exception as e:
            logger.error(f"Error parsing Hens333 maps: {e}")
            return []


class SamoelColtMapScraperDriver:
    STEAM_GUIDE_URL = "https://steamcommunity.com/sharedfiles/filedetails/?id=2899093390"
    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30

    def scrape_maps(self) -> list[MapData]:
        logger.info("Scraping SamoelColt map guides from Steam Workshop...")
        session = requests.Session(impersonate=self.IMPERSONATE_BROWSER)
        res = None
        cookies = {
            "birthtime": "283993201",
            "mature_content": "1",
            "wants_mature_content": "1",
            "lastagecheckage": "1-January-1980",
        }

        for attempt in range(3):
            try:
                res = session.get(
                    self.STEAM_GUIDE_URL,
                    cookies=cookies,
                    verify=False,
                    timeout=self.REQUEST_TIMEOUT,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.9",
                    },
                )
                if res.status_code == 200:
                    break
                logger.warning(f"Attempt {attempt + 1}: Steam guide returned HTTP {res.status_code}")
                time.sleep(2.0)
            except Exception as req_err:
                logger.warning(f"Attempt {attempt + 1}: Failed to fetch Steam guide: {req_err}")
                time.sleep(2.0)

        if not res or res.status_code != 200:
            logger.warning("Could not retrieve SamoelColt Steam guide after multiple attempts.")
            return []

        try:
            soup = BeautifulSoup(res.text, "html.parser")
            maps: list[MapData] = []
            seen_ids = set()

            subsections = soup.find_all("div", class_="subSection")
            for sub in subsections:
                title_div = sub.find("div", class_="subSectionTitle")
                realm_name = title_div.get_text(strip=True) if title_div else "General Realm"
                if realm_name in ["Overview", "Comments", "General", "Change Log", "Introduction", "Changelog", "Credits"]:
                    continue

                realm_slug = sanitize_filename(realm_name)
                lines = [text.strip() for text in sub.stripped_strings if text.strip() and text.strip() != realm_name]

                links = sub.find_all("a", class_="modalContentLink")
                if not links:
                    links = sub.find_all("a", href=re.compile(r"images\.steamusercontent\.com|steamuserimages"))

                for idx, link in enumerate(links):
                    href = link.get("href", "")
                    if not href:
                        img_tag = link.find("img")
                        if img_tag:
                            href = img_tag.get("src", "")

                    if href and ("images.steamusercontent.com" in href or "steamuserimages" in href):
                        map_name = f"{realm_name} Map {idx + 1}"
                        if idx < len(lines):
                            potential_name = lines[idx]
                            if 3 < len(potential_name) < 50 and not potential_name.startswith("http") and not potential_name.startswith("Preview"):
                                map_name = potential_name

                        map_slug = sanitize_filename(map_name)
                        unique_id = f"samoel_{realm_slug}_{map_slug}_{idx + 1}"
                        if unique_id in seen_ids:
                            continue
                        seen_ids.add(unique_id)

                        rel_static_path = f"maps/callouts/samoelcolt/{realm_slug}/{map_slug}_{idx + 1}.jpg"

                        maps.append(
                            MapData(
                                id=unique_id,
                                name=map_name,
                                realm=realm_name,
                                realm_id=realm_slug,
                                callout_image_url=href,
                                callout_image_local_path=rel_static_path,
                                dpath="",
                                clock_system=get_map_landmarks_data(
                                    map_name=map_name,
                                    realm_name=realm_name,
                                    source="samoelcolt",
                                ),
                                source="samoelcolt",
                                source_label="SamoelColt Isometric Scheme",
                            )
                        )
            logger.info(f"Scraped {len(maps)} SamoelColt maps from Steam Workshop.")
            return maps
        except Exception as e:
            logger.error(f"Error parsing SamoelColt maps: {e}")
            return []
```

### backend/app/scrapers/roster_images.py
```python
import logging
from pathlib import Path
from typing import Any
from bs4 import BeautifulSoup
from curl_cffi import requests

from app.scrapers.utils import auto_save_webp, sanitize_filename, save_image_as_webp

logger = logging.getLogger(__name__)

WIKI_BASE_URL = "https://deadbydaylight.wiki.gg"

ROSTER_COVER_URLS: dict[str, str] = {
    "canon": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_MidnightGrove_BC.png",
    "hooked_on_you": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_HookedOnYou.png",
    "legendary_cosplay": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_Chucky.png",
    "cyberpunk_2077": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_BioPunk.png",
    "anime_manga": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_TokyoGhoul.png",
    "gothic_eldritch": "https://deadbydaylight.wiki.gg/images/T_UI_CollectionBanner_GothicTales.png",
}

EDITION_PORTRAIT_DIRECT_MAP: dict[str, dict[str, str]] = {
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

EDITION_ROLE_DIR_MAP: dict[str, str] = {
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
    "minotaur": "killers",
    "tiffany_valentine": "killers",
    "chatterer": "killers",
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
    """Dedicated scraper driver for acquiring high-resolution character portraits."""

    def __init__(self, timeout: int = 25, user_agent: str | None = None):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": user_agent
            or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        })

    def fetch_page_soup(self, url: str) -> BeautifulSoup | None:
        try:
            resp = self.session.get(url, timeout=self.timeout, impersonate="chrome120", verify=False)
            if resp.status_code == 200:
                return BeautifulSoup(resp.text, "html.parser")
            logger.warning(f"Failed to fetch {url} (status: {resp.status_code})")
        except Exception as e:
            logger.error(f"Error fetching page {url}: {e}")
        return None

    def scrape_roster_portraits(self, edition_id: str) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
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
                logger.info(f"Successfully downloaded image: {output_path.name} ({len(resp.content):,} bytes)")
                return True
        except Exception as e:
            logger.error(f"Failed to download image from {image_url}: {e}")
        return False

    def sync_all_rosters(self, static_dir: Path) -> dict[str, Any]:
        total_downloaded = 0
        avatars_dir = static_dir / "avatars"
        survivors_dir = avatars_dir / "survivors"
        killers_dir = avatars_dir / "killers"
        rosters_cover_dir = avatars_dir / "rosters"

        survivors_dir.mkdir(parents=True, exist_ok=True)
        killers_dir.mkdir(parents=True, exist_ok=True)
        rosters_cover_dir.mkdir(parents=True, exist_ok=True)

        for r_slug, banner_url in ROSTER_COVER_URLS.items():
            dest = rosters_cover_dir / f"{r_slug}.png"
            ok = self.download_roster_image(banner_url, dest)
            if ok:
                total_downloaded += 1

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

    def sync_and_seed_all(self, static_dir: Path) -> dict[str, Any]:
        sync_result = self.sync_all_rosters(static_dir)
        from app.seeds.smash_roster_seeder import seed_smash_rosters
        seed_smash_rosters()
        sync_result["database_seeded"] = True
        return sync_result
```

### backend/app/scrapers/types.py
```python
from dataclasses import asdict, dataclass, field, fields
from typing import Any


@dataclass
class ScraperConfig:
    source: str = "wikigg"
    fallback_to_wiki: bool = False
    last_used_source: str = "wikigg"
    last_run_timestamp: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ScraperConfig":
        if not isinstance(data, dict):
            return cls()
        valid_keys = {f.name for f in fields(cls)}
        filtered = {k: v for k, v in data.items() if k in valid_keys}
        return cls(**filtered)


@dataclass
class KillerPowerData:
    name: str = ""
    description: str = ""
    icon_url: str = ""
    icon_local_path: str = ""
    movement_speed: str = ""
    terror_radius: str = ""
    terror_radius_meters: int | None = None
    height: str = ""


@dataclass
class CharacterData:
    name: str
    real_name: str
    wiki_slug: str
    short_name: str
    category: str
    avatar_url: str
    avatar_local_path: str
    release_number: int = 0
    code_prefix: str | None = None
    chapter_name: str | None = None
    chapter_number: str | None = None
    dlc_type: str | None = None
    is_licensed: bool = False
    release_year: int | None = None
    release_date: str | None = None
    dlc_counterparts: str | None = None
    lore: str | None = None
    power: KillerPowerData | None = None
    translations: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass
class ItemData:
    name: str
    category: str
    role: str
    description: str
    icon_url: str
    icon_local_path: str
    rarity: str
    translations: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass
class AddonData:
    name: str
    associated_target: str
    category: str
    description: str
    icon_url: str
    icon_local_path: str
    rarity: str
    translations: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass
class OfferingData:
    name: str
    category: str
    role: str
    description: str
    icon_url: str
    icon_local_path: str
    rarity: str
    translations: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass
class PerkData:
    name: str
    character: str
    character_real_name: str
    character_avatar_path: str
    category: str
    description: str
    icon_url: str
    icon_local_path: str
    alternate_name: str | None = None
    is_generic_counterpart: bool = False
    translations: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass
class MapData:
    id: str
    name: str
    realm: str
    realm_id: str
    callout_image_url: str
    callout_image_local_path: str
    dpath: str
    clock_system: dict[str, Any]
    source: str = "hens333"
    source_label: str = "Hens333 12-Clock Callouts"
```

### backend/app/scrapers/utils.py
```python
import html
import re
import unicodedata
from urllib.parse import unquote
from bs4 import Tag

PORTRAIT_REGEX = re.compile(r"^(K|S)(\d+)_.*_Portrait", re.ASCII)
YEAR_REGEX = re.compile(r"\b(201[6-9]|202[0-9]|203[0-9])\b")
TERROR_RADIUS_NUM_REGEX = re.compile(r"(\d+)\s*m(?:etre|eter)?s?", re.IGNORECASE)


def classify_portrait(image_url: str) -> tuple[str, int] | None:
    if not image_url:
        return None
    filename = image_url.split("/revision")[0].rstrip("/").split("/")[-1]
    match = PORTRAIT_REGEX.match(filename)
    if not match:
        return None
    role_letter = match.group(1)
    if role_letter not in ("K", "S"):
        return None
    role = "Killer" if role_letter == "K" else "Survivor"
    try:
        rel_num = int(match.group(2))
    except ValueError:
        rel_num = 0
    return role, rel_num


def normalise_character_name(name: str, category: str = "") -> str:
    if not name:
        return ""
    clean_name = name.strip()
    if category.lower() == "killer" and clean_name.lower().startswith("the "):
        return clean_name[4:].strip()
    return clean_name


def normalize_name_key(text: str) -> str:
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    normalized = normalized.lower().strip()
    normalized = re.sub(r"[^a-z0-9]", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def clean_description_text(text: str) -> str:
    if not text or not isinstance(text, str):
        return ""

    cleaned = re.sub(r"<[^>]+>", "", text)
    cleaned = re.sub(r'\b[a-zA-Z0-9_-]+=["\'][^"\']*["\']\s*>?', "", cleaned)
    cleaned = html.unescape(cleaned)

    cleaned = cleaned.replace("\ufffd", '"')
    cleaned = re.sub(r'\?([A-Z"])', r'"\1', cleaned)
    cleaned = re.sub(r'([a-z.,!])\?\s*-', r'\1" -', cleaned)

    cleaned = re.sub(
        r"(\d+)(?:\s*/\s*(\d+))+",
        lambda m: re.sub(r"\s*/\s*", "/", m.group(0)),
        cleaned,
    )
    cleaned = re.sub(r"(\d+)\s+(%)", r"\1\2", cleaned)
    cleaned = re.sub(r"(\d+)\s+(s|m)\b(?!\w)", r"\1\2", cleaned)

    cleaned = re.sub(
        r"THIS\s+(?:ADD-ON|ADDON|ITEM|UNLOCKABLE|OFFERING)\s+(?:IS\s+NO\s+LONGER\s+AVAILABLE|WAS\s+DECOMMISSIONED)\s*(?:\([^)]*\))?",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"STOCKPILES\s+MAY\s+STILL\s+BE\s+USED\s+IN\s+TRIALS",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )

    cleaned = re.sub(
        r"This description is based on the changes announced for or featured in the upcoming Patch\s*[\d.]*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"Unable to retrieve the Perk description.*$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )

    lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
    if not lines:
        return ""

    if len(lines) > 2 and lines[-1].lower() == lines[0].lower():
        lines = lines[:-1]

    filtered_lines = [l for l in lines if l.lower() not in ["survivor", "killer", "survivor perk", "killer perk"]]
    return "\n".join(filtered_lines).strip()


def extract_cell_markdown_text(cell_tag: Tag | None) -> str:
    """Converts a MediaWiki table cell containing rich text, lists, and quotes into clean markdown."""
    if not cell_tag:
        return ""
    from bs4 import BeautifulSoup
    cell_copy = BeautifulSoup(str(cell_tag), "html.parser")
    for icon_link in cell_copy.find_all(class_="iconLink"):
        icon_link.decompose()
    for li in cell_copy.find_all("li"):
        li.replace_with(f"\n* {li.get_text().strip()}\n")
    for br in cell_copy.find_all("br"):
        br.replace_with("\n")
    for p in cell_copy.find_all("p"):
        p.replace_with(f"\n{p.get_text().strip()}\n")
    for div in cell_copy.find_all("div"):
        div.replace_with(f"\n{div.get_text().strip()}\n")

    raw_text = cell_copy.get_text()
    return clean_description_text(raw_text)


def sanitize_filename(name: str) -> str:
    clean_str = name.lower().strip()
    clean_str = re.sub(r"[\s\-/]+", "_", clean_str)
    clean_str = re.sub(r'[\\/*?:"<>|®™\']', "", clean_str)
    clean_str = re.sub(r"_+", "_", clean_str)
    return clean_str.strip("_")


def extract_high_res_url(img_tag: Tag | None, base_domain: str = "https://deadbydaylight.wiki.gg") -> str:
    if not img_tag:
        return ""
    raw_url = (
        img_tag.get("data-src")
        or img_tag.get("src")
        or img_tag.get("data-srcset")
        or ""
    )
    if not raw_url:
        return ""

    if "," in raw_url:
        raw_url = raw_url.split(",")[-1].strip().split()[0]

    if raw_url.startswith("//"):
        raw_url = f"https:{raw_url}"
    elif raw_url.startswith("/"):
        raw_url = f"{base_domain.rstrip('/')}{raw_url}"

    if "/images/thumb/" in raw_url:
        match = re.search(r"/images/thumb/([0-9a-f]/[0-9a-f]{2}/[^/]+)/", raw_url)
        if match:
            raw_url = f"{base_domain.rstrip('/')}/images/{match.group(1)}"
        else:
            raw_url = raw_url.replace("/thumb", "")
            raw_url = re.sub(r"/\d+px-[^/]+$", "", raw_url)

    raw_url = re.sub(r"/scale-to-width-down/\d+", "", raw_url)
    if "/revision/latest" in raw_url:
        raw_url = raw_url.split("/revision/latest")[0] + "/revision/latest"

    return raw_url


def extract_slug_from_href(href: str) -> str:
    if not href or "/wiki/" not in href:
        return ""
    raw_slug = href.split("/wiki/")[-1].split("#")[0].split("?")[0]
    return unquote(raw_slug).strip()


def convert_bytes_to_webp(image_bytes: bytes, quality: int = 90) -> bytes:
    """Converts raw image bytes into high-efficiency WebP format bytes."""
    import io
    from PIL import Image

    img = Image.open(io.BytesIO(image_bytes))
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        img = img.convert("RGBA")
    else:
        img = img.convert("RGB")

    out_buf = io.BytesIO()
    img.save(out_buf, format="WEBP", quality=quality, method=6)
    return out_buf.getvalue()


def save_image_as_webp(image_bytes: bytes, output_path, quality: int = 90):
    from pathlib import Path
    target_path = Path(output_path).with_suffix(".webp")
    target_path.parent.mkdir(parents=True, exist_ok=True)
    webp_data = convert_bytes_to_webp(image_bytes, quality=quality)
    with open(target_path, "wb") as f:
        f.write(webp_data)
    return target_path


def auto_save_webp(quality: int = 90):
    import functools
    from pathlib import Path

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            res = func(*args, **kwargs)
            out_file = None
            if len(args) > 1 and isinstance(args[1], (str, Path)):
                out_file = Path(args[1])
            elif "output_path" in kwargs and isinstance(kwargs["output_path"], (str, Path)):
                out_file = Path(kwargs["output_path"])
            elif "dest" in kwargs and isinstance(kwargs["dest"], (str, Path)):
                out_file = Path(kwargs["dest"])

            if out_file and out_file.exists() and out_file.suffix.lower() != ".webp":
                try:
                    with open(out_file, "rb") as f:
                        data = f.read()
                    if len(data) > 100:
                        save_image_as_webp(data, out_file, quality=quality)
                except Exception:
                    pass
            return res
        return wrapper
    return decorator
```

### backend/app/scrapers/wikigg.py
```python
from __future__ import annotations

import asyncio
import html
import logging
import re
import time
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any
from bs4 import BeautifulSoup, Tag
from curl_cffi import requests
from curl_cffi.requests import AsyncSession

from app.core.json_provider import safe_json_dumps
from app.scrapers.constants import GENERIC_PERK_CANONICAL_MAP, KNOWN_KILLER_POWER_ALIASES
from app.scrapers.types import AddonData, CharacterData, ItemData, KillerPowerData, OfferingData, PerkData
from app.scrapers.utils import (
    clean_description_text,
    extract_cell_markdown_text,
    extract_high_res_url,
    extract_slug_from_href,
    normalize_name_key,
    sanitize_filename,
)

logger = logging.getLogger(__name__)

PORTRAIT_PATTERN = re.compile(r"(?:^|/)(K|S)(\d+)[-_]", re.IGNORECASE)


def extract_icon_token(src_or_alt: str) -> str:
    if not src_or_alt:
        return ""
    m = re.search(r"(?:Full_)?Icon(?:Perks|Items|Addons|Addon|Powers|Help)_([^./?]+)", src_or_alt, re.IGNORECASE)
    if m:
        return re.sub(r"[^a-zA-Z0-9]", "", m.group(1)).lower()
    m2 = re.search(r"(?:^|/)(K|S)(\d+)[-_]", src_or_alt, re.IGNORECASE)
    if m2:
        return f"{m2.group(1).upper()}{int(m2.group(2)):02d}"
    fn = src_or_alt.split("/")[-1].split(".")[0]
    fn = re.sub(r"^\d+px-", "", fn, flags=re.IGNORECASE)
    fn = re.sub(r"^(?:Full_)?(?:Icon(?:Addon|Addons|Items|Perks|Powers)_)?", "", fn, flags=re.IGNORECASE)
    return re.sub(r"[^a-zA-Z0-9]", "", fn).lower()


MONTHS_REGEX_STR = (
    r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
)

DATE_CLEAN_REGEX = re.compile(
    rf"\b([0-9]{{1,2}})(?:st|nd|rd|th)?\s+(?:of\s+)?({MONTHS_REGEX_STR})\s+(?:of\s+)?(20[1-3][0-9])\b",
    re.IGNORECASE,
)

DATE_MDY_REGEX = re.compile(
    rf"\b({MONTHS_REGEX_STR})\s+([0-9]{{1,2}})(?:st|nd|rd|th)?,?\s+(?:of\s+)?(20[1-3][0-9])\b",
    re.IGNORECASE,
)

YEAR_ONLY_REGEX = re.compile(r"\b(201[6-9]|202[0-9]|203[0-9])\b")

RARITY_PATTERN = re.compile(
    r"\b(common|uncommon|rare|very[_\s-]?rare|ultra[_\s-]?rare|event|special|artifact|limited)\b",
    re.IGNORECASE,
)


def parse_date_and_year(text: str) -> tuple[str | None, int | None]:
    if not text:
        return None, None

    clean = html.unescape(text)
    m = DATE_CLEAN_REGEX.search(clean)
    if m:
        day = int(m.group(1))
        month = m.group(2).capitalize()
        year = int(m.group(3))
        return f"{day} {month} {year}", year

    m = DATE_MDY_REGEX.search(clean)
    if m:
        month = m.group(1).capitalize()
        day = int(m.group(2))
        year = int(m.group(3))
        return f"{day} {month} {year}", year

    ym = YEAR_ONLY_REGEX.search(clean)
    if ym:
        year = int(ym.group(1))
        return str(year), year

    return None, None


def clean_chapter_title(raw_chapter: str) -> tuple[str | None, str]:
    if not raw_chapter:
        return None, ""

    cleaned = (
        raw_chapter.replace("[edit]", "")
        .replace("â„¢", "™")
        .replace("Â®", "®")
        .strip()
    )

    m = re.match(
        r"^((?:CHAPTER|PARAGRAPH)\s+(?:[0-9]+(?:\.[0-9]+)?|[IVXLCDM]+)):\s*(.+)$",
        cleaned,
        re.IGNORECASE,
    )
    if m:
        return m.group(1).strip(), m.group(2).strip()

    return None, cleaned


def extract_rarity_from_elements(
    cells: list[Tag],
    img_tag: Tag | None = None,
    section_context: str = "",
) -> str:
    if len(cells) >= 4:
        c_text = cells[2].get_text(strip=True)
        m = RARITY_PATTERN.search(c_text)
        if m:
            return normalize_rarity_name(m.group(1))

    for cell in cells:
        for el in [cell] + cell.find_all(["a", "div", "span", "img", "td"]):
            for attr in ["title", "data-rarity", "class", "alt"]:
                val = el.get(attr, "")
                if isinstance(val, list):
                    val = " ".join(val)
                if val:
                    m = RARITY_PATTERN.search(str(val))
                    if m:
                        return normalize_rarity_name(m.group(1))

    if img_tag:
        img_src = (
            img_tag.get("data-src")
            or img_tag.get("src")
            or img_tag.get("data-srcset")
            or ""
        )
        if img_src:
            m = RARITY_PATTERN.search(img_src)
            if m:
                return normalize_rarity_name(m.group(1))

    if section_context:
        m = RARITY_PATTERN.search(section_context)
        if m:
            return normalize_rarity_name(m.group(1))

    return "Common"


def normalize_rarity_name(raw_rarity: str) -> str:
    r = raw_rarity.lower().replace("_", " ").replace("-", " ").strip()
    if "ultra" in r:
        return "Ultra Rare"
    if "very" in r:
        return "Very Rare"
    if "uncommon" in r:
        return "Uncommon"
    if "rare" in r:
        return "Rare"
    if "event" in r or "special" in r or "limited" in r:
        return "Event"
    if "artifact" in r:
        return "Ultra Rare"
    return "Common"


class WikiGGScraperDriver:
    BASE_DOMAIN = "https://deadbydaylight.wiki.gg"
    API_URL = "https://deadbydaylight.wiki.gg/api.php"
    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30

    def __init__(self, base_dir: Path | None = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_dir = Path(base_dir)
        self.session = requests.Session(impersonate=self.IMPERSONATE_BROWSER)

    def fetch_page_html(self, page_title: str) -> str:
        params = {
            "action": "parse",
            "page": page_title,
            "prop": "text",
            "format": "json",
            "redirects": "1",
        }
        for attempt in range(4):
            try:
                response = self.session.get(
                    self.API_URL,
                    params=params,
                    verify=False,
                    timeout=self.REQUEST_TIMEOUT,
                )
                if response.status_code == 200:
                    data = response.json()
                    if "parse" in data and "text" in data["parse"]:
                        return data["parse"]["text"]["*"]

                if response.status_code == 429:
                    time.sleep(2.0 * (attempt + 1))
                    continue

                response.raise_for_status()
            except Exception as err:
                logger.warning(f"API fetch attempt {attempt + 1} for '{page_title}' failed: {err}")
                time.sleep(1.5)

        fallback_url = f"{self.BASE_DOMAIN}/wiki/{page_title}"
        res = self.session.get(fallback_url, verify=False, timeout=self.REQUEST_TIMEOUT)
        res.raise_for_status()
        return res.text

    def scrape_roster_from_page(self, page_title: str, role: str) -> list[CharacterData]:
        html_doc = self.fetch_page_html(page_title)
        soup = BeautifulSoup(html_doc, "html.parser")
        content = soup.find("div", class_="mw-parser-output") or soup

        characters: list[CharacterData] = []
        seen_slugs: set[str] = set()

        killer_meta_by_slug: dict[str, dict[str, Any]] = {}
        if role == "Killer":
            for cell in content.find_all(["td", "th"]):
                links = cell.find_all("a", href=re.compile(r"^/wiki/(?!File:|Category:|Special:).+"))
                text_links = [a for a in links if not a.find("img") and a.get_text(strip=True)]
                if len(text_links) >= 2:
                    power_tag = text_links[0]
                    killer_tag = text_links[1]
                    k_slug = extract_slug_from_href(killer_tag.get("href", "")).lower()
                    p_name = re.sub(
                        r"\[\s*edit\s*\]", "", power_tag.get_text(strip=True), flags=re.IGNORECASE
                    ).strip()
                    if k_slug and p_name:
                        killer_meta_by_slug[k_slug] = {
                            "power_name": p_name,
                            "power_desc": "",
                            "movement_speed": "4.6 m/s (115%)",
                            "terror_radius": "32 m",
                            "terror_radius_meters": 32,
                            "height": "Tall",
                        }

        for link in content.find_all("a", href=re.compile(r"^/wiki/")):
            href = link.get("href", "")
            slug = extract_slug_from_href(href)
            slug_lower = slug.lower()

            if not slug or slug_lower in seen_slugs:
                continue
            if slug.startswith(("Category:", "File:", "Special:", "Dead_by_Daylight", "Help:", "User:", "Template:", "Tome")):
                continue

            img = link.find("img")
            if not img:
                continue

            avatar_url = extract_high_res_url(img, self.BASE_DOMAIN)
            if not avatar_url:
                continue

            filename = avatar_url.split("/revision")[0].rstrip("/").split("/")[-1]
            match = PORTRAIT_PATTERN.search(filename)
            if not match:
                continue

            prefix_role = "Killer" if match.group(1).upper() == "K" else "Survivor"
            if prefix_role != role:
                continue

            release_num = int(match.group(2))
            code_prefix = f"{match.group(1).upper()}{match.group(2)}"

            raw_title = (link.get("title") or link.get_text() or "").strip().replace("_", " ")
            if not raw_title or len(raw_title) > 60:
                raw_title = slug.replace("_", " ")

            seen_slugs.add(slug_lower)
            sanitized = sanitize_filename(raw_title)
            sub_dir = "survivors" if role == "Survivor" else "killers"

            power_data = None
            if role == "Killer":
                k_meta = (
                    killer_meta_by_slug.get(slug_lower)
                    or killer_meta_by_slug.get(slug_lower.replace("the_", ""))
                    or killer_meta_by_slug.get(f"the_{slug_lower}")
                    or {}
                )
                if not k_meta:
                    for km_slug, km_val in killer_meta_by_slug.items():
                        if km_slug in slug_lower or slug_lower in km_slug:
                            k_meta = km_val
                            break

                power_name = k_meta.get("power_name") or ""
                power_data = KillerPowerData(
                    name=power_name,
                    description=k_meta.get("power_desc", ""),
                    movement_speed=k_meta.get("movement_speed", "4.6 m/s (115%)"),
                    terror_radius=k_meta.get("terror_radius", "32 m"),
                    terror_radius_meters=k_meta.get("terror_radius_meters", 32),
                    height=k_meta.get("height", "Tall"),
                )

            characters.append(
                CharacterData(
                    name=raw_title,
                    real_name=raw_title,
                    wiki_slug=slug,
                    short_name=slug_lower,
                    category=role,
                    avatar_url=avatar_url,
                    avatar_local_path=f"avatars/{sub_dir}/{sanitized}.png",
                    release_number=release_num,
                    code_prefix=code_prefix,
                    power=power_data,
                )
            )

        return characters

    def scrape_dlcs_from_wiki(self) -> list[dict[str, Any]]:
        dlcs: list[dict[str, Any]] = []
        seen_dlc_names = set()

        for page in ["Downloadable_Content", "Chapters"]:
            try:
                html_doc = self.fetch_page_html(page)
                soup = BeautifulSoup(html_doc, "html.parser")
                content = soup.find("div", class_="mw-parser-output") or soup

                for table in content.find_all("table", class_=re.compile(r"wikitable|article-table")):
                    rows = table.find_all("tr")
                    for tr in rows:
                        tds = tr.find_all("td")
                        if not tds:
                            continue

                        row_text = tr.get_text(separator=" ", strip=True)
                        date_str, year_num = parse_date_and_year(row_text)

                        links = tr.find_all("a", href=re.compile(r"^/wiki/"))
                        row_chars = []
                        dlc_name = ""
                        for a in links:
                            txt = a.get_text(strip=True)
                            if not txt or txt.startswith(("File:", "Special:", "Category:")):
                                continue
                            if any(k in txt.lower() for k in ["chapter", "paragraph", "pack"]):
                                if not dlc_name:
                                    dlc_name = txt
                            elif txt not in ["Killer", "Survivor", "Map", "DLC", "Base Game", "PTB"]:
                                row_chars.append(txt)

                        if dlc_name and dlc_name.lower() not in seen_dlc_names:
                            seen_dlc_names.add(dlc_name.lower())
                            is_licensed = (
                                "™" in dlc_name
                                or "®" in dlc_name
                                or "licensed" in row_text.lower()
                                or ("auric cells" in row_text.lower() and "iridescent" not in row_text.lower())
                            )
                            dlcs.append({
                                "dlc_name": dlc_name,
                                "release_date": date_str or "",
                                "release_year": year_num,
                                "is_licensed": is_licensed,
                                "characters": row_chars,
                            })

                is_under_licensed = False
                for node in content.find_all(["h2", "h3", "h4"]):
                    if node.name == "h2":
                        h2_txt = node.get_text(strip=True).lower()
                        if "licensed" in h2_txt:
                            is_under_licensed = True
                        elif "original" in h2_txt or "available" in h2_txt or "retired" in h2_txt:
                            is_under_licensed = False

                    if node.name in ["h3", "h4"]:
                        raw_title = (
                            node.get_text(strip=True)
                            .replace("[edit]", "")
                            .replace("â„¢", "™")
                            .replace("Â®", "®")
                            .strip()
                        )
                        if not raw_title or raw_title.lower() in [
                            "overview", "contents", "purchasing a dlc", "licensed dlcs",
                            "available dlcs", "chapters", "clothing packs", "character packs",
                            "original soundtrack", "retired dlcs", "chapter packs"
                        ]:
                            continue

                        date_str = ""
                        year_num = None
                        chars_added = []
                        is_licensed = is_under_licensed or "™" in raw_title or "®" in raw_title

                        curr = node.find_next_sibling()
                        while curr and curr.name not in ["h2", "h3", "h4"]:
                            txt = curr.get_text(separator=" ", strip=True)
                            d_parsed, y_parsed = parse_date_and_year(txt)
                            if d_parsed and not date_str:
                                date_str = d_parsed
                                year_num = y_parsed

                            if "auric cells" in txt.lower() and "iridescent" not in txt.lower():
                                is_licensed = True
                            elif "iridescent" in txt.lower():
                                is_licensed = False

                            for a in curr.find_all("a"):
                                c_name = a.get_text(strip=True)
                                if (
                                    c_name
                                    and c_name not in ["Main Article", "DLC", "Chapter", "Paragraph", "Killer", "Survivor", "Store Page", "Retired"]
                                    and not c_name.startswith(("File:", "Special:", "Category:"))
                                    and len(c_name) < 40
                                ):
                                    chars_added.append(c_name)

                            curr = curr.find_next_sibling()

                        if raw_title.lower() not in seen_dlc_names and (date_str or chars_added):
                            seen_dlc_names.add(raw_title.lower())
                            dlcs.append({
                                "dlc_name": raw_title,
                                "release_date": date_str,
                                "release_year": year_num,
                                "is_licensed": is_licensed,
                                "characters": chars_added,
                            })
            except Exception as e:
                logger.warning(f"Failed scraping DLC catalog from '{page}': {e}")

        return dlcs

    def enrich_characters_from_pages(self, characters: list[CharacterData]) -> None:
        def norm_key(text: str) -> str:
            if not text:
                return ""
            n = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8").lower()
            return re.sub(r"[^a-z0-9]", "", n)

        dlcs = self.scrape_dlcs_from_wiki()
        logger.info(f"Loaded {len(dlcs)} live DLC entries from wiki.gg")

        async def _fetch_all():
            async with AsyncSession(impersonate="chrome120", verify=False) as session:
                semaphore = asyncio.Semaphore(5)

                async def _fetch_one(char: CharacterData):
                    slug = char.wiki_slug or char.name.replace(" ", "_")
                    async with semaphore:
                        for attempt in range(3):
                            try:
                                await asyncio.sleep(0.05)
                                params = {
                                    "action": "parse",
                                    "page": slug,
                                    "prop": "text",
                                    "format": "json",
                                    "redirects": "1",
                                }
                                r = await session.get(self.API_URL, params=params, timeout=15, verify=False)
                                data = r.json()
                                if "error" in data:
                                    await asyncio.sleep(1.0)
                                    continue

                                html_raw = data.get("parse", {}).get("text", {}).get("*", "")
                                if not html_raw:
                                    return

                                soup = BeautifulSoup(html_raw, "html.parser")
                                content = soup.find("div", class_="mw-parser-output") or soup

                                real_name = ""
                                movement_speed = ""
                                terror_radius = ""
                                tr_meters = 32
                                height = ""
                                cost_text = ""
                                power_name = ""
                                power_desc = ""
                                power_icon_url = ""
                                infobox_dlc_text = ""
                                infobox_dlc_link = ""
                                infobox_release_date = ""

                                for tr in content.find_all("tr"):
                                    th = tr.find(["th", "td"], class_=lambda c: c and "title" in str(c).lower())
                                    td = tr.find(["td"], class_=lambda c: c and "value" in str(c).lower())
                                    if not (th and td):
                                        tds = tr.find_all(["th", "td"])
                                        if len(tds) >= 2:
                                            th, td = tds[0], tds[1]
                                    if th and td:
                                        t_txt = th.get_text(strip=True).lower()
                                        v_txt = td.get_text(separator=" ", strip=True)

                                        if t_txt in ["name", "real name"]:
                                            real_name = v_txt
                                        elif "movement speed" in t_txt and "alternate" not in t_txt:
                                            m_speed = re.search(
                                                r"(\d+(?:\.\d+)?)\s*%\s*[\|\(]?\s*(\d+(?:\.\d+)?)\s*m/s", v_txt
                                            )
                                            if not m_speed:
                                                m_speed = re.search(
                                                    r"(\d+(?:\.\d+)?)\s*m/s.*?(\d+(?:\.\d+)?)\s*%", v_txt
                                                )
                                                if m_speed:
                                                    movement_speed = f"{m_speed.group(1)} m/s ({m_speed.group(2)}%)"
                                            else:
                                                movement_speed = f"{m_speed.group(2)} m/s ({m_speed.group(1)}%)"
                                            if not movement_speed:
                                                movement_speed = v_txt
                                        elif "terror radius" in t_txt:
                                            terror_radius = v_txt
                                            m = re.search(r"(\d+)", terror_radius)
                                            if m:
                                                tr_meters = int(m.group(1))
                                        elif "height" in t_txt:
                                            height = v_txt
                                        elif "cost" in t_txt:
                                            cost_text = v_txt
                                        elif "power" in t_txt and "attack" not in t_txt and "trivia" not in t_txt:
                                            power_name = v_txt
                                        elif t_txt in ["dlc", "chapter"]:
                                            infobox_dlc_text = v_txt
                                            a_link = td.find("a")
                                            if a_link:
                                                infobox_dlc_link = extract_slug_from_href(a_link.get("href", ""))
                                        elif t_txt in ["release date", "released", "release"]:
                                            infobox_release_date = v_txt

                                intro_paragraphs = []
                                for p in content.find_all("p"):
                                    p_txt = p.get_text(separator=" ", strip=True)
                                    if len(p_txt) > 25 and ("introduced" in p_txt.lower() or "released" in p_txt.lower() or "featured in" in p_txt.lower()):
                                        intro_paragraphs.append(p_txt)

                                intro_full_text = " ".join(intro_paragraphs)

                                parsed_chapter_name = ""
                                parsed_chapter_number = ""
                                parsed_dlc_type = ""
                                parsed_release_date = ""
                                parsed_release_year = None

                                intro_match = re.search(
                                    r"introduced as (?:the|a)\s+(?:Killer|Survivor)\s+of\s+(?:the\s+)?([^,]+?),\s+a\s+([^,]+?)\s+released\s+(?:on|in)\s+([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+of)?\s+[0-9]{4}|[A-Za-z]+\s+[0-9]{1,2}(?:st|nd|rd|th)?,?\s+[0-9]{4}|[A-Za-z]+\s+[0-9]{4}|[0-9]{4})",
                                    intro_full_text,
                                    re.IGNORECASE,
                                )
                                if intro_match:
                                    raw_chap = intro_match.group(1).strip()
                                    parsed_dlc_type = intro_match.group(2).strip()
                                    date_raw = intro_match.group(3).strip()
                                    parsed_release_date, parsed_release_year = parse_date_and_year(date_raw)
                                    c_num, c_title = clean_chapter_title(raw_chap)
                                    parsed_chapter_number = c_num or ""
                                    parsed_chapter_name = c_title or raw_chap

                                if not parsed_release_date:
                                    if "base game" in intro_full_text.lower() or (char.release_number and char.release_number <= 4 and "chapter" not in intro_full_text.lower()):
                                        parsed_chapter_name = "Base Game"
                                        parsed_dlc_type = "base_game"
                                        d_p, y_p = parse_date_and_year(intro_full_text)
                                        parsed_release_date = d_p or "14 June 2016"
                                        parsed_release_year = y_p or 2016

                                if not parsed_release_date:
                                    d_p, y_p = parse_date_and_year(intro_full_text)
                                    if d_p:
                                        parsed_release_date = d_p
                                        parsed_release_year = y_p

                                if not parsed_release_date and infobox_release_date:
                                    d_p, y_p = parse_date_and_year(infobox_release_date)
                                    if d_p:
                                        parsed_release_date = d_p
                                        parsed_release_year = y_p

                                if not parsed_chapter_name and infobox_dlc_text:
                                    c_num, c_title = clean_chapter_title(infobox_dlc_text)
                                    parsed_chapter_number = c_num or ""
                                    parsed_chapter_name = c_title or infobox_dlc_text

                                if not parsed_release_date or not parsed_chapter_name:
                                    c_norm = norm_key(char.name)
                                    for d in dlcs:
                                        for ac in d.get("characters", []):
                                            ac_norm = norm_key(ac)
                                            if ac_norm == c_norm or (len(c_norm) >= 4 and (c_norm in ac_norm or ac_norm in c_norm)):
                                                if not parsed_chapter_name:
                                                    c_num, c_title = clean_chapter_title(d["dlc_name"])
                                                    parsed_chapter_number = c_num or ""
                                                    parsed_chapter_name = c_title or d["dlc_name"]
                                                if not parsed_release_date and d.get("release_date"):
                                                    parsed_release_date = d["release_date"]
                                                    parsed_release_year = d.get("release_year")
                                                if not parsed_dlc_type:
                                                    parsed_dlc_type = "Chapter DLC"
                                                break
                                        if parsed_release_date and parsed_chapter_name:
                                            break

                                if (not parsed_release_date or not parsed_release_year) and (infobox_dlc_link or parsed_chapter_name):
                                    chap_slug = infobox_dlc_link or parsed_chapter_name.replace(" ", "_")
                                    try:
                                        chap_params = {
                                            "action": "parse",
                                            "page": chap_slug,
                                            "prop": "text",
                                            "format": "json",
                                            "redirects": "1",
                                        }
                                        cr = await session.get(self.API_URL, params=chap_params, timeout=12, verify=False)
                                        cdata = cr.json()
                                        chtml = cdata.get("parse", {}).get("text", {}).get("*", "")
                                        if chtml:
                                            csoup = BeautifulSoup(chtml, "html.parser")
                                            for elem in csoup.find_all(["p", "tr"]):
                                                ctxt = elem.get_text(separator=" ", strip=True)
                                                cd_p, cy_p = parse_date_and_year(ctxt)
                                                if cd_p:
                                                    parsed_release_date = cd_p
                                                    parsed_release_year = cy_p
                                                    break
                                    except Exception:
                                        pass

                                is_licensed = False
                                if cost_text:
                                    if "auric cells" in cost_text.lower() and "iridescent" not in cost_text.lower():
                                        is_licensed = True
                                    elif "iridescent" in cost_text.lower():
                                        is_licensed = False

                                if not is_licensed and ("™" in char.name or "®" in char.name or "™" in parsed_chapter_name or "®" in parsed_chapter_name):
                                    is_licensed = True

                                if char.category == "Killer":
                                    for img in content.find_all("img"):
                                        alt = img.get("alt", "")
                                        src = img.get("src", "")
                                        if "iconpowers" in src.lower() or "iconpowers" in alt.lower() or "power" in alt.lower():
                                            power_icon_url = extract_high_res_url(img, self.BASE_DOMAIN)
                                            if not power_name and alt:
                                                power_name = alt.replace("IconPowers ", "").replace(".png", "").strip()
                                            break

                                    for h in content.find_all(["h2", "h3", "h4"]):
                                        htxt = h.get_text(strip=True).lower()
                                        if "power:" in htxt or "power" in htxt or "special ability" in htxt:
                                            p_elems = []
                                            curr = h.find_next_sibling()
                                            while curr and curr.name not in ["h2", "h3"]:
                                                if curr.name in ["p", "ul", "ol", "div"]:
                                                    txt = curr.get_text(separator=" ", strip=True)
                                                    if len(txt) > 20 and not txt.startswith("File:") and not txt.startswith("Main article"):
                                                        p_elems.append(txt)
                                                curr = curr.find_next_sibling()
                                            if p_elems:
                                                power_desc = clean_description_text("\n\n".join(p_elems[:5]))
                                                break

                                lore_text = ""
                                for h in content.find_all(["h2", "h3"]):
                                    htxt = h.get_text(strip=True).lower()
                                    if "lore" in htxt or "background" in htxt or "biography" in htxt:
                                        p_list = []
                                        curr = h.find_next_sibling()
                                        while curr and curr.name not in ["h2", "h3"]:
                                            if curr.name in ["p", "blockquote"]:
                                                txt = curr.get_text(separator=" ", strip=True)
                                                if len(txt) > 30 and not txt.startswith("File:") and not txt.startswith("Main article"):
                                                    p_list.append(clean_description_text(txt))
                                            curr = curr.find_next_sibling()
                                        if p_list:
                                            lore_text = "\n\n".join(p_list[:6])
                                            break

                                if real_name and real_name != char.name:
                                    char.real_name = real_name

                                char.chapter_name = parsed_chapter_name or "Base Game"
                                char.chapter_number = parsed_chapter_number or None
                                char.dlc_type = parsed_dlc_type or ("base_game" if char.chapter_name == "Base Game" else "Chapter DLC")
                                char.release_date = parsed_release_date or "14 June 2016"
                                char.release_year = parsed_release_year or 2016
                                char.is_licensed = is_licensed
                                char.lore = lore_text or None

                                if char.category == "Killer":
                                    p_name = power_name or (char.power.name if char.power else "")
                                    p_desc = power_desc or (char.power.description if char.power else "")
                                    p_icon = power_icon_url or (char.power.icon_url if char.power else "")
                                    p_speed = movement_speed or (char.power.movement_speed if char.power else "4.6 m/s (115%)")
                                    p_tr = terror_radius or (char.power.terror_radius if char.power else "32 m")
                                    p_height = height or (char.power.height if char.power else "Tall")

                                    char.power = KillerPowerData(
                                        name=p_name,
                                        description=p_desc,
                                        icon_url=p_icon,
                                        movement_speed=p_speed,
                                        terror_radius=p_tr,
                                        terror_radius_meters=tr_meters,
                                        height=p_height,
                                    )
                                return
                            except Exception as e:
                                if attempt == 2:
                                    logger.warning(f"Failed enriching character {slug}: {e}")
                                await asyncio.sleep(0.5 * (attempt + 1))

                tasks = [_fetch_one(c) for c in characters]
                await asyncio.gather(*tasks)

        try:
            asyncio.run(_fetch_all())
        except Exception as err:
            logger.error(f"Error in enrich_characters_from_pages: {err}")

        chapter_groups = defaultdict(list)
        for char in characters:
            if char.chapter_name and char.chapter_name.lower() != "base game":
                chapter_groups[norm_key(char.chapter_name)].append(char)

        for group in chapter_groups.values():
            if len(group) > 1:
                for c in group:
                    c.dlc_counterparts = safe_json_dumps([other.name for other in group if other.name != c.name], default_val="[]")

    def scrape_characters_dynamically(self) -> list[CharacterData]:
        logger.info("Fetching Survivors via MediaWiki API...")
        survivors = self.scrape_roster_from_page("Survivors", "Survivor")

        logger.info("Fetching Killers via MediaWiki API...")
        killers = self.scrape_roster_from_page("Killers", "Killer")

        all_characters = survivors + killers
        logger.info(f"Enriching all {len(all_characters)} characters with live infobox, chapter, licensing, and combat power details...")
        self.enrich_characters_from_pages(all_characters)

        logger.info(f"Discovered {len(all_characters)} characters ({len(survivors)} Survivors, {len(killers)} Killers).")
        return all_characters

    def parse_perks(self, html_content: str, characters: list[CharacterData]) -> list[PerkData]:
        soup = BeautifulSoup(html_content, "html.parser")
        perks_dict: dict[str, PerkData] = {}
        alias_backlog: dict[str, str] = {}
        current_category: str | None = None
        content_area = soup.find("div", class_="mw-parser-output") or soup

        char_by_key: dict[str, CharacterData] = {}
        for c in characters:
            keys = [c.name, c.real_name, c.wiki_slug, c.short_name]
            if c.name.startswith("The "):
                keys.append(c.name[4:])
            else:
                keys.append(f"The {c.name}")
            for k in keys:
                if k:
                    char_by_key[normalize_name_key(k)] = c

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                header_text = element.get_text().lower()
                if "survivor" in header_text:
                    current_category = "Survivor"
                elif "killer" in header_text:
                    current_category = "Killer"

            elif element.name == "table" and "wikitable" in element.get("class", []):
                if not current_category:
                    continue

                rows = element.find_all("tr")
                for row in rows[1:]:
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 3:
                        continue
                    try:
                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        perk_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                        if not perk_name:
                            continue

                        norm_perk = normalize_name_key(perk_name)

                        if norm_perk in GENERIC_PERK_CANONICAL_MAP:
                            canonical_target, alias_name = GENERIC_PERK_CANONICAL_MAP[norm_perk]
                            norm_target = normalize_name_key(canonical_target)
                            if norm_target in perks_dict:
                                perks_dict[norm_target].alternate_name = alias_name
                                perks_dict[norm_target].is_generic_counterpart = True
                            else:
                                alias_backlog[norm_target] = alias_name
                            continue

                        icon_tag = cells[0].find("img")
                        icon_url = extract_high_res_url(icon_tag, self.BASE_DOMAIN)

                        cell_copy = BeautifulSoup(str(cells[2]), "html.parser")
                        for bold in cell_copy.find_all(["b", "strong"]):
                            bold.replace_with(f"**{bold.get_text().strip()}**")
                        for italic in cell_copy.find_all(["i", "em"]):
                            italic.replace_with(f"*{italic.get_text().strip()}*")
                        for li in cell_copy.find_all("li"):
                            li.replace_with(f"\n* {li.get_text().strip()}")
                        for br in cell_copy.find_all("br"):
                            br.replace_with("\n")
                        lines = [line.strip() for line in cell_copy.get_text().splitlines()]
                        raw_description = "\n".join(line for line in lines if line)
                        description = clean_description_text(raw_description)

                        canonical_name = "General"
                        real_name = "General"
                        avatar_path = ""

                        if len(cells) >= 4:
                            owner_cell = cells[3]
                            owner_link = owner_cell.find("a")

                            matched = None
                            if owner_link:
                                href = owner_link.get("href", "")
                                link_title = owner_link.get("title", "").strip()
                                slug = extract_slug_from_href(href)
                                matched = (
                                    char_by_key.get(normalize_name_key(slug))
                                    or char_by_key.get(normalize_name_key(link_title))
                                    or char_by_key.get(normalize_name_key(owner_link.get_text()))
                                )

                            if not matched:
                                raw_text = owner_cell.get_text().strip()
                                clean_text = re.sub(r"^[.\s\-–]+|[.\s\-–]+$", "", raw_text).strip()
                                if clean_text and normalize_name_key(clean_text) not in ["all", "general", "none", "", "all survivors", "all killers"]:
                                    matched = char_by_key.get(normalize_name_key(clean_text))

                            if matched:
                                canonical_name = matched.name
                                real_name = matched.real_name
                                avatar_path = matched.avatar_local_path

                        sanitized_name = sanitize_filename(perk_name)
                        category_dir = "survivors" if current_category == "Survivor" else "killers"

                        if canonical_name == "General":
                            local_rel_path = f"icons/{category_dir}/General/{sanitized_name}.png"
                        else:
                            local_rel_path = f"icons/{category_dir}/{canonical_name}/{sanitized_name}.png"

                        norm_key_str = normalize_name_key(perk_name)
                        alternate_name = alias_backlog.get(norm_key_str)
                        is_generic = alternate_name is not None

                        perks_dict[norm_key_str] = PerkData(
                            name=perk_name,
                            character=canonical_name,
                            character_real_name=real_name,
                            character_avatar_path=avatar_path,
                            category=current_category,
                            description=description,
                            icon_url=icon_url,
                            icon_local_path=local_rel_path,
                            alternate_name=alternate_name,
                            is_generic_counterpart=is_generic,
                        )
                    except Exception:
                        continue

        return list(perks_dict.values())

    def parse_wiki_items(self, html_content: str) -> list[ItemData]:
        soup = BeautifulSoup(html_content, "html.parser")
        items: list[ItemData] = []
        content_area = soup.find("div", class_="mw-parser-output") or soup
        current_category = "Survivor"
        current_section = ""
        seen_items = set()

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                htext = element.get_text().lower()
                current_section = htext
                if "killer" in htext:
                    current_category = "Killer"
                elif "survivor" in htext:
                    current_category = "Survivor"

            elif element.name == "table" and "wikitable" in element.get("class", []):
                rows = element.find_all("tr")
                for row in rows[1:]:
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 2:
                        continue
                    try:
                        img_tag = cells[0].find("img")
                        icon_url = extract_high_res_url(img_tag, self.BASE_DOMAIN)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        item_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                        if not item_name:
                            continue

                        name_lower = item_name.lower().strip()
                        if name_lower.endswith(" items") or name_lower.endswith(" add-ons") or "uncommon items" in name_lower:
                            continue

                        norm_item = normalize_name_key(item_name)
                        if norm_item in seen_items:
                            continue
                        seen_items.add(norm_item)

                        description = ""
                        if len(cells) >= 4:
                            description = cells[3].get_text(separator="\n", strip=True)
                        elif len(cells) == 3:
                            description = cells[2].get_text(separator="\n", strip=True)

                        rarity = extract_rarity_from_elements(cells, img_tag=img_tag, section_context=current_section)
                        description = clean_description_text(description)
                        sanitized = sanitize_filename(item_name)
                        local_path = f"icons/items/{sanitized}.png"

                        name_low = item_name.lower().strip()
                        is_event = (
                            rarity.lower() == "event"
                            or any(
                                k in name_low
                                for k in [
                                    "anniversary",
                                    "banquet",
                                    "masquerade",
                                    "lunchbox",
                                    "will o' wisp",
                                    "party starter",
                                    "chinese firecracker",
                                    "festive toolbox",
                                ]
                            )
                        )
                        is_fog_vial = "fog vial" in name_low
                        is_trial = (
                            name_low
                            in [
                                "first aid spray",
                                "vaccine",
                                "emp",
                                "remote flame turret",
                                "pocket mirror",
                                "lament configuration",
                                "hand of vecna",
                                "eye of vecna",
                                "flash grenade",
                                "candelabra",
                                "antidote",
                                "keycard",
                                "vhs tape",
                                "void crystal",
                                "glowing fungus",
                                "blood can",
                                "fragile mirror",
                                "searcher's pendant",
                                "fog crystal",
                            ]
                            or any(
                                k in name_low
                                for k in [
                                    "spray",
                                    "vaccine",
                                    "turret",
                                    "lament",
                                    "vecna",
                                    "keycard",
                                    "candelabra",
                                    "lantern",
                                    "vhs tape",
                                    "blood can",
                                    "crystal",
                                    "mirror",
                                    "fungus",
                                    "pendant",
                                    "antidote",
                                    "emp",
                                ]
                            )
                        )

                        if is_event:
                            item_category = "Event"
                            item_role = "Survivor"
                            rarity = "Event"
                        elif is_fog_vial:
                            item_category = "Fog Vial"
                            item_role = "Survivor"
                        elif is_trial:
                            item_category = "Trial Artifact"
                            item_role = "Survivor"
                        elif "med-kit" in name_low or "aid kit" in name_low:
                            item_category = "Med-Kit"
                            item_role = "Survivor"
                        elif "toolbox" in name_low or "tools" in name_low:
                            item_category = "Toolbox"
                            item_role = "Survivor"
                        elif "flashlight" in name_low:
                            item_category = "Flashlight"
                            item_role = "Survivor"
                        elif "key" in name_low:
                            item_category = "Key"
                            item_role = "Survivor"
                        elif "map" in name_low:
                            item_category = "Map"
                            item_role = "Survivor"
                        elif "firecracker" in name_low:
                            item_category = "Firecracker"
                            item_role = "Survivor"
                        else:
                            item_category = current_category
                            item_role = current_category

                        items.append(
                            ItemData(
                                name=item_name,
                                category=item_category,
                                role=item_role,
                                description=description,
                                icon_url=icon_url,
                                icon_local_path=local_path,
                                rarity=rarity,
                            )
                        )
                    except Exception:
                        continue
        return items

    def parse_wiki_addons(self, html_content: str, characters: list[CharacterData] | None = None) -> list[AddonData]:
        soup = BeautifulSoup(html_content, "html.parser")
        raw_addons: list[dict] = []
        content_area = soup.find("div", class_="mw-parser-output") or soup
        current_target = "General"
        current_category = "Survivor"
        current_section = ""

        dynamic_power_to_killer: dict[str, str] = {}
        if characters:
            for c in characters:
                if c.category == "Killer" or getattr(c, "role", "") == "Killer":
                    dynamic_power_to_killer[normalize_name_key(c.name)] = c.name
                    dynamic_power_to_killer[normalize_name_key(c.name.replace("The ", ""))] = c.name
                    if c.real_name:
                        dynamic_power_to_killer[normalize_name_key(c.real_name)] = c.name
                    if c.wiki_slug:
                        dynamic_power_to_killer[normalize_name_key(c.wiki_slug)] = c.name
                    if c.short_name:
                        dynamic_power_to_killer[normalize_name_key(c.short_name)] = c.name
                    if c.power and c.power.name:
                        p_norm = normalize_name_key(c.power.name)
                        dynamic_power_to_killer[p_norm] = c.name

        for k, v in KNOWN_KILLER_POWER_ALIASES.items():
            if k not in dynamic_power_to_killer:
                dynamic_power_to_killer[k] = v

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                headline = element.find(class_=re.compile(r"mw-headline"))
                raw_header = headline.get_text(strip=True) if headline else element.get_text(strip=True)
                cleaned_header = re.sub(r"\[\s*edit\s*\]", "", raw_header, flags=re.IGNORECASE).strip()
                current_section = cleaned_header.lower()

                if "killer" in current_section:
                    current_category = "Killer"
                elif "survivor" in current_section:
                    current_category = "Survivor"

                target_clean = re.sub(r"\s+(?:Add-ons|Addons|Add-on|Addon)$", "", cleaned_header, flags=re.IGNORECASE).strip()
                if target_clean and target_clean.lower() not in [
                    "survivor", "killer", "general", "common", "uncommon", "rare",
                    "very rare", "ultra rare", "decommissioned", "unused", "event"
                ]:
                    norm_target = normalize_name_key(target_clean)
                    matched_killer = dynamic_power_to_killer.get(norm_target)
                    if not matched_killer:
                        for p_key, k_name in dynamic_power_to_killer.items():
                            if p_key and (p_key == norm_target or p_key in norm_target.split()):
                                matched_killer = k_name
                                break

                    current_target = matched_killer if matched_killer else target_clean

            elif element.name == "table" and "wikitable" in element.get("class", []):
                if current_section in ["contents", "overview", "stacking", "numbers", "change log"]:
                    continue

                intro_target = None
                p_prev = element.find_previous_sibling()
                while p_prev and getattr(p_prev, "name", None) not in ["h1", "h2", "h3", "h4", "table"]:
                    txt = p_prev.get_text()
                    m = re.search(r"is the Power of (?:The\s+)?([^.]+)", txt, re.IGNORECASE)
                    if m:
                        candidate_killer = m.group(1).strip()
                        norm_cand = normalize_name_key(candidate_killer)
                        matched_k = dynamic_power_to_killer.get(norm_cand) or dynamic_power_to_killer.get("the " + norm_cand)
                        if matched_k:
                            intro_target = matched_k
                            break
                    p_prev = p_prev.find_previous_sibling()

                table_target = intro_target or current_target

                rows = element.find_all("tr")[1:]
                row_count = len(rows)
                for row_idx, row in enumerate(rows):
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 2:
                        continue
                    try:
                        img_tag = cells[0].find("img")
                        icon_url = extract_high_res_url(img_tag, self.BASE_DOMAIN)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        addon_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                        if not addon_name:
                            continue

                        description = ""
                        if len(cells) >= 4:
                            description = extract_cell_markdown_text(cells[3])
                        elif len(cells) == 3:
                            description = extract_cell_markdown_text(cells[2])

                        rarity = extract_rarity_from_elements(cells, img_tag=img_tag, section_context=current_section)

                        if rarity == "Common" and row_count == 20:
                            if row_idx < 4:
                                rarity = "Common"
                            elif row_idx < 9:
                                rarity = "Uncommon"
                            elif row_idx < 14:
                                rarity = "Rare"
                            elif row_idx < 18:
                                rarity = "Very Rare"
                            else:
                                rarity = "Ultra Rare"

                        raw_addons.append({
                            "name": addon_name,
                            "target": table_target,
                            "category": current_category,
                            "description": description,
                            "icon_url": icon_url,
                            "rarity": rarity,
                        })
                    except Exception:
                        continue

        name_target_counts = defaultdict(set)
        for a in raw_addons:
            name_target_counts[normalize_name_key(a["name"])].add(normalize_name_key(a["target"]))

        addons: list[AddonData] = []
        seen_unique_names = set()
        for a in raw_addons:
            addon_name = a["name"]
            target = a["target"]

            if "serum" in addon_name.lower():
                if a["category"] == "Survivor" or "survivor" in str(target).lower():
                    target = "Special"

            display_name = f"{addon_name} ({target})" if len(name_target_counts[normalize_name_key(addon_name)]) > 1 else addon_name

            norm_unique = normalize_name_key(display_name)
            if norm_unique in seen_unique_names:
                continue
            seen_unique_names.add(norm_unique)

            sanitized = sanitize_filename(display_name)
            local_path = f"icons/addons/{sanitized}.png"

            addons.append(
                AddonData(
                    name=display_name,
                    associated_target=target,
                    category=a["category"],
                    description=a["description"],
                    icon_url=a["icon_url"],
                    icon_local_path=local_path,
                    rarity=a["rarity"],
                )
            )

        return addons

    def scrape_addons_from_character_page(self, char: CharacterData) -> list[AddonData]:
        candidate_slugs = []
        if char.wiki_slug:
            candidate_slugs.append(char.wiki_slug)
        if char.name:
            candidate_slugs.append(char.name.replace(" ", "_"))
        if char.real_name:
            candidate_slugs.append(char.real_name.replace(" ", "_"))
        if "slasher" in char.name.lower():
            candidate_slugs.append("Jason_Voorhees")
        if "judgment" in char.name.lower():
            candidate_slugs.append("The_Judgment")

        html_content = ""
        for s in candidate_slugs:
            try:
                content = self.fetch_page_html(s)
                if content and "add-on" in content.lower():
                    html_content = content
                    break
            except Exception:
                continue

        if not html_content:
            return []

        soup = BeautifulSoup(html_content, "html.parser")
        content_area = soup.find("div", class_="mw-parser-output") or soup
        addons: list[AddonData] = []
        target = char.name
        current_section = ""

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                current_section = element.get_text().strip().lower()
            elif element.name == "table" and "wikitable" in element.get("class", []):
                if "add-on" in current_section or "addon" in current_section:
                    rows = element.find_all("tr")[1:]
                    row_count = len(rows)
                    for row_idx, row in enumerate(rows):
                        cells = row.find_all(["td", "th"])
                        if len(cells) < 2:
                            continue
                        try:
                            img_tag = cells[0].find("img")
                            icon_url = extract_high_res_url(img_tag, self.BASE_DOMAIN)
                            name_cell = cells[1]
                            name_link = name_cell.find("a")
                            addon_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                            if not addon_name:
                                continue

                            description = ""
                            if len(cells) >= 4:
                                description = extract_cell_markdown_text(cells[3])
                            elif len(cells) == 3:
                                description = extract_cell_markdown_text(cells[2])

                            rarity = extract_rarity_from_elements(cells, img_tag=img_tag, section_context=current_section)
                            if rarity == "Common" and row_count == 20:
                                if row_idx < 4:
                                    rarity = "Common"
                                elif row_idx < 9:
                                    rarity = "Uncommon"
                                elif row_idx < 14:
                                    rarity = "Rare"
                                elif row_idx < 18:
                                    rarity = "Very Rare"
                                else:
                                    rarity = "Ultra Rare"

                            display_name = f"{addon_name} ({target})"
                            sanitized = sanitize_filename(display_name)
                            local_path = f"icons/addons/{sanitized}.png"

                            addons.append(
                                AddonData(
                                    name=display_name,
                                    associated_target=target,
                                    category="Killer",
                                    description=description,
                                    icon_url=icon_url,
                                    icon_local_path=local_path,
                                    rarity=rarity,
                                )
                            )
                        except Exception:
                            continue
        return addons

    def parse_wiki_offerings(self, html_content: str) -> list[OfferingData]:
        soup = BeautifulSoup(html_content, "html.parser")
        offerings: list[OfferingData] = []
        seen_offerings: set[str] = set()

        HEADING_ROLE: dict[str, str] = {
            "survivor": "Survivor",
            "altruism": "Survivor",
            "boldness": "Survivor",
            "objectives": "Survivor",
            "survival": "Survivor",
            "luck": "Survivor",
            "killer": "Killer",
            "brutality": "Killer",
            "deviousness": "Killer",
            "hunter": "Killer",
            "sacrifice": "Killer",
            "memento_mori": "Killer",
        }

        def role_from_heading(heading_id: str) -> str:
            return HEADING_ROLE.get(heading_id.lower().replace("-", "_"), "All")

        def nearest_section_role(tag) -> str:
            for ancestor in [tag] + list(tag.parents):
                for sibling in ancestor.find_all_previous(["h2", "h3", "h4", "h5"]):
                    span = sibling.find("span", class_="mw-headline")
                    if span:
                        hid = span.get("id", "").lower().replace("-", "_")
                        return role_from_heading(hid)
                    hid = sibling.get("id", "").lower().replace("-", "_")
                    if hid:
                        return role_from_heading(hid)
            return "All"

        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src") or ""
            if "IconFavors_" in src or "IconsFavors_" in src or "IconFavor_" in src:
                row = img.find_parent("tr")
                if not row:
                    continue
                cells = row.find_all(["td", "th"])
                off_name = ""
                for c in cells:
                    links = c.find_all("a")
                    for l in links:
                        txt = l.get_text(strip=True)
                        if txt and not txt.startswith("File:") and len(txt) > 1:
                            off_name = txt
                            break
                    if off_name:
                        break
                if not off_name and len(cells) > 1:
                    off_name = cells[1].get_text(strip=True)
                if not off_name:
                    off_name = img.get("alt", "").replace(".png", "").replace("IconFavors_", "").replace("IconsFavors_", "").strip()

                if not off_name or off_name.lower().startswith("category:"):
                    continue

                norm_key = normalize_name_key(off_name)
                if norm_key in seen_offerings:
                    continue
                seen_offerings.add(norm_key)

                icon_url = extract_high_res_url(img, self.BASE_DOMAIN)
                description = ""
                if len(cells) >= 4:
                    description = cells[3].get_text(separator="\n", strip=True)
                elif len(cells) == 3:
                    description = cells[2].get_text(separator="\n", strip=True)
                elif len(cells) == 2:
                    description = cells[1].get_text(separator="\n", strip=True)

                rarity = extract_rarity_from_elements(cells, img_tag=img)
                description = clean_description_text(description)
                sanitized = sanitize_filename(off_name)
                local_path = f"icons/offerings/{sanitized}.png"

                role = nearest_section_role(row)
                if role == "All":
                    raw_desc = row.get_text().lower()
                    survivors_only = (
                        "to all survivors" in raw_desc
                        or "all survivor" in raw_desc
                    ) and "killer" not in raw_desc
                    killers_only = (
                        "to the killer" in raw_desc
                        or "to all killers" in raw_desc
                        or "killer only" in raw_desc
                    ) and "survivor" not in raw_desc
                    if survivors_only:
                        role = "Survivor"
                    elif killers_only:
                        role = "Killer"

                row_text = row.get_text().lower()
                category = "Offering"
                if "mori" in row_text:
                    category = "Memento Mori"
                elif "bloodpoint" in row_text or "point" in row_text:
                    category = "Bloodpoints"
                elif "shroud" in row_text:
                    category = "Shroud"
                elif "ward" in row_text:
                    category = "Ward"
                elif "luck" in row_text or "salt" in row_text or "chalk" in row_text:
                    category = "Luck"
                elif "chest" in row_text or "fog" in row_text or "oak" in row_text or "blueprint" in row_text:
                    category = "Map Modifications"
                name_lower = off_name.lower()
                if (
                    rarity == "Event"
                    or "dousing" in name_lower
                    or "dowsing" in name_lower
                    or "cobbler" in name_lower
                    or "terrormisu" in name_lower
                    or "flan" in name_lower
                    or "torte" in name_lower
                    or "scream pie" in name_lower
                    or "gateau" in name_lower
                    or "sacrificial cake" in name_lower
                    or "cursed seed" in name_lower
                    or "pustula" in name_lower
                    or "bbq" in name_lower
                    or "red envelope" in name_lower
                    or "bloodshot eye" in name_lower
                ):
                    category = "Special"

                offerings.append(
                    OfferingData(
                        name=off_name,
                        category=category,
                        role=role,
                        description=description,
                        icon_url=icon_url,
                        icon_local_path=local_path,
                        rarity=rarity,
                    )
                )

        return offerings

    def scrape_offerings(self) -> list[OfferingData]:
        try:
            logger.info("Fetching Offerings...")
            html_offerings = self.fetch_page_html("Offerings")
            return self.parse_wiki_offerings(html_offerings)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg offerings: {e}")
            return []

    def scrape_all(
        self,
    ) -> tuple[list[CharacterData], list[PerkData], list[ItemData], list[AddonData], list[OfferingData]]:
        logger.info("Scraping deadbydaylight.wiki.gg dynamic data via MediaWiki API...")
        characters = self.scrape_characters_dynamically()

        logger.info("Fetching Perks...")
        html_perks = self.fetch_page_html("Perks")
        perks = self.parse_perks(html_perks, characters)

        try:
            logger.info("Fetching Items...")
            html_items = self.fetch_page_html("Items")
            items = self.parse_wiki_items(html_items)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg items: {e}")
            items = []

        try:
            logger.info("Fetching Add-ons...")
            html_addons = self.fetch_page_html("Add-ons")
            addons = self.parse_wiki_addons(html_addons, characters)

            known_covered_killers = {
                normalize_name_key(a.associated_target) for a in addons if a.associated_target
            }
            if characters:
                for c in characters:
                    if getattr(c, "category", "") == "Killer" or getattr(c, "role", "") == "Killer":
                        c_norm = normalize_name_key(c.name)
                        c_norm_no_the = normalize_name_key(c.name.replace("The ", ""))
                        if c_norm not in known_covered_killers and c_norm_no_the not in known_covered_killers:
                            char_addons = self.scrape_addons_from_character_page(c)
                            if char_addons:
                                logger.info(f"Enriched {len(char_addons)} add-ons from dedicated page for {c.name}")
                                addons.extend(char_addons)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg addons: {e}")
            addons = []

        try:
            logger.info("Fetching Offerings...")
            offerings = self.scrape_offerings()
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg offerings: {e}")
            offerings = []

        return characters, perks, items, addons, offerings
```

### backend/app/scrapers/drivers/__init__.py
```python
from __future__ import annotations

import logging
from app.scrapers.drivers.base import BaseWikiDriver
from app.scrapers.drivers.de import WikiGGDriverDE
from app.scrapers.drivers.en import (
    PORTRAIT_PATTERN,
    WikiGGDriverEN,
    clean_chapter_title,
    extract_icon_token,
    extract_rarity_from_elements,
    parse_date_and_year,
)
from app.scrapers.drivers.es import WikiGGDriverES
from app.scrapers.drivers.fr import WikiGGDriverFR
from app.scrapers.drivers.it import WikiGGDriverIT
from app.scrapers.drivers.ja import WikiGGDriverJP
from app.scrapers.drivers.pl import WikiGGDriverPL
from app.scrapers.types import AddonData, CharacterData, ItemData, OfferingData, PerkData

logger = logging.getLogger(__name__)

LANGUAGE_DRIVERS: dict[str, type[BaseWikiDriver]] = {
    "en": WikiGGDriverEN,
    "pl": WikiGGDriverPL,
    "de": WikiGGDriverDE,
    "es": WikiGGDriverES,
    "ja": WikiGGDriverJP,
    "jp": WikiGGDriverJP,
    "fr": WikiGGDriverFR,
    "it": WikiGGDriverIT,
}


class WikiGGScraperDriver(WikiGGDriverEN):
    """Unified multi-language Dead by Daylight wiki.gg scraper orchestrator."""

    def fetch_lang_page_html(self, lang: str, page_title: str) -> str:
        lang_key = lang.lower().strip()
        driver_cls = LANGUAGE_DRIVERS.get(lang_key)
        if driver_cls and driver_cls is not WikiGGDriverEN:
            driver = driver_cls(base_dir=self.base_dir)
            return driver.fetch_page_html(page_title)
        return self.fetch_page_html(page_title)

    def scrape_translations(
        self,
        characters: list[CharacterData],
        perks: list[PerkData],
        items: list[ItemData],
        addons: list[AddonData],
        languages: str | list[str] | None = None,
    ) -> None:
        for p in perks:
            if "en" not in p.translations and p.description:
                p.translations["en"] = {"name": p.name, "description": p.description}
        for c in characters:
            if "en" not in c.translations:
                p_name = c.power.name if c.power else ""
                p_desc = c.power.description if c.power else ""
                c.translations["en"] = {
                    "name": c.name,
                    "lore": c.lore or "",
                    "chapter_name": c.chapter_name or "",
                    "power_name": p_name,
                    "power_description": p_desc,
                }
        for i in items:
            if "en" not in i.translations and i.description:
                i.translations["en"] = {"name": i.name, "description": i.description}
        for a in addons:
            if "en" not in a.translations and a.description:
                a.translations["en"] = {"name": a.name, "description": a.description}

        if languages == "all" or languages is None:
            target_langs = ["pl", "de", "es", "ja", "fr", "it"]
        elif isinstance(languages, list):
            target_langs = [l for l in languages if l.lower() != "en"]
        else:
            target_langs = []

        for lang in target_langs:
            lang_key = lang.lower().strip()
            driver_cls = LANGUAGE_DRIVERS.get(lang_key)
            if not driver_cls or driver_cls is WikiGGDriverEN:
                continue

            try:
                driver_instance = driver_cls(base_dir=self.base_dir)
                if hasattr(self, "fetch_lang_page_html") and callable(self.fetch_lang_page_html):
                    driver_instance.fetch_page_html = lambda p, l=lang_key: self.fetch_lang_page_html(l, p)
                if hasattr(driver_instance, "enrich_translations"):
                    driver_instance.enrich_translations(characters, perks, items, addons)
            except Exception as e:
                logger.warning(f"Failed running translation driver for '{lang_key}': {e}")

    def scrape_all(
        self,
        languages: str | list[str] | None = None,
    ) -> tuple[list[CharacterData], list[PerkData], list[ItemData], list[AddonData], list[OfferingData]]:
        characters, perks, items, addons, offerings = super().scrape_all()

        if languages:
            try:
                self.scrape_translations(characters, perks, items, addons, languages=languages)
            except Exception as e:
                logger.warning(f"Error during multi-language translation enrichment: {e}")

        return characters, perks, items, addons, offerings


__all__ = [
    "BaseWikiDriver",
    "WikiGGDriverEN",
    "WikiGGDriverPL",
    "WikiGGDriverDE",
    "WikiGGDriverES",
    "WikiGGDriverJP",
    "WikiGGDriverFR",
    "WikiGGDriverIT",
    "WikiGGScraperDriver",
    "LANGUAGE_DRIVERS",
    "PORTRAIT_PATTERN",
    "extract_icon_token",
    "extract_rarity_from_elements",
    "clean_chapter_title",
    "parse_date_and_year",
]
```

### backend/app/scrapers/drivers/base.py
```python
from __future__ import annotations

import logging
import re
import time
from pathlib import Path
from typing import Any
from urllib.parse import unquote
from curl_cffi import requests

from app.scrapers.types import AddonData, CharacterData, ItemData, PerkData
from app.scrapers.utils import (
    normalize_name_key,
)

logger = logging.getLogger(__name__)

PORTRAIT_PATTERN = re.compile(r"(?:^|/)(K|S)(\d+)[-_]", re.IGNORECASE)


def extract_icon_token(src_or_alt: str) -> str:
    if not src_or_alt:
        return ""
    m = re.search(r"(?:Full_)?Icon(?:Perks|Items|Addons|Addon|Powers|Help)_([^./?]+)", src_or_alt, re.IGNORECASE)
    if m:
        return re.sub(r"[^a-zA-Z0-9]", "", m.group(1)).lower()
    m2 = re.search(r"(?:^|/)(K|S)(\d+)[-_]", src_or_alt, re.IGNORECASE)
    if m2:
        return f"{m2.group(1).upper()}{int(m2.group(2)):02d}"
    fn = src_or_alt.split("/")[-1].split(".")[0]
    fn = re.sub(r"^\d+px-", "", fn, flags=re.IGNORECASE)
    fn = re.sub(r"^(?:Full_)?(?:Icon(?:Addon|Addons|Items|Perks|Powers)_)?", "", fn, flags=re.IGNORECASE)
    return re.sub(r"[^a-zA-Z0-9]", "", fn).lower()


class BaseWikiDriver:
    """Base driver providing network session, retries, and helper utilities for wiki.gg scraping."""

    BASE_DOMAIN: str = "https://deadbydaylight.wiki.gg"
    IMPERSONATE_BROWSER: str = "chrome120"
    REQUEST_TIMEOUT: int = 30

    def __init__(self, base_dir: Path | None = None, lang_code: str = "en"):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
        self.base_dir = Path(base_dir)
        self.lang_code = lang_code.lower().strip()
        self.session = requests.Session(impersonate=self.IMPERSONATE_BROWSER)

    @property
    def api_url(self) -> str:
        if self.lang_code == "en":
            return f"{self.BASE_DOMAIN}/api.php"
        return f"{self.BASE_DOMAIN}/{self.lang_code}/api.php"

    def fetch_page_html(self, page_title: str) -> str:
        """Fetches and parses a page via MediaWiki API with retry and HTML fallback."""
        clean_title = unquote(page_title)
        params = {
            "action": "parse",
            "page": clean_title,
            "prop": "text",
            "format": "json",
            "redirects": "1",
            "disableeditsection": 1,
            "disabletoc": 1,
        }
        for attempt in range(4):
            try:
                response = self.session.get(
                    self.api_url,
                    params=params,
                    verify=False,
                    timeout=self.REQUEST_TIMEOUT,
                )
                if response.status_code == 200:
                    data = response.json()
                    if "parse" in data and "text" in data["parse"]:
                        return data["parse"]["text"]["*"]
                    if "error" in data:
                        logger.debug(f"MediaWiki parse error on {self.lang_code}/{clean_title}: {data.get('error')}")
                        return ""

                if response.status_code == 429:
                    time.sleep(2.0 * (attempt + 1))
                    continue

                response.raise_for_status()
            except Exception as err:
                logger.debug(f"[{self.lang_code}] API fetch attempt {attempt + 1} for '{clean_title}' failed: {err}")
                time.sleep(1.5)

        fallback_url = (
            f"{self.BASE_DOMAIN}/wiki/{clean_title}"
            if self.lang_code == "en"
            else f"{self.BASE_DOMAIN}/{self.lang_code}/wiki/{clean_title}"
        )
        try:
            res = self.session.get(fallback_url, verify=False, timeout=self.REQUEST_TIMEOUT)
            if res.status_code == 200:
                return res.text
        except Exception as e:
            logger.debug(f"[{self.lang_code}] Fallback fetch for '{clean_title}' failed: {e}")

        return ""

    def build_lookup_indexes(
        self,
        characters: list[CharacterData],
        perks: list[PerkData],
        items: list[ItemData],
        addons: list[AddonData],
    ) -> dict[str, dict[str, Any]]:
        """Constructs fast icon token and normalized name lookups for enrichment."""
        perks_by_token: dict[str, PerkData] = {}
        for p in perks:
            tok = extract_icon_token(p.icon_url or p.icon_local_path)
            if tok:
                perks_by_token[tok] = p
            perks_by_token[normalize_name_key(p.name)] = p

        chars_by_token: dict[str, CharacterData] = {}
        for c in characters:
            if c.code_prefix and c.release_number:
                chars_by_token[f"{c.code_prefix.upper()}{c.release_number:02d}"] = c
            tok = extract_icon_token(c.avatar_url or c.avatar_local_path)
            if tok:
                chars_by_token[tok] = c
            chars_by_token[normalize_name_key(c.name)] = c
            if c.real_name:
                chars_by_token[normalize_name_key(c.real_name)] = c

        items_by_token: dict[str, ItemData] = {}
        for i in items:
            tok = extract_icon_token(i.icon_url or i.icon_local_path)
            if tok:
                items_by_token[tok] = i
            items_by_token[normalize_name_key(i.name)] = i

        addons_by_token: dict[str, AddonData] = {}
        for a in addons:
            tok = extract_icon_token(a.icon_url or a.icon_local_path)
            if tok:
                addons_by_token[tok] = a
            addons_by_token[normalize_name_key(a.name)] = a

        return {
            "perks": perks_by_token,
            "characters": chars_by_token,
            "items": items_by_token,
            "addons": addons_by_token,
        }
```

### backend/app/scrapers/drivers/en.py
```python
from __future__ import annotations

import asyncio
import html
import logging
import re
import time
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any
from bs4 import BeautifulSoup, Tag
from curl_cffi import requests
from curl_cffi.requests import AsyncSession

from app.core.json_provider import safe_json_dumps
from app.scrapers.constants import GENERIC_PERK_CANONICAL_MAP, KNOWN_KILLER_POWER_ALIASES
from app.scrapers.types import AddonData, CharacterData, ItemData, KillerPowerData, OfferingData, PerkData
from app.scrapers.utils import (
    clean_description_text,
    extract_high_res_url,
    extract_slug_from_href,
    normalize_name_key,
    sanitize_filename,
)

logger = logging.getLogger(__name__)

PORTRAIT_PATTERN = re.compile(r"(?:^|/)(K|S)(\d+)[-_]", re.IGNORECASE)

MONTHS_REGEX_STR = (
    r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
)

DATE_CLEAN_REGEX = re.compile(
    rf"\b([0-9]{{1,2}})(?:st|nd|rd|th)?\s+(?:of\s+)?({MONTHS_REGEX_STR})\s+(?:of\s+)?(20[1-3][0-9])\b",
    re.IGNORECASE,
)

DATE_MDY_REGEX = re.compile(
    rf"\b({MONTHS_REGEX_STR})\s+([0-9]{{1,2}})(?:st|nd|rd|th)?,?\s+(?:of\s+)?(20[1-3][0-9])\b",
    re.IGNORECASE,
)

YEAR_ONLY_REGEX = re.compile(r"\b(201[6-9]|202[0-9]|203[0-9])\b")

RARITY_PATTERN = re.compile(
    r"\b(common|uncommon|rare|very[_\s-]?rare|ultra[_\s-]?rare|event|special|artifact|limited)\b",
    re.IGNORECASE,
)


def parse_date_and_year(text: str) -> tuple[str | None, int | None]:
    if not text:
        return None, None

    clean = html.unescape(text)
    m = DATE_CLEAN_REGEX.search(clean)
    if m:
        day = int(m.group(1))
        month = m.group(2).capitalize()
        year = int(m.group(3))
        return f"{day} {month} {year}", year

    m = DATE_MDY_REGEX.search(clean)
    if m:
        month = m.group(1).capitalize()
        day = int(m.group(2))
        year = int(m.group(3))
        return f"{day} {month} {year}", year

    ym = YEAR_ONLY_REGEX.search(clean)
    if ym:
        year = int(ym.group(1))
        return str(year), year

    return None, None


def clean_chapter_title(raw_chapter: str) -> tuple[str | None, str]:
    if not raw_chapter:
        return None, ""

    cleaned = (
        raw_chapter.replace("[edit]", "")
        .replace("™", "")
        .replace("®", "")
        .strip()
    )

    m = re.match(
        r"^((?:CHAPTER|PARAGRAPH)\s+(?:[0-9]+(?:\.[0-9]+)?|[IVXLCDM]+)):\s*(.+)$",
        cleaned,
        re.IGNORECASE,
    )
    if m:
        return m.group(1).strip(), m.group(2).strip()

    return None, cleaned


def extract_rarity_from_elements(
    cells: list[Tag],
    img_tag: Tag | None = None,
    section_context: str = "",
) -> str:
    if len(cells) >= 4:
        c_text = cells[2].get_text(strip=True)
        m = RARITY_PATTERN.search(c_text)
        if m:
            return normalize_rarity_name(m.group(1))

    for cell in cells:
        for el in [cell] + cell.find_all(["a", "div", "span", "img", "td"]):
            for attr in ["title", "data-rarity", "class", "alt"]:
                val = el.get(attr, "")
                if isinstance(val, list):
                    val = " ".join(val)
                if val:
                    m = RARITY_PATTERN.search(str(val))
                    if m:
                        return normalize_rarity_name(m.group(1))

    if img_tag:
        img_src = (
            img_tag.get("data-src")
            or img_tag.get("src")
            or img_tag.get("data-srcset")
            or ""
        )
        if img_src:
            m = RARITY_PATTERN.search(img_src)
            if m:
                return normalize_rarity_name(m.group(1))

    if section_context:
        m = RARITY_PATTERN.search(section_context)
        if m:
            return normalize_rarity_name(m.group(1))

    return "Common"


def normalize_rarity_name(raw_rarity: str) -> str:
    r = raw_rarity.lower().replace("_", " ").replace("-", " ").strip()
    if "ultra" in r:
        return "Ultra Rare"
    if "very" in r:
        return "Very Rare"
    if "uncommon" in r:
        return "Uncommon"
    if "rare" in r:
        return "Rare"
    if "event" in r or "special" in r or "limited" in r:
        return "Event"
    if "artifact" in r:
        return "Ultra Rare"
    return "Common"


def extract_icon_token(src_or_alt: str) -> str:
    if not src_or_alt:
        return ""
    m = re.search(r"(?:Full_)?Icon(?:Perks|Items|Addons|Addon|Powers|Help)_([^./?]+)", src_or_alt, re.IGNORECASE)
    if m:
        return re.sub(r"[^a-zA-Z0-9]", "", m.group(1)).lower()
    m2 = re.search(r"(?:^|/)(K|S)(\d+)[-_]", src_or_alt, re.IGNORECASE)
    if m2:
        return f"{m2.group(1).upper()}{int(m2.group(2)):02d}"
    fn = src_or_alt.split("/")[-1].split(".")[0]
    fn = re.sub(r"^\d+px-", "", fn, flags=re.IGNORECASE)
    fn = re.sub(r"^(?:Full_)?(?:Icon(?:Addon|Addons|Items|Perks|Powers)_)?", "", fn, flags=re.IGNORECASE)
    return re.sub(r"[^a-zA-Z0-9]", "", fn).lower()


class WikiGGDriverEN:
    BASE_DOMAIN = "https://deadbydaylight.wiki.gg"
    API_URL = "https://deadbydaylight.wiki.gg/api.php"
    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30

    def __init__(self, base_dir: Path | None = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
        self.base_dir = Path(base_dir)
        self.session = requests.Session(impersonate=self.IMPERSONATE_BROWSER)

    def fetch_page_html(self, page_title: str) -> str:
        params = {
            "action": "parse",
            "page": page_title,
            "prop": "text",
            "format": "json",
            "redirects": "1",
        }
        for attempt in range(4):
            try:
                response = self.session.get(
                    self.API_URL,
                    params=params,
                    verify=False,
                    timeout=self.REQUEST_TIMEOUT,
                )
                if response.status_code == 200:
                    data = response.json()
                    if "parse" in data and "text" in data["parse"]:
                        return data["parse"]["text"]["*"]

                if response.status_code == 429:
                    time.sleep(2.0 * (attempt + 1))
                    continue

                response.raise_for_status()
            except Exception as err:
                logger.warning(f"API fetch attempt {attempt + 1} for '{page_title}' failed: {err}")
                time.sleep(1.5)

        fallback_url = f"{self.BASE_DOMAIN}/wiki/{page_title}"
        res = self.session.get(fallback_url, verify=False, timeout=self.REQUEST_TIMEOUT)
        res.raise_for_status()
        return res.text

    def scrape_roster_from_page(self, page_title: str, role: str) -> list[CharacterData]:
        html_doc = self.fetch_page_html(page_title)
        soup = BeautifulSoup(html_doc, "html.parser")
        content = soup.find("div", class_="mw-parser-output") or soup

        characters: list[CharacterData] = []
        seen_slugs: set[str] = set()

        killer_meta_by_slug: dict[str, dict[str, Any]] = {}
        if role == "Killer":
            for cell in content.find_all(["td", "th"]):
                links = cell.find_all("a", href=re.compile(r"^/wiki/(?!File:|Category:|Special:).+"))
                text_links = [a for a in links if not a.find("img") and a.get_text(strip=True)]
                if len(text_links) >= 2:
                    power_tag = text_links[0]
                    killer_tag = text_links[1]
                    k_slug = extract_slug_from_href(killer_tag.get("href", "")).lower()
                    p_name = re.sub(
                        r"\[\s*edit\s*\]", "", power_tag.get_text(strip=True), flags=re.IGNORECASE
                    ).strip()
                    if k_slug and p_name:
                        killer_meta_by_slug[k_slug] = {
                            "power_name": p_name,
                            "power_desc": "",
                            "movement_speed": "4.6 m/s (115%)",
                            "terror_radius": "32 m",
                            "terror_radius_meters": 32,
                            "height": "Tall",
                        }

        for link in content.find_all("a", href=re.compile(r"^/wiki/")):
            href = link.get("href", "")
            slug = extract_slug_from_href(href)
            slug_lower = slug.lower()

            if not slug or slug_lower in seen_slugs:
                continue
            if slug.startswith(("Category:", "File:", "Special:", "Dead_by_Daylight", "Help:", "User:", "Template:", "Tome")):
                continue

            img = link.find("img")
            if not img:
                continue

            avatar_url = extract_high_res_url(img, self.BASE_DOMAIN)
            if not avatar_url:
                continue

            filename = avatar_url.split("/revision")[0].rstrip("/").split("/")[-1]
            match = PORTRAIT_PATTERN.search(filename)
            if not match:
                continue

            prefix_role = "Killer" if match.group(1).upper() == "K" else "Survivor"
            if prefix_role != role:
                continue

            release_num = int(match.group(2))
            code_prefix = f"{match.group(1).upper()}{match.group(2)}"

            raw_title = (link.get("title") or link.get_text() or "").strip().replace("_", " ")
            if not raw_title or len(raw_title) > 60:
                raw_title = slug.replace("_", " ")

            seen_slugs.add(slug_lower)
            sanitized = sanitize_filename(raw_title)
            sub_dir = "survivors" if role == "Survivor" else "killers"

            power_data = None
            if role == "Killer":
                k_meta = (
                    killer_meta_by_slug.get(slug_lower)
                    or killer_meta_by_slug.get(slug_lower.replace("the_", ""))
                    or killer_meta_by_slug.get(f"the_{slug_lower}")
                    or {}
                )
                if not k_meta:
                    for km_slug, km_val in killer_meta_by_slug.items():
                        if km_slug in slug_lower or slug_lower in km_slug:
                            k_meta = km_val
                            break

                power_name = k_meta.get("power_name") or ""
                power_data = KillerPowerData(
                    name=power_name,
                    description=k_meta.get("power_desc", ""),
                    movement_speed=k_meta.get("movement_speed", "4.6 m/s (115%)"),
                    terror_radius=k_meta.get("terror_radius", "32 m"),
                    terror_radius_meters=k_meta.get("terror_radius_meters", 32),
                    height=k_meta.get("height", "Tall"),
                )

            characters.append(
                CharacterData(
                    name=raw_title,
                    real_name=raw_title,
                    wiki_slug=slug,
                    short_name=slug_lower,
                    category=role,
                    avatar_url=avatar_url,
                    avatar_local_path=f"avatars/{sub_dir}/{sanitized}.png",
                    release_number=release_num,
                    code_prefix=code_prefix,
                    power=power_data,
                )
            )

        return characters

    def scrape_dlcs_from_wiki(self) -> list[dict[str, Any]]:
        dlcs: list[dict[str, Any]] = []
        seen_dlc_names = set()

        for page in ["Downloadable_Content", "Chapters"]:
            try:
                html_doc = self.fetch_page_html(page)
                soup = BeautifulSoup(html_doc, "html.parser")
                content = soup.find("div", class_="mw-parser-output") or soup

                for table in content.find_all("table", class_=re.compile(r"wikitable|article-table")):
                    rows = table.find_all("tr")
                    for tr in rows:
                        tds = tr.find_all("td")
                        if not tds:
                            continue

                        row_text = tr.get_text(separator=" ", strip=True)
                        date_str, year_num = parse_date_and_year(row_text)

                        links = tr.find_all("a", href=re.compile(r"^/wiki/"))
                        row_chars = []
                        dlc_name = ""
                        for a in links:
                            txt = a.get_text(strip=True)
                            if not txt or txt.startswith(("File:", "Special:", "Category:")):
                                continue
                            if any(k in txt.lower() for k in ["chapter", "paragraph", "pack"]):
                                if not dlc_name:
                                    dlc_name = txt
                            elif txt not in ["Killer", "Survivor", "Map", "DLC", "Base Game", "PTB"]:
                                row_chars.append(txt)

                        if dlc_name and dlc_name.lower() not in seen_dlc_names:
                            seen_dlc_names.add(dlc_name.lower())
                            is_licensed = (
                                "™" in dlc_name
                                or "®" in dlc_name
                                or "licensed" in row_text.lower()
                                or ("auric cells" in row_text.lower() and "iridescent" not in row_text.lower())
                            )
                            dlcs.append({
                                "dlc_name": dlc_name,
                                "release_date": date_str or "",
                                "release_year": year_num,
                                "is_licensed": is_licensed,
                                "characters": row_chars,
                            })

                is_under_licensed = False
                for node in content.find_all(["h2", "h3", "h4"]):
                    if node.name == "h2":
                        h2_txt = node.get_text(strip=True).lower()
                        if "licensed" in h2_txt:
                            is_under_licensed = True
                        elif "original" in h2_txt or "available" in h2_txt or "retired" in h2_txt:
                            is_under_licensed = False

                    if node.name in ["h3", "h4"]:
                        raw_title = (
                            node.get_text(strip=True)
                            .replace("[edit]", "")
                            .replace("™", "")
                            .replace("®", "")
                            .strip()
                        )
                        if not raw_title or raw_title.lower() in [
                            "overview", "contents", "purchasing a dlc", "licensed dlcs",
                            "available dlcs", "chapters", "clothing packs", "character packs",
                            "original soundtrack", "retired dlcs", "chapter packs"
                        ]:
                            continue

                        date_str = ""
                        year_num = None
                        chars_added = []
                        is_licensed = is_under_licensed or "™" in raw_title or "®" in raw_title

                        curr = node.find_next_sibling()
                        while curr and curr.name not in ["h2", "h3", "h4"]:
                            txt = curr.get_text(separator=" ", strip=True)
                            d_parsed, y_parsed = parse_date_and_year(txt)
                            if d_parsed and not date_str:
                                date_str = d_parsed
                                year_num = y_parsed

                            if "auric cells" in txt.lower() and "iridescent" not in txt.lower():
                                is_licensed = True
                            elif "iridescent" in txt.lower():
                                is_licensed = False

                            for a in curr.find_all("a"):
                                c_name = a.get_text(strip=True)
                                if (
                                    c_name
                                    and c_name not in ["Main Article", "DLC", "Chapter", "Paragraph", "Killer", "Survivor", "Store Page", "Retired"]
                                    and not c_name.startswith(("File:", "Special:", "Category:"))
                                    and len(c_name) < 40
                                ):
                                    chars_added.append(c_name)

                            curr = curr.find_next_sibling()

                        if raw_title.lower() not in seen_dlc_names and (date_str or chars_added):
                            seen_dlc_names.add(raw_title.lower())
                            dlcs.append({
                                "dlc_name": raw_title,
                                "release_date": date_str,
                                "release_year": year_num,
                                "is_licensed": is_licensed,
                                "characters": chars_added,
                            })
            except Exception as e:
                logger.warning(f"Failed scraping DLC catalog from '{page}': {e}")

        return dlcs

    def enrich_characters_from_pages(self, characters: list[CharacterData]) -> None:
        def norm_key(text: str) -> str:
            if not text:
                return ""
            n = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8").lower()
            return re.sub(r"[^a-z0-9]", "", n)

        dlcs = self.scrape_dlcs_from_wiki()
        logger.info(f"Loaded {len(dlcs)} live DLC entries from wiki.gg")

        async def _fetch_all():
            async with AsyncSession(impersonate="chrome120", verify=False) as session:
                semaphore = asyncio.Semaphore(5)

                async def _fetch_one(char: CharacterData):
                    slug = char.wiki_slug or char.name.replace(" ", "_")
                    async with semaphore:
                        for attempt in range(3):
                            try:
                                await asyncio.sleep(0.05)
                                params = {
                                    "action": "parse",
                                    "page": slug,
                                    "prop": "text",
                                    "format": "json",
                                    "redirects": "1",
                                }
                                r = await session.get(self.API_URL, params=params, timeout=15, verify=False)
                                data = r.json()
                                if "error" in data:
                                    await asyncio.sleep(1.0)
                                    continue

                                html_raw = data.get("parse", {}).get("text", {}).get("*", "")
                                if not html_raw:
                                    return

                                soup = BeautifulSoup(html_raw, "html.parser")
                                content = soup.find("div", class_="mw-parser-output") or soup

                                real_name = ""
                                movement_speed = ""
                                terror_radius = ""
                                tr_meters = 32
                                height = ""
                                cost_text = ""
                                power_name = ""
                                power_desc = ""
                                power_icon_url = ""
                                infobox_dlc_text = ""
                                infobox_dlc_link = ""
                                infobox_release_date = ""

                                for tr in content.find_all("tr"):
                                    th = tr.find(["th", "td"], class_=lambda c: c and "title" in str(c).lower())
                                    td = tr.find(["td"], class_=lambda c: c and "value" in str(c).lower())
                                    if not (th and td):
                                        tds = tr.find_all(["th", "td"])
                                        if len(tds) >= 2:
                                            th, td = tds[0], tds[1]
                                    if th and td:
                                        t_txt = th.get_text(strip=True).lower()
                                        v_txt = td.get_text(separator=" ", strip=True)

                                        if t_txt in ["name", "real name"]:
                                            real_name = v_txt
                                        elif "movement speed" in t_txt and "alternate" not in t_txt:
                                            m_speed = re.search(
                                                r"(\d+(?:\.\d+)?)\s*%\s*[\|\(]?\s*(\d+(?:\.\d+)?)\s*m/s", v_txt
                                            )
                                            if not m_speed:
                                                m_speed = re.search(
                                                    r"(\d+(?:\.\d+)?)\s*m/s.*?(\d+(?:\.\d+)?)\s*%", v_txt
                                                )
                                                if m_speed:
                                                    movement_speed = f"{m_speed.group(1)} m/s ({m_speed.group(2)}%)"
                                            else:
                                                movement_speed = f"{m_speed.group(2)} m/s ({m_speed.group(1)}%)"
                                            if not movement_speed:
                                                movement_speed = v_txt
                                        elif "terror radius" in t_txt:
                                            terror_radius = v_txt
                                            m = re.search(r"(\d+)", terror_radius)
                                            if m:
                                                tr_meters = int(m.group(1))
                                        elif "height" in t_txt:
                                            height = v_txt
                                        elif "cost" in t_txt:
                                            cost_text = v_txt
                                        elif "power" in t_txt and "attack" not in t_txt and "trivia" not in t_txt:
                                            power_name = v_txt
                                        elif t_txt in ["dlc", "chapter"]:
                                            infobox_dlc_text = v_txt
                                            a_link = td.find("a")
                                            if a_link:
                                                infobox_dlc_link = extract_slug_from_href(a_link.get("href", ""))
                                        elif t_txt in ["release date", "released", "release"]:
                                            infobox_release_date = v_txt

                                intro_paragraphs = []
                                for p in content.find_all("p"):
                                    p_txt = p.get_text(separator=" ", strip=True)
                                    if len(p_txt) > 25 and ("introduced" in p_txt.lower() or "released" in p_txt.lower() or "featured in" in p_txt.lower()):
                                        intro_paragraphs.append(p_txt)

                                intro_full_text = " ".join(intro_paragraphs)

                                parsed_chapter_name = ""
                                parsed_chapter_number = ""
                                parsed_dlc_type = ""
                                parsed_release_date = ""
                                parsed_release_year = None

                                intro_match = re.search(
                                    r"introduced as (?:the|a)\s+(?:Killer|Survivor)\s+of\s+(?:the\s+)?([^,]+?),\s+a\s+([^,]+?)\s+released\s+(?:on|in)\s+([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+of)?\s+[0-9]{4}|[A-Za-z]+\s+[0-9]{1,2}(?:st|nd|rd|th)?,?\s+[0-9]{4}|[A-Za-z]+\s+[0-9]{4}|[0-9]{4})",
                                    intro_full_text,
                                    re.IGNORECASE,
                                )
                                if intro_match:
                                    raw_chap = intro_match.group(1).strip()
                                    parsed_dlc_type = intro_match.group(2).strip()
                                    date_raw = intro_match.group(3).strip()
                                    parsed_release_date, parsed_release_year = parse_date_and_year(date_raw)
                                    c_num, c_title = clean_chapter_title(raw_chap)
                                    parsed_chapter_number = c_num or ""
                                    parsed_chapter_name = c_title or raw_chap

                                if not parsed_release_date:
                                    if "base game" in intro_full_text.lower() or (char.release_number and char.release_number <= 4 and "chapter" not in intro_full_text.lower()):
                                        parsed_chapter_name = "Base Game"
                                        parsed_dlc_type = "base_game"
                                        d_p, y_p = parse_date_and_year(intro_full_text)
                                        parsed_release_date = d_p or "14 June 2016"
                                        parsed_release_year = y_p or 2016

                                if not parsed_release_date:
                                    d_p, y_p = parse_date_and_year(intro_full_text)
                                    if d_p:
                                        parsed_release_date = d_p
                                        parsed_release_year = y_p

                                if not parsed_release_date and infobox_release_date:
                                    d_p, y_p = parse_date_and_year(infobox_release_date)
                                    if d_p:
                                        parsed_release_date = d_p
                                        parsed_release_year = y_p

                                if not parsed_chapter_name and infobox_dlc_text:
                                    c_num, c_title = clean_chapter_title(infobox_dlc_text)
                                    parsed_chapter_number = c_num or ""
                                    parsed_chapter_name = c_title or infobox_dlc_text

                                if not parsed_release_date or not parsed_chapter_name:
                                    c_norm = norm_key(char.name)
                                    for d in dlcs:
                                        for ac in d.get("characters", []):
                                            ac_norm = norm_key(ac)
                                            if ac_norm == c_norm or (len(c_norm) >= 4 and (c_norm in ac_norm or ac_norm in c_norm)):
                                                if not parsed_chapter_name:
                                                    c_num, c_title = clean_chapter_title(d["dlc_name"])
                                                    parsed_chapter_number = c_num or ""
                                                    parsed_chapter_name = c_title or d["dlc_name"]
                                                if not parsed_release_date and d.get("release_date"):
                                                    parsed_release_date = d["release_date"]
                                                    parsed_release_year = d.get("release_year")
                                                if not parsed_dlc_type:
                                                    parsed_dlc_type = "Chapter DLC"
                                                break
                                        if parsed_release_date and parsed_chapter_name:
                                            break

                                if (not parsed_release_date or not parsed_release_year) and (infobox_dlc_link or parsed_chapter_name):
                                    chap_slug = infobox_dlc_link or parsed_chapter_name.replace(" ", "_")
                                    try:
                                        chap_params = {
                                            "action": "parse",
                                            "page": chap_slug,
                                            "prop": "text",
                                            "format": "json",
                                            "redirects": "1",
                                        }
                                        cr = await session.get(self.API_URL, params=chap_params, timeout=12, verify=False)
                                        cdata = cr.json()
                                        chtml = cdata.get("parse", {}).get("text", {}).get("*", "")
                                        if chtml:
                                            csoup = BeautifulSoup(chtml, "html.parser")
                                            for elem in csoup.find_all(["p", "tr"]):
                                                ctxt = elem.get_text(separator=" ", strip=True)
                                                cd_p, cy_p = parse_date_and_year(ctxt)
                                                if cd_p:
                                                    parsed_release_date = cd_p
                                                    parsed_release_year = cy_p
                                                    break
                                    except Exception:
                                        pass

                                is_licensed = False
                                if cost_text:
                                    if "auric cells" in cost_text.lower() and "iridescent" not in cost_text.lower():
                                        is_licensed = True
                                    elif "iridescent" in cost_text.lower():
                                        is_licensed = False

                                if not is_licensed and ("™" in char.name or "®" in char.name or "™" in parsed_chapter_name or "®" in parsed_chapter_name):
                                    is_licensed = True

                                if char.category == "Killer":
                                    for img in content.find_all("img"):
                                        alt = img.get("alt", "")
                                        src = img.get("src", "")
                                        if "iconpowers" in src.lower() or "iconpowers" in alt.lower() or "power" in alt.lower():
                                            power_icon_url = extract_high_res_url(img, self.BASE_DOMAIN)
                                            if not power_name and alt:
                                                power_name = alt.replace("IconPowers ", "").replace(".png", "").strip()
                                            break

                                    for h in content.find_all(["h2", "h3", "h4"]):
                                        htxt = h.get_text(strip=True).lower()
                                        if "power:" in htxt or "power" in htxt or "special ability" in htxt:
                                            p_elems = []
                                            curr = h.find_next_sibling()
                                            while curr and curr.name not in ["h2", "h3"]:
                                                if curr.name in ["p", "ul", "ol", "div"]:
                                                    txt = curr.get_text(separator=" ", strip=True)
                                                    if len(txt) > 20 and not txt.startswith("File:") and not txt.startswith("Main article"):
                                                        p_elems.append(txt)
                                                curr = curr.find_next_sibling()
                                            if p_elems:
                                                power_desc = clean_description_text("\n\n".join(p_elems[:5]))
                                                break

                                lore_text = ""
                                for h in content.find_all(["h2", "h3"]):
                                    htxt = h.get_text(strip=True).lower()
                                    if "lore" in htxt or "background" in htxt or "biography" in htxt:
                                        p_list = []
                                        curr = h.find_next_sibling()
                                        while curr and curr.name not in ["h2", "h3"]:
                                            if curr.name in ["p", "blockquote"]:
                                                txt = curr.get_text(separator=" ", strip=True)
                                                if len(txt) > 30 and not txt.startswith("File:") and not txt.startswith("Main article"):
                                                    p_list.append(clean_description_text(txt))
                                            curr = curr.find_next_sibling()
                                        if p_list:
                                            lore_text = "\n\n".join(p_list[:6])
                                            break

                                if real_name and real_name != char.name:
                                    char.real_name = real_name

                                char.chapter_name = parsed_chapter_name or "Base Game"
                                char.chapter_number = parsed_chapter_number or None
                                char.dlc_type = parsed_dlc_type or ("base_game" if char.chapter_name == "Base Game" else "Chapter DLC")
                                char.release_date = parsed_release_date or "14 June 2016"
                                char.release_year = parsed_release_year or 2016
                                char.is_licensed = is_licensed
                                char.lore = lore_text or None

                                if char.category == "Killer":
                                    p_name = power_name or (char.power.name if char.power else "")
                                    p_desc = power_desc or (char.power.description if char.power else "")
                                    p_icon = power_icon_url or (char.power.icon_url if char.power else "")
                                    p_speed = movement_speed or (char.power.movement_speed if char.power else "4.6 m/s (115%)")
                                    p_tr = terror_radius or (char.power.terror_radius if char.power else "32 m")
                                    p_height = height or (char.power.height if char.power else "Tall")

                                    char.power = KillerPowerData(
                                        name=p_name,
                                        description=p_desc,
                                        icon_url=p_icon,
                                        movement_speed=p_speed,
                                        terror_radius=p_tr,
                                        terror_radius_meters=tr_meters,
                                        height=p_height,
                                    )
                                return
                            except Exception as e:
                                if attempt == 2:
                                    logger.warning(f"Failed enriching character {slug}: {e}")
                                await asyncio.sleep(0.5 * (attempt + 1))

                tasks = [_fetch_one(c) for c in characters]
                await asyncio.gather(*tasks)

        try:
            asyncio.run(_fetch_all())
        except Exception as err:
            logger.error(f"Error in enrich_characters_from_pages: {err}")

        chapter_groups = defaultdict(list)
        for char in characters:
            if char.chapter_name and char.chapter_name.lower() != "base game":
                chapter_groups[norm_key(char.chapter_name)].append(char)

        for group in chapter_groups.values():
            if len(group) > 1:
                for c in group:
                    c.dlc_counterparts = safe_json_dumps([other.name for other in group if other.name != c.name], default_val="[]")

    def scrape_characters_dynamically(self) -> list[CharacterData]:
        logger.info("Fetching Survivors via MediaWiki API...")
        survivors = self.scrape_roster_from_page("Survivors", "Survivor")

        logger.info("Fetching Killers via MediaWiki API...")
        killers = self.scrape_roster_from_page("Killers", "Killer")

        all_characters = survivors + killers
        logger.info(f"Enriching all {len(all_characters)} characters with live infobox, chapter, licensing, and combat power details...")
        self.enrich_characters_from_pages(all_characters)

        logger.info(f"Discovered {len(all_characters)} characters ({len(survivors)} Survivors, {len(killers)} Killers).")
        return all_characters

    def parse_perks(self, html_content: str, characters: list[CharacterData]) -> list[PerkData]:
        soup = BeautifulSoup(html_content, "html.parser")
        perks_dict: dict[str, PerkData] = {}
        alias_backlog: dict[str, str] = {}
        current_category: str | None = None
        content_area = soup.find("div", class_="mw-parser-output") or soup

        char_by_key: dict[str, CharacterData] = {}
        for c in characters:
            keys = [c.name, c.real_name, c.wiki_slug, c.short_name]
            if c.name.startswith("The "):
                keys.append(c.name[4:])
            else:
                keys.append(f"The {c.name}")
            for k in keys:
                if k:
                    char_by_key[normalize_name_key(k)] = c

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                header_text = element.get_text().lower()
                if "survivor" in header_text:
                    current_category = "Survivor"
                elif "killer" in header_text:
                    current_category = "Killer"

            elif element.name == "table" and "wikitable" in element.get("class", []):
                if not current_category:
                    continue

                rows = element.find_all("tr")
                for row in rows[1:]:
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 3:
                        continue
                    try:
                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        perk_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                        if not perk_name:
                            continue

                        norm_perk = normalize_name_key(perk_name)

                        if norm_perk in GENERIC_PERK_CANONICAL_MAP:
                            canonical_target, alias_name = GENERIC_PERK_CANONICAL_MAP[norm_perk]
                            norm_target = normalize_name_key(canonical_target)
                            if norm_target in perks_dict:
                                perks_dict[norm_target].alternate_name = alias_name
                                perks_dict[norm_target].is_generic_counterpart = True
                            else:
                                alias_backlog[norm_target] = alias_name
                            continue

                        icon_tag = cells[0].find("img")
                        icon_url = extract_high_res_url(icon_tag, self.BASE_DOMAIN)

                        cell_copy = BeautifulSoup(str(cells[2]), "html.parser")
                        for bold in cell_copy.find_all(["b", "strong"]):
                            bold.replace_with(f"**{bold.get_text().strip()}**")
                        for italic in cell_copy.find_all(["i", "em"]):
                            italic.replace_with(f"*{italic.get_text().strip()}*")
                        for li in cell_copy.find_all("li"):
                            li.replace_with(f"\n* {li.get_text().strip()}")
                        for br in cell_copy.find_all("br"):
                            br.replace_with("\n")
                        lines = [line.strip() for line in cell_copy.get_text().splitlines()]
                        raw_description = "\n".join(line for line in lines if line)
                        description = clean_description_text(raw_description)

                        canonical_name = "General"
                        real_name = "General"
                        avatar_path = ""

                        if len(cells) >= 4:
                            owner_cell = cells[3]
                            owner_link = owner_cell.find("a")

                            matched = None
                            if owner_link:
                                href = owner_link.get("href", "")
                                link_title = owner_link.get("title", "").strip()
                                slug = extract_slug_from_href(href)
                                matched = (
                                    char_by_key.get(normalize_name_key(slug))
                                    or char_by_key.get(normalize_name_key(link_title))
                                    or char_by_key.get(normalize_name_key(owner_link.get_text()))
                                )

                            if not matched:
                                raw_text = owner_cell.get_text().strip()
                                clean_text = re.sub(r"^[.\s\-–]+|[.\s\-–]+$", "", raw_text).strip()
                                if clean_text and normalize_name_key(clean_text) not in ["all", "general", "none", "", "all survivors", "all killers"]:
                                    matched = char_by_key.get(normalize_name_key(clean_text))

                            if matched:
                                canonical_name = matched.name
                                real_name = matched.real_name
                                avatar_path = matched.avatar_local_path

                        sanitized_name = sanitize_filename(perk_name)
                        category_dir = "survivors" if current_category == "Survivor" else "killers"

                        if canonical_name == "General":
                            local_rel_path = f"icons/{category_dir}/General/{sanitized_name}.png"
                        else:
                            local_rel_path = f"icons/{category_dir}/{canonical_name}/{sanitized_name}.png"

                        norm_key_str = normalize_name_key(perk_name)
                        alternate_name = alias_backlog.get(norm_key_str)
                        is_generic = alternate_name is not None

                        perks_dict[norm_key_str] = PerkData(
                            name=perk_name,
                            character=canonical_name,
                            character_real_name=real_name,
                            character_avatar_path=avatar_path,
                            category=current_category,
                            description=description,
                            icon_url=icon_url,
                            icon_local_path=local_rel_path,
                            alternate_name=alternate_name,
                            is_generic_counterpart=is_generic,
                        )
                    except Exception:
                        continue

        return list(perks_dict.values())

    def parse_wiki_items(self, html_content: str) -> list[ItemData]:
        soup = BeautifulSoup(html_content, "html.parser")
        items: list[ItemData] = []
        seen_items: set[str] = set()

        content_area = soup.find("div", class_="mw-parser-output") or soup
        current_category = "Survivor"
        current_section = ""

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                headline = element.find(class_=re.compile(r"mw-headline"))
                if headline:
                    raw_header = headline.get_text(strip=True)
                else:
                    for edit_tag in element.find_all(class_=re.compile(r"mw-editsection|editsection")):
                        edit_tag.decompose()
                    raw_header = element.get_text().strip()

                cleaned_header = re.sub(r"\[\s*edit\s*\]", "", raw_header, flags=re.IGNORECASE).strip()
                current_section = cleaned_header.lower()

                if "survivor" in current_section:
                    current_category = "Survivor"
                elif "killer" in current_section:
                    current_category = "Killer"

            elif element.name == "table" and "wikitable" in element.get("class", []):
                rows = element.find_all("tr")[1:]
                for row in rows:
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 2:
                        continue
                    try:
                        img_tag = cells[0].find("img")
                        icon_url = extract_high_res_url(img_tag, self.BASE_DOMAIN)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        item_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                        if not item_name:
                            continue

                        name_lower = item_name.lower().strip()
                        if name_lower.endswith(" items") or name_lower.endswith(" add-ons") or "uncommon items" in name_lower:
                            continue

                        norm_item = normalize_name_key(item_name)
                        if norm_item in seen_items:
                            continue
                        seen_items.add(norm_item)

                        description = ""
                        if len(cells) >= 4:
                            description = cells[3].get_text(separator="\n", strip=True)
                        elif len(cells) == 3:
                            description = cells[2].get_text(separator="\n", strip=True)

                        rarity = extract_rarity_from_elements(cells, img_tag=img_tag, section_context=current_section)
                        description = clean_description_text(description)
                        sanitized = sanitize_filename(item_name)
                        local_path = f"icons/items/{sanitized}.png"

                        name_low = item_name.lower().strip()
                        special_items = [
                            "first aid spray", "vaccine", "emp", "remote flame turret", "pocket mirror",
                            "lament configuration", "hand of vecna", "eye of vecna", "flash grenade",
                            "candelabra", "antidote", "keycard", "vhs tape", "void crystal",
                            "glowing fungus", "blood can", "fragile mirror", "searcher's pendant", "fog crystal"
                        ]
                        if name_low in special_items or "spray" in name_low or "vaccine" in name_low or "turret" in name_low:
                            item_category = "Special"
                            item_role = "Survivor"
                        elif "med-kit" in name_low or "aid kit" in name_low or "lunchbox" in name_low:
                            item_category = "Med-Kit"
                            item_role = "Survivor"
                        elif "toolbox" in name_low or "tools" in name_low:
                            item_category = "Toolbox"
                            item_role = "Survivor"
                        elif "flashlight" in name_low or "wisp" in name_low:
                            item_category = "Flashlight"
                            item_role = "Survivor"
                        elif "key" in name_low and "keycard" not in name_low:
                            item_category = "Key"
                            item_role = "Survivor"
                        elif "map" in name_low:
                            item_category = "Map"
                            item_role = "Survivor"
                        elif "firecracker" in name_low or "party starter" in name_low:
                            item_category = "Firecracker"
                            item_role = "Survivor"
                        elif "fog vial" in name_low:
                            item_category = "Fog Vial"
                            item_role = "Survivor"
                        else:
                            item_category = current_category
                            item_role = current_category

                        items.append(
                            ItemData(
                                name=item_name,
                                category=item_category,
                                role=item_role,
                                description=description,
                                icon_url=icon_url,
                                icon_local_path=local_path,
                                rarity=rarity,
                            )
                        )
                    except Exception:
                        continue
        return items

    def parse_wiki_addons(self, html_content: str, characters: list[CharacterData] | None = None) -> list[AddonData]:
        soup = BeautifulSoup(html_content, "html.parser")
        raw_addons: list[dict] = []
        content_area = soup.find("div", class_="mw-parser-output") or soup
        current_target = "General"
        current_category = "Survivor"
        current_section = ""

        dynamic_power_to_killer: dict[str, str] = {}
        killers: list[CharacterData] = []
        if characters:
            for c in characters:
                if c.category == "Killer":
                    killers.append(c)
                    dynamic_power_to_killer[normalize_name_key(c.name)] = c.name
                    dynamic_power_to_killer[normalize_name_key(c.name.replace("The ", ""))] = c.name
                    if c.real_name:
                        dynamic_power_to_killer[normalize_name_key(c.real_name)] = c.name
                    if c.wiki_slug:
                        dynamic_power_to_killer[normalize_name_key(c.wiki_slug)] = c.name
                    if c.short_name:
                        dynamic_power_to_killer[normalize_name_key(c.short_name)] = c.name
                    if c.power and c.power.name:
                        p_norm = normalize_name_key(c.power.name)
                        dynamic_power_to_killer[p_norm] = c.name
                        if p_norm.endswith("s"):
                            dynamic_power_to_killer[p_norm[:-1]] = c.name
                        else:
                            dynamic_power_to_killer[p_norm + "s"] = c.name
                        if p_norm.startswith("the "):
                            dynamic_power_to_killer[p_norm[4:]] = c.name
                        else:
                            dynamic_power_to_killer["the " + p_norm] = c.name

        for k, v in KNOWN_KILLER_POWER_ALIASES.items():
            if k not in dynamic_power_to_killer:
                dynamic_power_to_killer[k] = v

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                headline = element.find(class_=re.compile(r"mw-headline"))
                if headline:
                    raw_header = headline.get_text(strip=True)
                else:
                    for edit_tag in element.find_all(class_=re.compile(r"mw-editsection|editsection")):
                        edit_tag.decompose()
                    raw_header = element.get_text().strip()

                cleaned_header = re.sub(r"\[\s*edit\s*\]", "", raw_header, flags=re.IGNORECASE).strip()
                current_section = cleaned_header.lower()

                if "killer power add-ons" in current_section or "killer" in current_section:
                    current_category = "Killer"
                elif "survivor item add-ons" in current_section or "survivor" in current_section:
                    current_category = "Survivor"

                target_clean = re.sub(r"\s+(?:Add-ons|Addons|Add-on|Addon)$", "", cleaned_header, flags=re.IGNORECASE).strip()
                if target_clean and target_clean.lower() not in [
                    "survivor", "killer", "general", "common", "uncommon", "rare",
                    "very rare", "ultra rare", "decommissioned", "unused", "event",
                    "contents", "overview", "stacking", "numbers", "change log"
                ]:
                    norm_target = normalize_name_key(target_clean)
                    matched_killer = dynamic_power_to_killer.get(norm_target)
                    if not matched_killer:
                        for p_key, k_name in dynamic_power_to_killer.items():
                            if p_key and (p_key == norm_target or p_key in norm_target.split()):
                                matched_killer = k_name
                                break

                    current_target = matched_killer if matched_killer else target_clean

            elif element.name == "table" and "wikitable" in element.get("class", []):
                intro_target = None
                p_prev = element.previous_sibling
                while p_prev and getattr(p_prev, "name", None) not in ["h1", "h2", "h3", "h4", "table"]:
                    if getattr(p_prev, "name", None) == "p":
                        txt = p_prev.get_text()
                        m = re.search(r"is the Power of (?:The\s+)?([^.]+)", txt, re.IGNORECASE)
                        if m:
                            candidate_killer = m.group(1).strip()
                            norm_cand = normalize_name_key(candidate_killer)
                            matched_k = dynamic_power_to_killer.get(norm_cand)
                            if not matched_k:
                                matched_k = dynamic_power_to_killer.get("the " + norm_cand)
                            if matched_k:
                                intro_target = matched_k
                                break
                    p_prev = p_prev.previous_sibling

                table_target = intro_target or current_target

                rows = element.find_all("tr")[1:]
                row_count = len(rows)
                for row_idx, row in enumerate(rows):
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 2:
                        continue
                    try:
                        img_tag = cells[0].find("img")
                        icon_url = extract_high_res_url(img_tag, self.BASE_DOMAIN)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        addon_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                        if not addon_name:
                            continue

                        description = ""
                        if len(cells) >= 4:
                            description = clean_description_text(cells[3].get_text(separator="\n", strip=True))
                        elif len(cells) == 3:
                            description = clean_description_text(cells[2].get_text(separator="\n", strip=True))

                        rarity = extract_rarity_from_elements(cells, img_tag=img_tag, section_context=current_section)

                        if rarity == "Common" and row_count == 20:
                            if row_idx < 4:
                                rarity = "Common"
                            elif row_idx < 9:
                                rarity = "Uncommon"
                            elif row_idx < 14:
                                rarity = "Rare"
                            elif row_idx < 18:
                                rarity = "Very Rare"
                            else:
                                rarity = "Ultra Rare"

                        raw_addons.append({
                            "name": addon_name,
                            "target": table_target,
                            "category": current_category,
                            "description": description,
                            "icon_url": icon_url,
                            "rarity": rarity,
                        })
                    except Exception:
                        continue

        scraped_killer_targets = {normalize_name_key(a["target"]) for a in raw_addons if a["category"] == "Killer"}
        for k in killers:
            k_norm = normalize_name_key(k.name)
            if k_norm not in scraped_killer_targets and normalize_name_key(k.name.replace("The ", "")) not in scraped_killer_targets:
                try:
                    k_html = self.fetch_page_html(k.wiki_slug or k.name.replace(" ", "_"))
                    if k_html:
                        k_soup = BeautifulSoup(k_html, "html.parser")
                        for t in k_soup.find_all("table", class_=re.compile(r"wikitable")):
                            t_rows = t.find_all("tr")
                            if len(t_rows) >= 5:
                                for row_idx, r in enumerate(t_rows[1:]):
                                    cells = r.find_all(["td", "th"])
                                    if len(cells) < 2:
                                        continue
                                    img_tag = cells[0].find("img")
                                    icon_url = extract_high_res_url(img_tag, self.BASE_DOMAIN)
                                    name_cell = cells[1]
                                    name_link = name_cell.find("a")
                                    addon_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                                    if not addon_name:
                                        continue
                                    desc = ""
                                    if len(cells) >= 4:
                                        desc = clean_description_text(cells[3].get_text(separator="\n", strip=True))
                                    elif len(cells) == 3:
                                        desc = clean_description_text(cells[2].get_text(separator="\n", strip=True))
                                    rarity = extract_rarity_from_elements(cells, img_tag=img_tag)
                                    if rarity == "Common" and len(t_rows[1:]) == 20:
                                        if row_idx < 4:
                                            rarity = "Common"
                                        elif row_idx < 9:
                                            rarity = "Uncommon"
                                        elif row_idx < 14:
                                            rarity = "Rare"
                                        elif row_idx < 18:
                                            rarity = "Very Rare"
                                        else:
                                            rarity = "Ultra Rare"

                                    raw_addons.append({
                                        "name": addon_name,
                                        "target": k.name,
                                        "category": "Killer",
                                        "description": desc,
                                        "icon_url": icon_url,
                                        "rarity": rarity,
                                    })
                except Exception as e:
                    logger.warning(f"Fallback addon scraping for {k.name} failed: {e}")

        name_target_counts = defaultdict(set)
        for a in raw_addons:
            name_target_counts[normalize_name_key(a["name"])].add(normalize_name_key(a["target"]))

        addons: list[AddonData] = []
        seen_unique_names = set()

        for a in raw_addons:
            addon_name = a["name"]
            target = a["target"]

            if "serum" in addon_name.lower():
                if a["category"] == "Survivor" or "survivor" in str(target).lower():
                    target = "Special"

            display_name = f"{addon_name} ({target})" if len(name_target_counts[normalize_name_key(addon_name)]) > 1 else addon_name

            norm_unique = normalize_name_key(display_name)
            if norm_unique in seen_unique_names:
                continue
            seen_unique_names.add(norm_unique)

            sanitized = sanitize_filename(display_name)
            local_path = f"icons/addons/{sanitized}.png"

            addons.append(
                AddonData(
                    name=display_name,
                    associated_target=target,
                    category=a["category"],
                    description=a["description"],
                    icon_url=a["icon_url"],
                    icon_local_path=local_path,
                    rarity=a["rarity"],
                )
            )

        return addons

    def parse_wiki_offerings(self, html_content: str) -> list[OfferingData]:
        soup = BeautifulSoup(html_content, "html.parser")
        offerings: list[OfferingData] = []
        seen_offerings: set[str] = set()

        HEADING_ROLE: dict[str, str] = {
            "survivor": "Survivor",
            "altruism": "Survivor",
            "boldness": "Survivor",
            "objectives": "Survivor",
            "survival": "Survivor",
            "luck": "Survivor",
            "killer": "Killer",
            "brutality": "Killer",
            "deviousness": "Killer",
            "hunter": "Killer",
            "sacrifice": "Killer",
            "memento_mori": "Killer",
        }

        def role_from_heading(heading_id: str) -> str:
            return HEADING_ROLE.get(heading_id.lower().replace("-", "_"), "All")

        def nearest_section_role(tag) -> str:
            for ancestor in [tag] + list(tag.parents):
                for sibling in ancestor.find_all_previous(["h2", "h3", "h4", "h5"]):
                    span = sibling.find("span", class_="mw-headline")
                    if span:
                        hid = span.get("id", "").lower().replace("-", "_")
                        return role_from_heading(hid)
                    hid = sibling.get("id", "").lower().replace("-", "_")
                    if hid:
                        return role_from_heading(hid)
            return "All"

        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src") or ""
            if "IconFavors_" in src or "IconsFavors_" in src or "IconFavor_" in src:
                row = img.find_parent("tr")
                if not row:
                    continue
                cells = row.find_all(["td", "th"])
                off_name = ""
                for c in cells:
                    links = c.find_all("a")
                    for l in links:
                        txt = l.get_text(strip=True)
                        if txt and not txt.startswith("File:") and len(txt) > 1:
                            off_name = txt
                            break
                    if off_name:
                        break
                if not off_name and len(cells) > 1:
                    off_name = cells[1].get_text(strip=True)
                if not off_name:
                    off_name = img.get("alt", "").replace(".png", "").replace("IconFavors_", "").replace("IconsFavors_", "").strip()

                if not off_name or off_name.lower().startswith("category:"):
                    continue

                norm_key = normalize_name_key(off_name)
                if norm_key in seen_offerings:
                    continue
                seen_offerings.add(norm_key)

                icon_url = extract_high_res_url(img, self.BASE_DOMAIN)
                description = ""
                if len(cells) >= 4:
                    description = cells[3].get_text(separator="\n", strip=True)
                elif len(cells) == 3:
                    description = cells[2].get_text(separator="\n", strip=True)
                elif len(cells) == 2:
                    description = cells[1].get_text(separator="\n", strip=True)

                rarity = extract_rarity_from_elements(cells, img_tag=img)
                description = clean_description_text(description)
                sanitized = sanitize_filename(off_name)
                local_path = f"icons/offerings/{sanitized}.png"

                role = nearest_section_role(row)
                if role == "All":
                    raw_desc = row.get_text().lower()
                    survivors_only = (
                        "to all survivors" in raw_desc
                        or "all survivor" in raw_desc
                    ) and "killer" not in raw_desc
                    killers_only = (
                        "to the killer" in raw_desc
                        or "to all killers" in raw_desc
                        or "killer only" in raw_desc
                    ) and "survivor" not in raw_desc
                    if survivors_only:
                        role = "Survivor"
                    elif killers_only:
                        role = "Killer"

                row_text = row.get_text().lower()
                category = "Offering"
                if "mori" in row_text:
                    category = "Memento Mori"
                elif "bloodpoint" in row_text or "point" in row_text:
                    category = "Bloodpoints"
                elif "shroud" in row_text:
                    category = "Shroud"
                elif "ward" in row_text:
                    category = "Ward"
                elif "luck" in row_text or "salt" in row_text or "chalk" in row_text:
                    category = "Luck"
                elif "chest" in row_text or "fog" in row_text or "oak" in row_text or "blueprint" in row_text:
                    category = "Map Modifications"
                elif "chance" in row_text or "realm" in row_text:
                    category = "Realm"

                name_lower = off_name.lower()
                if (
                    rarity == "Event"
                    or "dousing" in name_lower
                    or "dowsing" in name_lower
                    or "cobbler" in name_lower
                    or "terrormisu" in name_lower
                    or "flan" in name_lower
                    or "torte" in name_lower
                    or "scream pie" in name_lower
                    or "gateau" in name_lower
                    or "sacrificial cake" in name_lower
                    or "cursed seed" in name_lower
                    or "pustula" in name_lower
                    or "bbq" in name_lower
                    or "red envelope" in name_lower
                    or "bloodshot eye" in name_lower
                ):
                    category = "Special"

                offerings.append(
                    OfferingData(
                        name=off_name,
                        category=category,
                        role=role,
                        description=description,
                        icon_url=icon_url,
                        icon_local_path=local_path,
                        rarity=rarity,
                    )
                )

        return offerings

    def scrape_offerings(self) -> list[OfferingData]:
        try:
            logger.info("Fetching Offerings...")
            html_offerings = self.fetch_page_html("Offerings")
            return self.parse_wiki_offerings(html_offerings)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg offerings: {e}")
            return []

    def scrape_all(
        self,
    ) -> tuple[list[CharacterData], list[PerkData], list[ItemData], list[AddonData], list[OfferingData]]:
        logger.info("Scraping deadbydaylight.wiki.gg dynamic data via MediaWiki API...")
        characters = self.scrape_characters_dynamically()

        logger.info("Fetching Perks...")
        html_perks = self.fetch_page_html("Perks")
        perks = self.parse_perks(html_perks, characters)

        try:
            logger.info("Fetching Items...")
            html_items = self.fetch_page_html("Items")
            items = self.parse_wiki_items(html_items)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg items: {e}")
            items = []

        try:
            logger.info("Fetching Add-ons...")
            html_addons = self.fetch_page_html("Add-ons")
            addons = self.parse_wiki_addons(html_addons, characters)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg addons: {e}")
            addons = []

        try:
            logger.info("Fetching Offerings...")
            offerings = self.scrape_offerings()
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg offerings: {e}")
            offerings = []

        return characters, perks, items, addons, offerings
```
