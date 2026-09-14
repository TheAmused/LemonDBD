# legacy/scrapers/app_scrapers/maps.py
# backend/app/scrapers/maps.py
import logging
import re
import time
from bs4 import BeautifulSoup
from curl_cffi import requests
from app.scrapers.types import MapData
from app.scrapers.utils import sanitize_filename

logger = logging.getLogger(__name__)

FOLDER_REALM_MAP: dict[str, str] = {
    "azarovs": "Autohaven Wreckers",
    "badham": "Springwood",
    "boneyard": "Forsaken Boneyard",
    "borgo": "The Decimated Borgo",
    "coldwind": "Coldwind Farm",
    "crotus pen": "Disturbed Ward",
    "dvarka deepwood": "Dvarka Deepwood",
    "mcmillan": "The Macmillan Estate",
    "ormond": "Ormond",
    "raccoon city": "Raccoon City",
    "red forest": "Red Forest",
    "sleepless district": "Sleepless District",
    "swamp": "Backwater Swamp",
    "yamaoka": "Yamaoka Estate",
}

OTHER_MAP_REALM_OVERRIDES: dict[str, str] = {
    "dead dawg saloon": "Grave of Glenvale",
    "fallen refuge": "Withered Isle",
    "freddy fazbears pizza": "Withered Isle",
    "garden of joy": "Withered Isle",
    "greenville square": "Withered Isle",
    "lampkin lane": "Haddonfield",
    "midwich elementary school": "Silent Hill",
    "the game": "Gideon Meat Plant",
    "the underground complex": "Hawkins National Laboratory",
    "treatment theatre": "Lery's Memorial Institute",
}


def resolve_hens_realm(map_name: str, dpath: str) -> str:
    """Derive the real realm name from the folder segment already embedded in
    a Hens333 callout dpath (e.g. "Azarovs/Blood Lodge.webp" -> "Autohaven
    Wreckers"). The site's realm-wrapper HTML this previously read from no
    longer exists, which is why every map used to land on "General Realm"."""
    if "/" not in dpath:
        return "General Realm"

    folder = dpath.split("/")[0].strip()
    folder_key = folder.lower()

    if folder_key == "other":
        name_key = map_name.strip().lower()
        if name_key in OTHER_MAP_REALM_OVERRIDES:
            return OTHER_MAP_REALM_OVERRIDES[name_key]
        return folder

    return FOLDER_REALM_MAP.get(folder_key, folder)


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
                    realm_name = resolve_hens_realm(map_name, dpath)
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
                            source="hens333",
                            source_label="Hens333 12-Clock Callouts",
                        )
                    )
                logger.info(f"Scraped {len(maps)} maps from Hens333 (fallback structure).")
                return maps

            for rw in realm_wrappers:
                for btn in rw.find_all(attrs={"data-path": True}):
                    dpath = btn["data-path"].strip()
                    if not dpath:
                        continue
                    map_name = btn.get_text(strip=True)
                    if not map_name:
                        map_name = dpath.split("/")[-1].split(".")[0]
                    map_slug = sanitize_filename(map_name)
                    realm_name = resolve_hens_realm(map_name, dpath)
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
                            source="hens333",
                            source_label="Hens333 12-Clock Callouts",
                        )
                    )
            logger.info(f"Scraped {len(maps)} maps from Hens333.")
            return maps
        except Exception as e:
            logger.error(f"Error parsing Hens333 maps: {e}")
            return []
