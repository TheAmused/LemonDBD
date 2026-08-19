# backend/app/scrapers/maps.py
import logging
import re
import time
from typing import Any, Dict, List, Optional
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
) -> Dict[str, Any]:
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

    def scrape_maps(self) -> List[MapData]:
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
            maps: List[MapData] = []
            seen_ids = set()

            realm_wrappers = soup.find_all("div", class_="realm-wrapper")
            if not realm_wrappers:
                # Fallback: Search anywhere on the page for buttons or links with data-path
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

    def scrape_maps(self) -> List[MapData]:
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
            maps: List[MapData] = []
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
                    # Also try finding direct img tags inside preview links
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