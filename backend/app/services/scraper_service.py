import asyncio
import hashlib
import html
import json
import logging
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, fields
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Union
from urllib.parse import unquote

from bs4 import BeautifulSoup, Tag
from curl_cffi import requests
from curl_cffi.requests import AsyncSession

logger = logging.getLogger(__name__)

# Wiki portraits are named K01_TheTrapper_Portrait.png / S07_AceVisconti_Portrait.png.
# The prefix letter is the role and the digits are the release number, which makes the
# filename the only reliable way to tell a character from a power or an item.
PORTRAIT_PATTERN = re.compile(r"^(K|S)(\d+)_.*_Portrait", re.ASCII)

ROLE_BY_PREFIX = {"K": "Killer", "S": "Survivor"}

TEACHABLE_PERK_OVERRIDE = {
    "flow state": "Kwon Tae-young",
    "a place for us": "Kwon Tae-young",
    "five moves ahead": "Kwon Tae-young",
    "fruits of your labor": "Aurora Stardotter",
    "salvation's cry": "Aurora Stardotter",
    "boon: steadfast": "Aurora Stardotter",
    "do no harm": "Orela Rose",
    "duty of care": "Orela Rose",
    "rapid response": "Orela Rose",
    "apocalyptic ingenuity": "Rick Grimes",
    "come and get me!": "Rick Grimes",
    "teamwork: toughen up": "Rick Grimes",
    "conviction": "Michonne Grimes",
    "last stand": "Michonne Grimes",
    "teamwork: throw down": "Michonne Grimes",
    "road life": "Vee Boonyasak",
    "one-two-three-four!": "Vee Boonyasak",
    "ghost notes": "Vee Boonyasak",
    "bada bada boom": "Dustin Henderson",
    "change of plan": "Dustin Henderson",
    "teamwork: full circuit": "Dustin Henderson",
    "extrasensory perception": "Eleven",
    "we see you": "Eleven",
    "teamwork: soft-spoken": "Eleven",
    "wide open throttle": "Shane Wiigwaas",
    "lend a hand": "Shane Wiigwaas",
    "cross-examination": "Shane Wiigwaas",
}


@dataclass
class ScraperConfig:
    source: str = "nightlight"
    fallback_to_wiki: bool = True
    last_used_source: str = "nightlight"
    last_run_timestamp: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScraperConfig":
        if not isinstance(data, dict):
            return cls()
        valid_keys = {f.name for f in fields(cls)}
        filtered = {k: v for k, v in data.items() if k in valid_keys}
        return cls(**filtered)


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


@dataclass

@dataclass
class ItemData:
    name: str
    category: str
    role: str
    description: str
    icon_url: str
    icon_local_path: str
    rarity: str


@dataclass
class AddonData:
    name: str
    associated_target: str
    category: str
    description: str
    icon_url: str
    icon_local_path: str
    rarity: str


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


@dataclass
class MapData:
    id: str
    name: str
    realm: str
    realm_id: str
    callout_image_url: str
    callout_image_local_path: str
    dpath: str
    clock_system: Dict[str, Any]
    source: str = "hens333"
    source_label: str = "Hens333 12-Clock Callouts"


class HensMapScraperDriver:
    HENS_CALLOUTS_URL = "https://hens333.com/callouts"
    CDN_BASE = "https://hens333.com/img/dbd/callouts/"

    @staticmethod
    def slugify(text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r"[^\w\s-]", "", text)
        text = re.sub(r"[\s_-]+", "_", text)
        return text.strip("_")

    def scrape_maps(self) -> List[MapData]:
        logger.info("Scraping map callouts from Hens333...")
        try:
            res = requests.get(self.HENS_CALLOUTS_URL, verify=False, timeout=15)
            if res.status_code != 200:
                logger.warning(f"Failed to fetch Hens333 callouts: HTTP {res.status_code}")
                return []
            soup = BeautifulSoup(res.text, "html.parser")
            maps: List[MapData] = []

            for rw in soup.find_all("div", class_="realm-wrapper"):
                h1 = rw.find("h1")
                realm_name = h1.get_text(strip=True) if h1 else "General Realm"
                realm_slug = self.slugify(realm_name)

                for btn in rw.find_all(attrs={"data-path": True}):
                    dpath = btn["data-path"]
                    map_name = btn.get_text(strip=True)
                    map_slug = self.slugify(map_name)

                    encoded_dpath = re.sub(r"\s", "%20", dpath)
                    remote_url = f"{self.CDN_BASE}{encoded_dpath}"
                    rel_static_path = f"maps/callouts/hens333/{realm_slug}/{map_slug}.webp"

                    maps.append(
                        MapData(
                            id=f"hens_{map_slug}",
                            name=map_name,
                            realm=realm_name,
                            realm_id=realm_slug,
                            callout_image_url=remote_url,
                            callout_image_local_path=rel_static_path,
                            dpath=dpath,
                            clock_system={
                                "description": f"12-Clock Callout System for {map_name} ({realm_name}). Standard top-middle starts at 12 o'clock.",
                                "twelve_o_clock": "Main Building / Top Spawn",
                                "three_o_clock": "Right Tile / Generator Cluster",
                                "six_o_clock": "Killer Shack / Bottom Spawn",
                                "nine_o_clock": "Left Tile / Jungle Gym",
                            },
                            source="hens333",
                            source_label="Hens333 12-Clock Callouts",
                        )
                    )
            logger.info(f"Scraped {len(maps)} maps from Hens333.")
            return maps
        except Exception as e:
            logger.error(f"Error scraping Hens333 maps: {e}")
            return []


class SamoelColtMapScraperDriver:
    STEAM_GUIDE_URL = "https://steamcommunity.com/sharedfiles/filedetails/?id=2899093390"

    @staticmethod
    def slugify(text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r"[^\w\s-]", "", text)
        text = re.sub(r"[\s_-]+", "_", text)
        return text.strip("_")

    def scrape_maps(self) -> List[MapData]:
        logger.info("Scraping SamoelColt map guides from Steam Workshop...")
        try:
            res = requests.get(self.STEAM_GUIDE_URL, verify=False, timeout=20)
            if res.status_code != 200:
                logger.warning(f"Failed to fetch Steam Workshop guide: HTTP {res.status_code}")
                return []
            soup = BeautifulSoup(res.text, "html.parser")
            maps: List[MapData] = []

            subsections = soup.find_all("div", class_="subSection")
            for sub in subsections:
                title_div = sub.find("div", class_="subSectionTitle")
                realm_name = title_div.get_text(strip=True) if title_div else "General Realm"
                if realm_name in ["Overview", "Comments", "General"]:
                    continue

                realm_slug = self.slugify(realm_name)
                lines = [text.strip() for text in sub.stripped_strings if text.strip() and text.strip() != realm_name]

                links = sub.find_all("a", class_="modalContentLink")
                for idx, link in enumerate(links):
                    href = link.get("href")
                    if href and "images.steamusercontent.com" in href:
                        map_name = f"{realm_name} Map {idx + 1}"
                        if idx < len(lines):
                            potential_name = lines[idx]
                            if len(potential_name) < 40 and not potential_name.startswith("http"):
                                map_name = potential_name

                        map_slug = self.slugify(map_name)
                        unique_id = f"samoel_{realm_slug}_{map_slug}_{idx + 1}"
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
                                clock_system={
                                    "description": f"SamoelColt Isometric Scheme for {map_name} ({realm_name}). Sector-based layout.",
                                    "twelve_o_clock": "North Sector",
                                    "three_o_clock": "East Sector",
                                    "six_o_clock": "South Sector",
                                    "nine_o_clock": "West Sector",
                                },
                                source="samoelcolt",
                                source_label="SamoelColt Isometric Scheme",
                            )
                        )
            logger.info(f"Scraped {len(maps)} SamoelColt maps from Steam Workshop.")
            return maps
        except Exception as e:
            logger.error(f"Error scraping SamoelColt maps: {e}")
            return []


class NightlightScraperDriver:
    SURVIVORS_API = "https://nightlight.gg/api/v1/stats/global/survivors"
    KILLERS_API = "https://nightlight.gg/api/v1/stats/global/killers"
    PERKS_LIST_URL = "https://nightlight.gg/perks/list"

    CDN_PORTRAITS_BASE = "https://cdn.nightlight.gg/img/portraits/"
    CDN_PERKS_BASE = "https://cdn.nightlight.gg/img/perks/"

    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://nightlight.gg/",
    }

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_dir = Path(base_dir)

    def fetch_nightlight_data(self, url: str) -> str:
        try:
            response = requests.get(
                url,
                headers=self.HEADERS,
                impersonate=self.IMPERSONATE_BROWSER,
                verify=True,
                timeout=self.REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            return response.text
        except Exception as err:
            err_msg = str(err).lower()
            if "certificate" in err_msg or "ssl" in err_msg or "curl: (60)" in err_msg:
                logger.warning(f"SSL certificate verification failed for {url}. Retrying with verify=False...")
                response = requests.get(
                    url,
                    headers=self.HEADERS,
                    impersonate=self.IMPERSONATE_BROWSER,
                    verify=False,
                    timeout=self.REQUEST_TIMEOUT,
                )
                response.raise_for_status()
                return response.text
            raise

    def parse_api_characters(self, survivors_payload: Any, killers_payload: Any) -> List[CharacterData]:
        characters: List[CharacterData] = []

        def process_items(payload: Any, category: str):
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except Exception:
                    return

            items = []
            if isinstance(payload, list):
                items = payload
            elif isinstance(payload, dict):
                data_val = payload.get("data")
                if isinstance(data_val, list):
                    items = data_val
                elif isinstance(data_val, dict):
                    items = data_val.get("survivors") or data_val.get("killers") or data_val.get("items") or []
                if not items:
                    items = payload.get("survivors") or payload.get("killers") or payload.get("items") or []

            for item in items:
                if not isinstance(item, dict):
                    continue

                name = item.get("name") or item.get("character_name") or item.get("title") or ""
                if not name:
                    continue

                name_lower = name.lower()
                if "overall_average" in name_lower or "overall average" in name_lower:
                    continue

                real_name = item.get("real_name") or name
                wiki_slug = item.get("wiki_slug") or item.get("slug") or item.get("id") or ScraperService.sanitize_filename(name)
                short_name = item.get("short_name") or ScraperService.sanitize_filename(name)

                raw_portrait = (
                    item.get("avatar_url")
                    or item.get("portrait_url")
                    or item.get("portrait")
                    or item.get("image")
                    or f"{short_name}.png"
                )

                if raw_portrait.startswith("http://") or raw_portrait.startswith("https://"):
                    avatar_url = raw_portrait
                else:
                    clean_portrait = raw_portrait.lstrip("/")
                    if clean_portrait.startswith("img/portraits/"):
                        avatar_url = f"https://cdn.nightlight.gg/{clean_portrait}"
                    elif clean_portrait.startswith("portraits/"):
                        avatar_url = f"https://cdn.nightlight.gg/img/{clean_portrait}"
                    else:
                        if not clean_portrait.endswith(".png") and "." not in clean_portrait:
                            clean_portrait = f"{clean_portrait}.png"
                        avatar_url = f"https://cdn.nightlight.gg/img/portraits/{clean_portrait}"

                sanitized = ScraperService.sanitize_filename(name)
                sub_dir = "survivors" if category == "Survivor" else "killers"
                local_path = f"avatars/{sub_dir}/{sanitized}.png"

                characters.append(
                    CharacterData(
                        name=name,
                        real_name=real_name,
                        wiki_slug=wiki_slug,
                        short_name=short_name,
                        category=category,
                        avatar_url=avatar_url,
                        avatar_local_path=local_path,
                    )
                )

        process_items(survivors_payload, "Survivor")
        process_items(killers_payload, "Killer")
        return characters

    def parse_nightlight_perks(
        self,
        chunk_js: str,
        stream_payload: str,
        characters: Optional[List[CharacterData]] = None,
        wiki_perks: Optional[List[PerkData]] = None,
    ) -> List[PerkData]:
        perks: List[PerkData] = []
        char_map: Dict[str, CharacterData] = {}
        if characters:
            for c in characters:
                char_map[c.name.lower()] = c
                char_map[c.short_name.lower()] = c
                char_map[c.wiki_slug.lower()] = c

        wiki_map: Optional[Dict[str, str]] = None
        if wiki_perks:
            wiki_map = {wp.name.lower(): wp.description for wp in wiki_perks if wp.name}

        descriptions: Dict[str, str] = {}
        if stream_payload:
            soup = BeautifulSoup(stream_payload, "html.parser")
            for el in soup.find_all(attrs={"data-perk": True}):
                pname = str(el["data-perk"]).replace("\\'", "'").replace('\\"', '"').strip()
                dtext = el.get_text(separator="\n", strip=True)
                if pname and dtext:
                    descriptions[pname] = dtext

            if not descriptions:
                for m in re.finditer(r'data-perk=["\']([^"\']+)["\'][^>]*>(.*?)(?=</div|<div|data-perk=|$)', stream_payload, re.DOTALL):
                    pname = m.group(1).replace("\\'", "'").replace('\\"', '"').strip()
                    dtext = BeautifulSoup(m.group(2), "html.parser").get_text(separator="\n", strip=True)
                    if pname and dtext:
                        descriptions[pname] = dtext

        raw_perks = []
        if isinstance(chunk_js, str):
            try:
                parsed = json.loads(chunk_js)
                if isinstance(parsed, list):
                    raw_perks = parsed
                elif isinstance(parsed, dict):
                    if "perks" in parsed or "data" in parsed:
                        raw_perks = parsed.get("perks") or parsed.get("data") or []
                    else:
                        raw_perks = [v for v in parsed.values() if isinstance(v, dict)]
            except Exception:
                pass

        if not raw_perks and isinstance(chunk_js, str):
            match = re.search(r'perks\s*:\s*(\[\s*\{.*?\}\s*\])', chunk_js, re.DOTALL)
            if match:
                try:
                    json_str = re.sub(r'(\b\w+\b)\s*:', r'"\1":', match.group(1))
                    json_str = re.sub(r':\s*\'([^\']*)\'', r': "\1"', json_str)
                    raw_perks = json.loads(json_str)
                except Exception:
                    pass

        if not raw_perks and isinstance(chunk_js, str):
            chars_dict = {}
            c_start = chunk_js.find('"10010":{"n":')
            if c_start != -1:
                for c_m in re.finditer(r'"(\d{4,5})":\s*(\{[^{}]*?"n"\s*:\s*"([^"]+)".*?\})', chunk_js):
                    cid = c_m.group(1)
                    cname = c_m.group(3)
                    chars_dict[cid] = cname

            seen_ids = set()
            for m in re.finditer(r'"(\d+)":\s*(\{[^{}]*?"n"\s*:\s*"([^"]+)".*?"u"\s*:\s*"/perks/([^"]+)".*?\})', chunk_js):
                pid = m.group(1)
                pname = m.group(3).replace('\\"', '"').replace("\\'", "'")
                u_slug = m.group(4)
                if pid in seen_ids:
                    continue
                seen_ids.add(pid)

                obj_text = m.group(2)
                i_m = re.search(r'"i"\s*:\s*"([^"]+)"', obj_text)
                r_m = re.search(r'"r"\s*:\s*(\d+)', obj_text)
                c_m = re.search(r'"c"\s*:\s*(-?\d+)', obj_text)

                icon_slug = i_m.group(1) if i_m else ""
                role_num = int(r_m.group(1)) if r_m else 1
                char_id = c_m.group(1) if c_m else "-1"

                role_str = "Survivor" if role_num == 1 else "Killer"
                char_name = chars_dict.get(char_id, "General") if char_id != "-1" else "General"

                raw_perks.append({
                    "name": pname,
                    "character": char_name,
                    "role": role_str,
                    "icon": icon_slug,
                    "u": f"/perks/{u_slug}",
                })

        if not raw_perks and isinstance(chunk_js, str):
            for m in re.finditer(r'\{\s*(?:[^{}]*?name\s*:\s*["\'](?P<name>[^"\']+)["\'][^{}]*?)\}', chunk_js, re.DOTALL):
                obj_text = m.group(0)
                name_m = re.search(r'name\s*:\s*["\']([^"\']+)["\']', obj_text)
                char_m = re.search(r'character\s*:\s*["\']([^"\']+)["\']', obj_text)
                role_m = re.search(r'role\s*:\s*["\']?([^"\'\s,}]+)["\']?', obj_text)
                icon_m = re.search(r'icon\s*:\s*["\']([^"\']+)["\']', obj_text)
                if name_m:
                    raw_perks.append({
                        "name": name_m.group(1),
                        "character": char_m.group(1) if char_m else "General",
                        "role": role_m.group(1) if role_m else "Survivor",
                        "icon": icon_m.group(1) if icon_m else "",
                    })

        for item in raw_perks:
            if not isinstance(item, dict):
                continue

            name = item.get("name") or item.get("perk_name") or item.get("title") or item.get("n") or ""
            if not name:
                continue
            # Normalize perk names: fix literal escape sequences from JS chunk encoding
            name = str(name).replace("\\xA0", " ").replace("\\xa0", " ").replace("\\u00a0", " ")
            name = name.replace("\u00a0", " ").replace("\u2019", "'").replace("\u2018", "'")
            name = name.replace("\u2013", "-").replace("\u2014", "-")
            name = name.strip()

            u_val = item.get("u")
            if u_val is not None:
                u_str = str(u_val)
                if not (u_str.startswith("/perks/") or "/perks/" in u_str):
                    continue

            k_val = item.get("k")
            if k_val is not None:
                k_str = str(k_val).lower()
                if k_str in ["addon", "item"]:
                    continue

            role_val = str(item.get("role") or item.get("category") or "Survivor").lower()
            if role_val in ["survivor", "1", "s"]:
                category = "Survivor"
            elif role_val in ["killer", "2", "k"]:
                category = "Killer"
            else:
                category = "Survivor"

            override_char = TEACHABLE_PERK_OVERRIDE.get(name.lower())
            if override_char:
                matched_char = char_map.get(override_char.lower())
            else:
                char_input = item.get("character") or item.get("character_name") or item.get("owner") or "General"
                matched_char = char_map.get(str(char_input).lower())

            if wiki_perks:
                wp_match = next((wp for wp in wiki_perks if wp.name and wp.name.lower() == name.lower()), None)
                if wp_match and wp_match.character and wp_match.character.lower() not in ["none", "all", "general"]:
                    matched_char = char_map.get(wp_match.character.lower()) or char_map.get(wp_match.character.split()[-1].lower()) or matched_char

            if matched_char:
                canonical_name = matched_char.name
                real_name = matched_char.real_name
                avatar_path = matched_char.avatar_local_path
            else:
                canonical_name = str(char_input) if char_input and char_input.lower() not in ["none", "all", "general"] else "General"
                real_name = canonical_name
                avatar_path = ""

            desc = descriptions.get(name) or descriptions.get(name.replace("\\'", "'")) or ""
            if not desc and stream_payload:
                idx = stream_payload.find(name)
                if idx != -1:
                    snippet = stream_payload[idx:idx + 300]
                    desc = BeautifulSoup(snippet, "html.parser").get_text(separator="\n", strip=True)

            clean_desc = ScraperService.clean_description_text(desc)
            is_garbage = (
                not clean_desc 
                or len(clean_desc) < 20 
                or "unavailable" in clean_desc.lower()
                or "Survivor\n-" in clean_desc 
                or "Killer\n-" in clean_desc 
                or "This description is based on" in clean_desc
                or re.match(r'^[A-Za-z0-9_\'\s\-"]+\s+(?:Survivor|Killer)', clean_desc)
            )
            if is_garbage and wiki_map:
                wiki_val = wiki_map.get(name.lower())
                if wiki_val:
                    clean_desc = ScraperService.clean_description_text(wiki_val)

            raw_icon = (
                item.get("icon")
                or item.get("icon_slug")
                or item.get("slug")
                or ScraperService.sanitize_filename(name)
            )

            if raw_icon.startswith("http://") or raw_icon.startswith("https://"):
                icon_url = raw_icon
            else:
                clean_icon = raw_icon.lstrip("/")
                if clean_icon.startswith("img/perks/"):
                    icon_url = f"https://cdn.nightlight.gg/{clean_icon}"
                elif clean_icon.startswith("perks/"):
                    icon_url = f"https://cdn.nightlight.gg/img/{clean_icon}"
                else:
                    if not clean_icon.endswith(".png") and "." not in clean_icon:
                        clean_icon = f"{clean_icon}.png"
                    icon_url = f"https://cdn.nightlight.gg/img/perks/{clean_icon}"

            sanitized_name = ScraperService.sanitize_filename(name)
            sanitized_char = ScraperService.sanitize_filename(canonical_name)
            category_dir = "survivors" if category == "Survivor" else "killers"
            if canonical_name == "General":
                local_rel_path = f"icons/{category_dir}/General/{sanitized_name}.png"
            else:
                local_rel_path = f"icons/{category_dir}/{sanitized_char}/{sanitized_name}.png"

            perks.append(
                PerkData(
                    name=name,
                    character=canonical_name,
                    character_real_name=real_name,
                    character_avatar_path=avatar_path,
                    category=category,
                    description=clean_desc,
                    icon_url=icon_url,
                    icon_local_path=local_rel_path,
                )
            )

        return perks

    def parse_nightlight_items_and_addons(
        self,
        chunk_js: str,
        stream_payload: str,
        characters: Optional[List[CharacterData]] = None,
    ) -> Tuple[List[ItemData], List[AddonData]]:
        items: List[ItemData] = []
        addons: List[AddonData] = []
        char_map: Dict[str, CharacterData] = {}
        if characters:
            for c in characters:
                char_map[c.name.lower()] = c
                char_map[c.short_name.lower()] = c
                char_map[c.wiki_slug.lower()] = c

        item_descriptions: Dict[str, str] = {}
        addon_descriptions: Dict[str, str] = {}
        descriptions: Dict[str, str] = {}

        if stream_payload:
            soup = BeautifulSoup(stream_payload, "html.parser")
            for el in soup.find_all(attrs={"data-item": True}):
                iname = str(el["data-item"]).replace("\'", "'").replace('\"', '"').strip()
                dtext = el.get_text(separator="\n", strip=True)
                if iname and dtext:
                    item_descriptions[iname] = dtext
            for el in soup.find_all(attrs={"data-addon": True}):
                aname = str(el["data-addon"]).replace("\'", "'").replace('\"', '"').strip()
                dtext = el.get_text(separator="\n", strip=True)
                if aname and dtext:
                    addon_descriptions[aname] = dtext

        raw_objects = []
        if isinstance(chunk_js, str):
            try:
                parsed = json.loads(chunk_js)
                if isinstance(parsed, list):
                    raw_objects = parsed
                elif isinstance(parsed, dict):
                    if "items" in parsed or "addons" in parsed or "data" in parsed:
                        raw_objects = (parsed.get("items") or []) + (parsed.get("addons") or []) + (parsed.get("data") or [])
                    else:
                        raw_objects = [v for v in parsed.values() if isinstance(v, dict)]
            except Exception:
                pass

        if not raw_objects and isinstance(chunk_js, str):
            seen_ids = set()
            for m in re.finditer(r'"(\d+)":\s*(\{[^{}]*?"n"\s*:\s*"([^"]+)".*?\})', chunk_js):
                pid = m.group(1)
                if pid in seen_ids:
                    continue
                seen_ids.add(pid)
                obj_text = m.group(2)
                n_m = re.search(r'"n"\s*:\s*"([^"]+)"', obj_text)
                i_m = re.search(r'"i"\s*:\s*"([^"]+)"', obj_text)
                u_m = re.search(r'"u"\s*:\s*"([^"]*)"', obj_text)
                k_m = re.search(r'"k"\s*:\s*"([^"]*)"', obj_text)
                r_m = re.search(r'"r"\s*:\s*(\d+)', obj_text)
                c_m = re.search(r'"c"\s*:\s*(-?\d+|"[^"]*")', obj_text)
                rar_m = re.search(r'"rar(?:ity)?"\s*:\s*"([^"]*)"', obj_text)

                if n_m:
                    raw_objects.append({
                        "name": n_m.group(1).replace('\"', '"').replace("\'", "'"),
                        "icon": i_m.group(1) if i_m else "",
                        "u": u_m.group(1) if u_m else "",
                        "k": k_m.group(1) if k_m else "",
                        "role": int(r_m.group(1)) if r_m else 1,
                        "character": c_m.group(1).replace('"', '') if c_m else "General",
                        "rarity": rar_m.group(1) if rar_m else "",
                    })

        for entry in raw_objects:
            if not isinstance(entry, dict):
                continue
            name = entry.get("name") or entry.get("n") or entry.get("title") or ""
            if not name:
                continue

            u_val = str(entry.get("u") or "").lower()
            k_val = str(entry.get("k") or "").lower()

            is_item = u_val.startswith("/items/") or "/items/" in u_val or k_val == "item"
            is_addon = u_val.startswith("/addons/") or "/addons/" in u_val or k_val == "addon"

            role_val = str(entry.get("role") or entry.get("r") or "Survivor").lower()
            role_str = "Survivor" if role_val in ["survivor", "1", "s"] else "Killer"

            raw_icon = entry.get("icon") or entry.get("i") or entry.get("slug") or ScraperService.sanitize_filename(name)
            rarity = entry.get("rarity") or entry.get("rar") or ""

            if is_item:
                desc = item_descriptions.get(name) or descriptions.get(name) or ""
                if raw_icon.startswith("http://") or raw_icon.startswith("https://"):
                    icon_url = raw_icon
                else:
                    clean_icon = raw_icon.lstrip("/")
                    if not clean_icon.endswith(".png") and "." not in clean_icon:
                        clean_icon = f"{clean_icon}.png"
                    if clean_icon.startswith("img/items/"):
                        icon_url = f"https://cdn.nightlight.gg/{clean_icon}"
                    else:
                        icon_url = f"https://cdn.nightlight.gg/img/items/{clean_icon}"

                sanitized = ScraperService.sanitize_filename(name)
                items.append(
                    ItemData(
                        name=name,
                        category=role_str,
                        role=role_str,
                        description=desc,
                        icon_url=icon_url,
                        icon_local_path=f"icons/items/{sanitized}.png",
                        rarity=rarity,
                    )
                )

            elif is_addon:
                desc = addon_descriptions.get(name) or descriptions.get(name) or ""
                target_raw = entry.get("associated_target") or entry.get("c") or entry.get("character") or entry.get("target") or "General"
                matched_char = char_map.get(str(target_raw).lower())
                target_name = matched_char.name if matched_char else str(target_raw)

                if raw_icon.startswith("http://") or raw_icon.startswith("https://"):
                    icon_url = raw_icon
                else:
                    clean_icon = raw_icon.lstrip("/")
                    if not clean_icon.endswith(".png") and "." not in clean_icon:
                        clean_icon = f"{clean_icon}.png"
                    if clean_icon.startswith("img/addons/"):
                        icon_url = f"https://cdn.nightlight.gg/{clean_icon}"
                    else:
                        icon_url = f"https://cdn.nightlight.gg/img/addons/{clean_icon}"

                sanitized = ScraperService.sanitize_filename(name)
                addons.append(
                    AddonData(
                        name=name,
                        associated_target=target_name,
                        category=role_str,
                        description=desc,
                        icon_url=icon_url,
                        icon_local_path=f"icons/addons/{sanitized}.png",
                        rarity=rarity,
                    )
                )

        return items, addons

    def fetch_nightlight_perk_descriptions(self, perks: List[PerkData]) -> Dict[str, str]:
        """Fetch full perk description from each Nightlight perk page.
        Extracts from the active tab-pane div (current patch description) for complete, untruncated text.
        Falls back to meta description if the tab-pane content is unavailable."""
        GENERIC_MARKERS = [
            "Track DBD stats",
            "Dead by Daylight Stat Tracker",
            "Nightlight.gg",
            "custom icons",
        ]

        def name_to_slugs(name: str):
            """Generate candidate Nightlight URL slugs for a perk name.
            Nightlight uses original casing with spaces replaced by underscores,
            and URL-encodes special chars like apostrophes (%27), ampersands (&), etc.
            """
            import urllib.parse
            # Normalize unicode mojibake back to ASCII-safe chars
            clean = name.replace("\u2019", "'").replace("\u2018", "'").replace(
                "\u2013", "-").replace("\u2014", "-").replace("\u00a0", " ")
            # Handle literal escape sequences that appear as strings (encoding corruption)
            clean = clean.replace("\\xA0", " ").replace("\\xa0", " ").replace("\\u00a0", " ")

            candidates = []
            # Strategy 1: preserve casing, replace spaces with _, keep other chars
            s1 = re.sub(r" +", "_", clean)
            candidates.append(s1)

            # Strategy 2: URL-encode all non-alphanumeric non-underscore chars
            s2 = urllib.parse.quote(re.sub(r" +", "_", clean), safe="_-.")
            if s2 != s1:
                candidates.append(s2)

            # Strategy 3: strip all non-alphanum-underscore
            s3 = re.sub(r"[^a-zA-Z0-9_]+", "_", re.sub(r" +", "_", clean)).strip("_")
            if s3 not in candidates:
                candidates.append(s3)

            # Strategy 4: strip trailing punctuation (for "Come and Get Me!")
            s4 = re.sub(r"[^a-zA-Z0-9_]+", "_", re.sub(r" +", "_", clean.rstrip("!?."))).strip("_")
            if s4 not in candidates:
                candidates.append(s4)

            # Strategy 5: URL-encode the full name including non-breaking spaces (%C2%A0 etc.)
            raw_name = name  # use original bytes with unicode, not cleaned
            s5 = urllib.parse.quote(re.sub(r" ", "_", raw_name), safe="_-")
            if s5 not in candidates:
                candidates.append(s5)

            return candidates

        def fetch_one(name: str, slugs) -> Tuple[str, str]:
            for slug in slugs:
                url = f"https://nightlight.gg/perks/{slug}"
                try:
                    html_text = self.fetch_nightlight_data(url)
                    soup = BeautifulSoup(html_text, "html.parser")

                    # Verify we're on a real perk page (not the homepage)
                    meta = soup.find("meta", attrs={"name": "description"})
                    if meta and any(m in str(meta.get("content", "")) for m in GENERIC_MARKERS):
                        continue  # Homepage redirect — try next slug

                    # Extract full description from the ACTIVE tab panel.
                    # Nightlight shows description history as tabs; the current description
                    # is inside the tab-pane with class "active show".
                    full_desc = ""
                    active_pane = soup.find(
                        "div",
                        class_=lambda c: c and "tab-pane" in c and "active" in c and "show" in c,
                    )
                    if active_pane:
                        # First child div contains the description paragraphs
                        desc_div = active_pane.find("div", recursive=False)
                        if desc_div:
                            paragraphs = desc_div.find_all("p", recursive=False)
                            lines = []
                            for p in paragraphs:
                                text = p.get_text(" ", strip=True)
                                if text:
                                    lines.append(text)
                            full_desc = "\n".join(lines).strip()

                    # Fallback: use meta description (truncated but better than nothing)
                    if not full_desc and meta and meta.get("content"):
                        full_desc = str(meta["content"]).strip()
                        if any(m in full_desc for m in GENERIC_MARKERS):
                            full_desc = ""

                    if full_desc:
                        return name, full_desc
                except Exception:
                    pass
            return name, ""

        descriptions: Dict[str, str] = {}
        seen: set = set()
        tasks = []
        for perk in perks:
            key = perk.name.lower()
            if key not in seen:
                seen.add(key)
                tasks.append((perk.name, name_to_slugs(perk.name)))

        logger.info(f"Fetching Nightlight perk descriptions for {len(tasks)} perks...")
        with ThreadPoolExecutor(max_workers=12) as executor:
            futures = {executor.submit(fetch_one, name, slugs): name for name, slugs in tasks}
            for future in as_completed(futures):
                name, desc = future.result()
                if desc:
                    descriptions[name.lower()] = desc

        logger.info(f"Fetched Nightlight descriptions for {len(descriptions)}/{len(tasks)} perks.")
        return descriptions

    def scrape_all(self) -> Tuple[List[CharacterData], List[PerkData]]:
        logger.info("Scraping Nightlight.gg data...")
        survivors_raw = self.fetch_nightlight_data(self.SURVIVORS_API)
        killers_raw = self.fetch_nightlight_data(self.KILLERS_API)
        characters = self.parse_api_characters(survivors_raw, killers_raw)

        perks_page_html = self.fetch_nightlight_data(self.PERKS_LIST_URL)

        chunk_text = ""
        manifest_match = re.search(r'window\.__reactRouterManifest\s*=\s*(\{.*?\});', perks_page_html, re.DOTALL)
        if manifest_match:
            try:
                manifest = json.loads(manifest_match.group(1))
                for r_name, r_data in manifest.get("routes", {}).items():
                    for imp in r_data.get("imports", []):
                        if "chunk-" in imp:
                            try:
                                c_text = self.fetch_nightlight_data(f"https://nightlight.gg{imp}")
                                if '{"1":{"n":' in c_text or '"Sprint_Burst"' in c_text:
                                    chunk_text = c_text
                                    break
                            except Exception:
                                pass
                    if chunk_text:
                        break
            except Exception:
                pass

        # Use Wiki only for character-to-perk ownership mapping (not descriptions)
        wiki_perks = []
        try:
            wiki_driver = WikiScraperDriver(self.base_dir)
            wiki_html = wiki_driver.fetch_html(wiki_driver.PERKS_URL)
            wiki_perks = wiki_driver.parse_perks(wiki_html, characters)
        except Exception as w_err:
            logger.warning(f"Wiki perks lookup for character mapping failed: {w_err}")

        perks = self.parse_nightlight_perks(chunk_text, perks_page_html, characters=characters, wiki_perks=wiki_perks)

        # Fetch ALL perk descriptions directly from Nightlight individual perk pages
        nl_descriptions = self.fetch_nightlight_perk_descriptions(perks)
        enriched_perks = []
        for p in perks:
            nl_desc = nl_descriptions.get(p.name.lower(), "")
            if nl_desc:
                p.description = nl_desc
            enriched_perks.append(p)
        perks = enriched_perks

        items, addons = self.parse_nightlight_items_and_addons(chunk_text, perks_page_html, characters=characters)
        if len(items) < 5 or len(addons) < 5:
            try:
                wiki_driver = WikiScraperDriver(self.base_dir)
                if len(items) < 5:
                    w_items_html = wiki_driver.fetch_html(wiki_driver.ITEMS_URL)
                    items = wiki_driver.parse_wiki_items(w_items_html)
                if len(addons) < 5:
                    w_addons_html = wiki_driver.fetch_html(wiki_driver.ADDONS_URL)
                    addons = wiki_driver.parse_wiki_addons(w_addons_html)
            except Exception as w_err:
                logger.warning(f"Wiki fallback for items/addons failed: {w_err}")

        return characters, perks, items, addons


class WikiScraperDriver:
    PERKS_URL = "https://deadbydaylight.fandom.com/wiki/Perks"
    SURVIVORS_URL = "https://deadbydaylight.fandom.com/wiki/Survivors"
    KILLERS_URL = "https://deadbydaylight.fandom.com/wiki/Killers"
    ITEMS_URL = "https://deadbydaylight.fandom.com/wiki/Items"
    ADDONS_URL = "https://deadbydaylight.fandom.com/wiki/Add-ons"

    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://deadbydaylight.fandom.com/wiki/Dead_by_Daylight_Wiki",
    }

    PORTRAIT_PATTERN = re.compile(r"^(K|S)(\d+)_.*_Portrait", re.ASCII)
    ROLE_BY_PREFIX = {"K": "Killer", "S": "Survivor"}

    EXCLUDED_SLUGS = {
        "entity", "generator", "hatch", "chest", "item", "perk", "perks", "killers",
        "survivors", "tome", "observer", "vigo", "void", "stagger", "hook", "obsession",
        "blindness", "exhausted", "mangled", "broken", "exposed", "hindered", "oblivious",
        "aura", "scratch_marks", "pools_of_blood", "terror_radius", "basement",
        "exit_gate_switch", "skill_check", "loud_noise_notification", "conspicuous_action",
        "health_state", "injured_state", "protection_hit", "special_attack", "special_attacks",
        "crow", "window", "med-kit", "med-kits", "toolbox", "flashlight", "flashlights",
        "key", "keys", "add-on", "add-ons", "playing_survivor:_tips_and_tricks",
        "characters", "the_campfire", "status_effects", "realm", "realms", "map", "maps"
    }

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_dir = Path(base_dir)

    def fetch_html(self, url: str) -> str:
        try:
            response = requests.get(
                url,
                headers=self.HEADERS,
                impersonate=self.IMPERSONATE_BROWSER,
                verify=True,
                timeout=self.REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            return response.text
        except Exception as err:
            err_msg = str(err).lower()
            if "certificate" in err_msg or "ssl" in err_msg or "curl: (60)" in err_msg:
                logger.warning(f"SSL certificate verification failed for {url}. Retrying with verify=False...")
                response = requests.get(
                    url,
                    headers=self.HEADERS,
                    impersonate=self.IMPERSONATE_BROWSER,
                    verify=False,
                    timeout=self.REQUEST_TIMEOUT,
                )
                response.raise_for_status()
                return response.text
            raise

    def scrape_characters_dynamically(self) -> List[CharacterData]:
        characters: List[CharacterData] = []
        seen_slugs = set()

        def process_page(url: str, category: str):
            try:
                logger.info(f"Scraping {category} index page directly...")
                html = self.fetch_html(url)
                soup = BeautifulSoup(html, "html.parser")
                content = soup.find("div", class_="mw-parser-output") or soup

                for link in content.find_all("a", href=re.compile(r"^/wiki/")):
                    href = link.get("href", "")
                    slug = ScraperService.extract_slug_from_href(href)
                    slug_lower = slug.lower()

                    if not slug or slug_lower in seen_slugs or slug_lower in self.EXCLUDED_SLUGS:
                        continue

                    if slug.startswith(("Category:", "File:", "Special:", "Dead_by_Daylight", "Help:", "User:", "Template:", "Tome")):
                        continue

                    img = link.find("img")
                    if not img:
                        continue

                    avatar_url = ScraperService.extract_high_res_url(img)
                    if not avatar_url:
                        continue

                    title = link.get("title", "").strip() or link.get_text().strip()
                    full_name = title.replace("_", " ").strip()

                    if not full_name or len(full_name) > 50:
                        continue

                    if any(x in slug_lower for x in ["perk", "item", "addon", "power", "patch", "dlc", "store", "tips"]):
                        continue

                    seen_slugs.add(slug_lower)
                    sanitized = ScraperService.sanitize_filename(full_name)
                    sub_dir = "survivors" if category == "Survivor" else "killers"

                    characters.append(
                        CharacterData(
                            name=full_name,
                            real_name=full_name,
                            wiki_slug=slug,
                            short_name=slug_lower,
                            category=category,
                            avatar_url=avatar_url,
                            avatar_local_path=f"avatars/{sub_dir}/{sanitized}.png",
                        )
                    )
            except Exception as e:
                logger.error(f"Error scraping {category} page: {e}")

        process_page(self.SURVIVORS_URL, "Survivor")
        process_page(self.KILLERS_URL, "Killer")

        return characters

    CHARACTER_ALIASES = {
        "ash": "Ashley J. Williams",
        "ash williams": "Ashley J. Williams",
        "ashley williams": "Ashley J. Williams",
        "ashley j. williams": "Ashley J. Williams",
        "nancy": "Nancy Wheeler",
        "nancy wheeler": "Nancy Wheeler",
        "steve": "Steve Harrington",
        "steve harrington": "Steve Harrington",
        "bill": "William \"Bill\" Overbeck",
        "bill overbeck": "William \"Bill\" Overbeck",
        "william bill overbeck": "William \"Bill\" Overbeck",
        "william \"bill\" overbeck": "William \"Bill\" Overbeck",
        "quentin": "Quentin Smith",
        "quentin smith": "Quentin Smith",
        "tapp": "Detective Tapp",
        "detective tapp": "Detective Tapp",
        "david tapp": "Detective Tapp",
        "adam": "Adam Francis",
        "adam francis": "Adam Francis",
        "jeff": "Jeff Johansen",
        "jeff johansen": "Jeff Johansen",
        "jane": "Jane Romero",
        "jane romero": "Jane Romero",
        "yui": "Yui Kimura",
        "yui kimura": "Yui Kimura",
        "zarina": "Zarina Kassir",
        "zarina kassir": "Zarina Kassir",
        "cheryl": "Cheryl Mason",
        "heather": "Cheryl Mason",
        "cheryl mason": "Cheryl Mason",
        "felix": "Felix Richter",
        "felix richter": "Felix Richter",
        "elodie": "Elodie Rakoto",
        "élodie": "Elodie Rakoto",
        "elodie rakoto": "Elodie Rakoto",
        "élodie rakoto": "Elodie Rakoto",
        "yun-jin": "Lee Yun-Jin",
        "yun-jin lee": "Lee Yun-Jin",
        "yunjin": "Lee Yun-Jin",
        "yunjin lee": "Lee Yun-Jin",
        "lee yun-jin": "Lee Yun-Jin",
        "mikaela": "Mikaela Reid",
        "mikaela reid": "Mikaela Reid",
        "jonah": "Jonah Vasquez",
        "jonah vasquez": "Jonah Vasquez",
        "yoichi": "Yoichi Asakawa",
        "yoichi asakawa": "Yoichi Asakawa",
        "haddie": "Haddie Kaur",
        "haddie kaur": "Haddie Kaur",
        "ada": "Ada Wong",
        "ada wong": "Ada Wong",
        "rebecca": "Rebecca Chambers",
        "rebecca chambers": "Rebecca Chambers",
        "vittorio": "Vittorio Toscano",
        "vittorio toscano": "Vittorio Toscano",
        "thalita": "Thalita Lyra",
        "thalita lyra": "Thalita Lyra",
        "renato": "Renato Lyra",
        "renato lyra": "Renato Lyra",
        "gabriel": "Gabriel Soma",
        "gabriel soma": "Gabriel Soma",
        "nicolas": "Nicolas Cage",
        "nicolas cage": "Nicolas Cage",
        "ellen": "Ellen Ripley",
        "ellen ripley": "Ellen Ripley",
        "ripley": "Ellen Ripley",
        "sable": "Sable Ward",
        "sable ward": "Sable Ward",
        "estranho": "The Unknown",
        "alan": "Alan Wake",
        "alan wake": "Alan Wake",
        "lara": "Lara Croft",
        "lara croft": "Lara Croft",
        "trevor": "Trevor Belmont",
        "trevor belmont": "Trevor Belmont",
        "orela": "Orela Rose",
        "orela rose": "Orela Rose",
        "taurie": "Taurie Cain",
        "taurie cain": "Taurie Cain",
        "leon": "Leon S. Kennedy",
        "leon kennedy": "Leon S. Kennedy",
        "leon s. kennedy": "Leon S. Kennedy",
        "jill": "Jill Valentine",
        "jill valentine": "Jill Valentine",
        "aestri": "Aestri Yazar",
        "baermar": "Aestri Yazar",
        "aestri yazar": "Aestri Yazar",
        "baermar uraz": "Aestri Yazar",
        "aestri yazar & baermar uraz": "Aestri Yazar",
        "the troupe": "Aestri Yazar",
        "bard": "Aestri Yazar",
        "giri": "Giri",
        "trouster": "Trouster",
    }


    def parse_perks(self, html_content: str, characters: List[CharacterData]) -> List[PerkData]:
        soup = BeautifulSoup(html_content, "html.parser")
        perks: List[PerkData] = []
        current_category: Optional[str] = None
        content_area = soup.find("div", class_="mw-parser-output") or soup

        char_by_slug = {}
        char_by_name = {}
        for c in characters:
            aliases = [c.name, c.real_name]
            if c.name:
                aliases.append(f"The {c.name}")
                if c.name.startswith("The "):
                    aliases.append(c.name[4:])
            for alias in aliases:
                if alias:
                    char_by_name.setdefault(alias.lower(), c)

            slugs = [c.wiki_slug]
            if c.wiki_slug and c.wiki_slug.startswith("The_"):
                slugs.append(c.wiki_slug[4:])
            elif c.wiki_slug:
                slugs.append(f"The_{c.wiki_slug}")
            for slug in slugs:
                if slug:
                    char_by_slug.setdefault(slug.lower(), c)

        char_by_short = {c.short_name.lower(): c for c in characters if c.short_name}

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
                        icon_tag = cells[0].find("img")
                        icon_url = ScraperService.extract_high_res_url(icon_tag)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        perk_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()

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
                        description = ScraperService.clean_description_text(raw_description)

                        canonical_name = "General"
                        real_name = "General"
                        avatar_path = ""

                        if len(cells) >= 4:
                            owner_cell = cells[3]
                            owner_link = owner_cell.find("a")

                            matched = None
                            if owner_link:
                                href = owner_link.get("href", "")
                                link_title = owner_link.get("title", "").strip().lower()
                                slug = ScraperService.extract_slug_from_href(href).lower()
                                alias_target = self.CHARACTER_ALIASES.get(link_title) or self.CHARACTER_ALIASES.get(slug)
                                if alias_target:
                                    matched = char_by_name.get(alias_target.lower())
                                if not matched:
                                    matched = char_by_slug.get(slug) or char_by_name.get(link_title) or char_by_short.get(link_title)

                            if not matched:
                                raw_text = owner_cell.get_text().strip()
                                clean_text = re.sub(r"^[.\s\-–]+|[.\s\-–]+$", "", raw_text).strip().lower()

                                if clean_text and clean_text not in ["all", "general", "none", "-", "all survivors", "all killers"]:
                                    alias_target = self.CHARACTER_ALIASES.get(clean_text)
                                    if alias_target:
                                        matched = char_by_name.get(alias_target.lower())
                                    if not matched:
                                        matched = char_by_short.get(clean_text) or char_by_name.get(clean_text) or char_by_slug.get(clean_text)
                                        if not matched:
                                            matched = char_by_name.get(f"the {clean_text}") or char_by_short.get(f"the {clean_text}")

                            if matched:
                                canonical_name = matched.name
                                real_name = matched.real_name
                                avatar_path = matched.avatar_local_path

                        if not perk_name:
                            continue

                        sanitized_name = ScraperService.sanitize_filename(perk_name)
                        category_dir = "survivors" if current_category == "Survivor" else "killers"

                        if canonical_name == "General":
                            local_rel_path = f"icons/{category_dir}/General/{sanitized_name}.png"
                        else:
                            local_rel_path = f"icons/{category_dir}/{canonical_name}/{sanitized_name}.png"

                        perks.append(
                            PerkData(
                                name=perk_name,
                                character=canonical_name,
                                character_real_name=real_name,
                                character_avatar_path=avatar_path,
                                category=current_category,
                                description=description,
                                icon_url=icon_url,
                                icon_local_path=local_rel_path,
                            )
                        )
                    except Exception:
                        continue
        return perks


    def parse_wiki_items(self, html_content: str) -> List[ItemData]:
        soup = BeautifulSoup(html_content, "html.parser")
        items: List[ItemData] = []
        content_area = soup.find("div", class_="mw-parser-output") or soup
        current_category = "Survivor"

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                htext = element.get_text().lower()
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
                        icon_url = ScraperService.extract_high_res_url(img_tag)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        item_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                        if not item_name:
                            continue

                        name_lower = item_name.lower().strip()
                        HEADER_EXCLUSIONS = {
                            "uncommon items", "rare items", "very rare items", "ultra rare items",
                            "common items", "event items", "unused item", "limited items",
                            "survivor items", "killer items", "items", "add-ons", "addons", "equipment"
                        }
                        if name_lower in HEADER_EXCLUSIONS or name_lower.endswith(" items") or name_lower.endswith(" add-ons"):
                            continue

                        rarity = ""
                        description = ""
                        if len(cells) >= 4:
                            rarity = cells[2].get_text().strip()
                            description = cells[3].get_text(separator="\n", strip=True)
                        elif len(cells) == 3:
                            description = cells[2].get_text(separator="\n", strip=True)

                        description = ScraperService.clean_description_text(description)

                        if not rarity:
                            for r_word in ["Ultra Rare", "Very Rare", "Rare", "Uncommon", "Common", "Event", "Iridescent"]:
                                if r_word.lower() in description.lower():
                                    rarity = r_word
                                    break

                        sanitized = ScraperService.sanitize_filename(item_name)
                        local_path = f"icons/items/{sanitized}.png"

                        items.append(
                            ItemData(
                                name=item_name,
                                category=current_category,
                                role=current_category,
                                description=description,
                                icon_url=icon_url,
                                icon_local_path=local_path,
                                rarity=rarity,
                            )
                        )
                    except Exception:
                        continue
        return items

    def parse_wiki_addons(self, html_content: str) -> List[AddonData]:
        soup = BeautifulSoup(html_content, "html.parser")
        addons: List[AddonData] = []
        content_area = soup.find("div", class_="mw-parser-output") or soup
        current_target = "General"
        current_category = "Survivor"

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                htext = element.get_text().strip()
                htext_lower = htext.lower()
                if "killer" in htext_lower:
                    current_category = "Killer"
                elif "survivor" in htext_lower:
                    current_category = "Survivor"

                target_clean = re.sub(r"\s+(?:Add-ons|Addons)$", "", htext, flags=re.IGNORECASE).strip()
                if target_clean and target_clean.lower() not in ["survivor", "killer", "general", "common", "uncommon", "rare", "very rare", "ultra rare"]:
                    current_target = target_clean

            elif element.name == "table" and "wikitable" in element.get("class", []):
                rows = element.find_all("tr")
                for row in rows[1:]:
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 2:
                        continue
                    try:
                        img_tag = cells[0].find("img")
                        icon_url = ScraperService.extract_high_res_url(img_tag)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        addon_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                        if not addon_name:
                            continue

                        rarity = ""
                        description = ""
                        if len(cells) >= 4:
                            rarity = cells[2].get_text().strip()
                            description = cells[3].get_text(separator="\n", strip=True)
                        elif len(cells) == 3:
                            description = cells[2].get_text(separator="\n", strip=True)

                        if not rarity:
                            for r_word in ["Ultra Rare", "Very Rare", "Rare", "Uncommon", "Common", "Event", "Iridescent"]:
                                if r_word.lower() in description.lower():
                                    rarity = r_word
                                    break

                        sanitized = ScraperService.sanitize_filename(addon_name)
                        local_path = f"icons/addons/{sanitized}.png"

                        addons.append(
                            AddonData(
                                name=addon_name,
                                associated_target=current_target,
                                category=current_category,
                                description=description,
                                icon_url=icon_url,
                                icon_local_path=local_path,
                                rarity=rarity,
                            )
                        )
                    except Exception:
                        continue
        return addons

    def scrape_all(self) -> Tuple[List[CharacterData], List[PerkData], List[ItemData], List[AddonData]]:
        logger.info("Scraping Fandom Wiki data...")
        characters = self.scrape_characters_dynamically()
        html = self.fetch_html(self.PERKS_URL)
        perks = self.parse_perks(html, characters)
        try:
            html_items = self.fetch_html(self.ITEMS_URL)
            items = self.parse_wiki_items(html_items)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki items: {e}")
            items = []
        try:
            html_addons = self.fetch_html(self.ADDONS_URL)
            addons = self.parse_wiki_addons(html_addons)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki addons: {e}")
            addons = []
        return characters, perks, items, addons


class ScraperService:
    PERKS_URL = WikiScraperDriver.PERKS_URL
    SURVIVORS_URL = WikiScraperDriver.SURVIVORS_URL
    KILLERS_URL = WikiScraperDriver.KILLERS_URL

    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30
    MAX_CONCURRENT_DOWNLOADS = 10

    HEADERS = WikiScraperDriver.HEADERS
    _lock = threading.Lock()
    _status: Dict[str, Any] = {
        "is_running": False,
        "progress": 0,
        "total": 0,
        "current_step": "idle",
        "last_run": None,
        "error": None,
        "fallback_used": False,
        "last_used_source": "nightlight",
    }

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_dir = Path(base_dir)
        self.data_file = self.base_dir / "data" / "perks.json"
        self.characters_file = self.base_dir / "data" / "characters.json"
        self.items_file = self.base_dir / "data" / "items.json"
        self.addons_file = self.base_dir / "data" / "addons.json"
        self.maps_file = self.base_dir / "data" / "maps.json"
        self.config_file = self.base_dir / "data" / "scraper_config.json"
        self.static_dir = self.base_dir / "app" / "static"
        self.nightlight_driver = NightlightScraperDriver(self.base_dir)
        self.wiki_driver = WikiScraperDriver(self.base_dir)
        self.hens_map_driver = HensMapScraperDriver()
        self.samoel_map_driver = SamoelColtMapScraperDriver()

    def load_config(self) -> ScraperConfig:
        if not self.config_file.exists():
            return ScraperConfig()
        try:
            with open(self.config_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return ScraperConfig.from_dict(data)
        except Exception as e:
            logger.error(f"Error loading scraper config: {e}")
            return ScraperConfig()

    def save_config(self, data: Union[ScraperConfig, Dict[str, Any]]) -> ScraperConfig:
        if isinstance(data, ScraperConfig):
            config_obj = data
        elif isinstance(data, dict):
            current_dict = self.load_config().to_dict()
            current_dict.update(data)
            config_obj = ScraperConfig.from_dict(current_dict)
        else:
            raise ValueError("Data must be a ScraperConfig instance or a dict")

        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(config_obj.to_dict(), f, indent=2, ensure_ascii=False)

        return config_obj

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        with cls._lock:
            return cls._status.copy()

    @classmethod
    def _update_status(cls, **kwargs) -> None:
        with cls._lock:
            cls._status.update(kwargs)

    @staticmethod
    def clean_description_text(text: str) -> str:
        if not text or not isinstance(text, str):
            return ""

        cleaned = re.sub(r"<[^>]+>", "", text)
        cleaned = re.sub(r'\b[a-zA-Z0-9_-]+=["\'][^"\']*["\']\s*>?', "", cleaned)
        import html
        cleaned = html.unescape(cleaned)

        # Fix encoding artifacts from HTML text extraction:
        # U+FFFD (replacement char) is produced by BS4 for unknown curly quotes
        cleaned = cleaned.replace("\ufffd", '"')
        # "?" followed by capital or quote is often a garbled open-quote
        cleaned = re.sub(r'\?([A-Z"])', r'"\1', cleaned)
        cleaned = re.sub(r'([a-z.,!])\?\s*-', r'\1" -', cleaned)

        # Normalize slash-separated perk value ranges: "5 / 4 / 3" -> "5/4/3"
        cleaned = re.sub(r'(\d+)(?:\s*/\s*(\d+))+', lambda m: re.sub(r'\s*/\s*', '/', m.group(0)), cleaned)

        # Normalize "50 %" -> "50%", "5 s" -> "5s", "60 m" -> "60m"
        cleaned = re.sub(r'(\d+)\s+(%)', r'\1\2', cleaned)
        cleaned = re.sub(r'(\d+)\s+(s|m)\b(?!\w)', r'\1\2', cleaned)

        # 1. Strip Wiki patch notice disclaimers (e.g. "This description is based on the changes announced for or featured in the upcoming Patch 8.1.0")
        cleaned = re.sub(
            r"This description is based on the changes announced for or featured in the upcoming Patch\s*[\d.]*",
            "",
            cleaned,
            flags=re.IGNORECASE
        )
        cleaned = re.sub(r"Unable to retrieve the Perk description.*$", "", cleaned, flags=re.IGNORECASE)

        # 2. Strip Nightlight header trash text e.g. "Autodidact" Autodidact\nSurvivor\n- Adam Francis"
        cleaned = re.sub(
            r'^[A-Za-z0-9_\'\s\-"]+\s+(?:Survivor|Killer)\s+-\s+[A-Za-z0-9_\'\s\-]+$',
            "",
            cleaned,
            flags=re.MULTILINE | re.IGNORECASE
        )

        lines = [line.strip() for line in cleaned.splitlines()]
        lines = [line for line in lines if line]

        # 3. Filter out lines that are just perk title or category headers
        filtered_lines = []
        for line in lines:
            if line.lower() in ["survivor", "killer", "survivor perk", "killer perk"] or re.match(r"^-\s*[A-Za-z0-9\s']+$", line) or re.match(r'^[A-Za-z0-9_\'\s\-"]+"\s+[A-Za-z0-9_\'\s\-"]+$', line):
                continue
            filtered_lines.append(line)
        lines = filtered_lines

        lines = [line for line in lines if line and line not in ["<", ">", "&lt;", "&gt;"]]

        if not lines:
            return "Perk description is currently unavailable in the database."

        deduped_lines = []
        for line in lines:
            if not deduped_lines or line != deduped_lines[-1]:
                deduped_lines.append(line)
        lines = deduped_lines

        while len(lines) > 1 and lines[-1].lower() == lines[0].lower():
            lines.pop()

        while len(lines) > 1 and lines[-1] in lines[:-1] and len(lines[-1]) < 80:
            lines.pop()

        result = "\n".join(lines).strip()
        if not result or result in ["<", ">", "&lt;", "&gt;"]:
            return "Perk description is currently unavailable in the database."

        return result

    @staticmethod
    def sanitize_filename(name: str) -> str:
        clean_str = name.lower().strip()
        clean_str = re.sub(r"[\s\-/]+", "_", clean_str)
        clean_str = re.sub(r'[\\/*?:"<>|]', "", clean_str)
        clean_str = re.sub(r"_+", "_", clean_str)
        return clean_str.strip("_")

    @staticmethod
    def extract_high_res_url(img_tag: Optional[Tag]) -> str:
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
        high_res_url = re.sub(r"/scale-to-width-down/\d+", "", raw_url)
        if "/revision/latest" in high_res_url:
            high_res_url = high_res_url.split("/revision/latest")[0] + "/revision/latest"
        return high_res_url

    @staticmethod
    def extract_slug_from_href(href: str) -> str:
        if not href or "/wiki/" not in href:
            return ""
        raw_slug = href.split("/wiki/")[-1].split("#")[0].split("?")[0]
        return unquote(raw_slug).strip()

    @staticmethod
    def classify_portrait(image_url: str):
        """Return (category, release_number) when the image is a character portrait.

        Anything else — power icons, item icons, wiki concept images — returns None,
        which is how powers stop being mistaken for characters.
        """
        if not image_url:
            return None

        filename = image_url.split("/revision")[0].rstrip("/").split("/")[-1]
        match = PORTRAIT_PATTERN.match(filename)
        if not match:
            return None

        category = ROLE_BY_PREFIX.get(match.group(1))
        if not category:
            return None

        try:
            release_number = int(match.group(2))
        except ValueError:
            return None

        return category, release_number

    @staticmethod
    def normalise_character_name(title: str, category: str) -> str:
        """Killers lose their leading article; survivors keep their name intact."""
        clean = (title or "").strip()
        if category == "Killer" and clean.startswith("The "):
            return clean[4:].strip()
        return clean

    def fetch_html(self, url: str) -> str:
        return self.wiki_driver.fetch_html(url)

    def parse_character_page(self, html: str) -> List[CharacterData]:
        """Extract characters from a wiki index page.

        A link is a character only when its image is a portrait; the filename decides
        the category and release number, so it does not matter which index page the
        link was found on.
        """
        soup = BeautifulSoup(html, "html.parser")
        content = soup.find("div", class_="mw-parser-output") or soup

        characters: List[CharacterData] = []
        seen = set()

        for link in content.find_all("a", href=re.compile(r"^/wiki/")):
            img = link.find("img")
            if not img:
                continue

            image_url = self.extract_high_res_url(img)
            classified = self.classify_portrait(image_url)
            if not classified:
                continue

            category, release_number = classified

            title = (link.get("title") or "").strip() or link.get_text().strip()
            name = self.normalise_character_name(title, category)
            if not name:
                continue

            key = (category, name.lower())
            if key in seen:
                continue
            seen.add(key)

            slug = self.extract_slug_from_href(link.get("href", ""))
            sanitized = self.sanitize_filename(name)
            sub_dir = "survivors" if category == "Survivor" else "killers"

            characters.append(
                CharacterData(
                    name=name,
                    real_name=name,
                    wiki_slug=slug,
                    short_name=slug.lower(),
                    category=category,
                    avatar_url=image_url,
                    avatar_local_path=f"avatars/{sub_dir}/{sanitized}.png",
                    release_number=release_number,
                )
            )

        return characters

    def scrape_characters_dynamically(self) -> List[CharacterData]:
        return self.wiki_driver.scrape_characters_dynamically()

    def parse_perks(self, html_content: str, characters: List[CharacterData]) -> List[PerkData]:
        return self.wiki_driver.parse_perks(html_content, characters)

    async def _download_asset(
        self,
        client: AsyncSession,
        semaphore: asyncio.Semaphore,
        url: str,
        relative_path: str,
    ) -> None:
        if not url:
            return

        destination = self.static_dir / relative_path
        if destination.exists():
            with self._lock:
                self._status["progress"] += 1
            return

        destination.parent.mkdir(parents=True, exist_ok=True)

        async with semaphore:
            try:
                response = await client.get(url, headers=self.HEADERS, timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                destination.write_bytes(response.content)
            except Exception as err:
                logger.error(f"Download failed [{url}]: {err}")
            finally:
                with self._lock:
                    self._status["progress"] += 1

    async def download_all_assets_async(
        self,
        perks: List[PerkData],
        characters: List[CharacterData],
        items: Optional[List[ItemData]] = None,
        addons: Optional[List[AddonData]] = None,
        maps: Optional[List[MapData]] = None,
    ) -> None:
        semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_DOWNLOADS)
        async with AsyncSession(impersonate=self.IMPERSONATE_BROWSER, verify=False) as client:
            tasks = [
                self._download_asset(client, semaphore, perk.icon_url, perk.icon_local_path)
                for perk in perks
            ]
            for char in characters:
                if char.avatar_url:
                    tasks.append(
                        self._download_asset(client, semaphore, char.avatar_url, char.avatar_local_path)
                    )
            if items:
                for item in items:
                    if item.icon_url:
                        tasks.append(
                            self._download_asset(client, semaphore, item.icon_url, item.icon_local_path)
                        )
            if addons:
                for addon in addons:
                    if addon.icon_url:
                        tasks.append(
                            self._download_asset(client, semaphore, addon.icon_url, addon.icon_local_path)
                        )
            if maps:
                for m in maps:
                    if m.callout_image_url and m.callout_image_local_path:
                        tasks.append(
                            self._download_asset(client, semaphore, m.callout_image_url, m.callout_image_local_path)
                        )

            await asyncio.gather(*tasks)

    def _preserve_release_numbers(self, characters: List[CharacterData]) -> None:
        """Carry over release_number from the characters file already on disk.

        Drivers like Nightlight have no concept of release order, so a fresh
        scrape always writes release_number=0. Without this, every sync wipes
        out the chronological ordering used to sort the Characters Hub.
        """
        if not self.characters_file.exists():
            return
        try:
            with open(self.characters_file, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except Exception:
            return

        existing_numbers = {
            c["name"].lower(): c["release_number"]
            for c in existing
            if isinstance(c, dict) and c.get("name") and isinstance(c.get("release_number"), int)
        }

        for character in characters:
            if not character.release_number:
                known = existing_numbers.get(character.name.lower())
                if known is not None:
                    character.release_number = known

    def run_sync_pipeline(
        self,
        override_source: Optional[str] = None,
        override_fallback: Optional[bool] = None,
    ) -> Dict[str, int]:
        if self.get_status()["is_running"]:
            logger.warning("Scrape pipeline already running.")
            return {}

        config = self.load_config()
        active_source = override_source if override_source is not None else config.source
        active_fallback = override_fallback if override_fallback is not None else config.fallback_to_wiki

        self._update_status(
            is_running=True,
            progress=0,
            total=0,
            current_step="scraping_characters",
            error=None,
            fallback_used=False,
            last_used_source=active_source,
        )

        fallback_used = False
        source_used = active_source
        characters: List[CharacterData] = []
        perks: List[PerkData] = []
        items: List[ItemData] = []
        addons: List[AddonData] = []

        def unpack_res(res):
            if isinstance(res, tuple) and len(res) == 4:
                return res[0], res[1], res[2], res[3]
            return res[0], res[1], [], []

        try:
            if active_source == "nightlight":
                try:
                    logger.info("Attempting to scrape via Nightlight driver...")
                    res = self.nightlight_driver.scrape_all()
                    characters, perks, items, addons = unpack_res(res)
                except Exception as nl_err:
                    logger.warning(f"Nightlight driver failed: {nl_err}")
                    if active_fallback:
                        logger.info("Falling back to Wiki driver...")
                        self._update_status(
                            current_step="falling_back_to_wiki",
                            fallback_used=True,
                        )
                        fallback_used = True
                        source_used = "wiki"
                        res = self.wiki_driver.scrape_all()
                        characters, perks, items, addons = unpack_res(res)
                    else:
                        raise nl_err
            else:
                logger.info("Scraping via Wiki driver...")
                res = self.wiki_driver.scrape_all()
                characters, perks, items, addons = unpack_res(res)
                source_used = "wiki"

            self._preserve_release_numbers(characters)

            self.characters_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.characters_file, "w", encoding="utf-8") as f:
                json.dump([asdict(c) for c in characters], f, indent=2, ensure_ascii=False)

            self.data_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump([asdict(p) for p in perks], f, indent=2, ensure_ascii=False)

            self.items_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.items_file, "w", encoding="utf-8") as f:
                json.dump([asdict(i) for i in items], f, indent=2, ensure_ascii=False)

            self.addons_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.addons_file, "w", encoding="utf-8") as f:
                json.dump([asdict(a) for a in addons], f, indent=2, ensure_ascii=False)

            # Scrape Hens333 and SamoelColt Maps
            maps: List[MapData] = []
            try:
                logger.info("Scraping Hens333 maps...")
                hens_maps = self.hens_map_driver.scrape_maps()
                maps.extend(hens_maps)
            except Exception as map_err:
                logger.warning(f"Failed scraping Hens333 maps: {map_err}")

            try:
                logger.info("Scraping SamoelColt Steam Workshop maps...")
                samoel_maps = self.samoel_map_driver.scrape_maps()
                maps.extend(samoel_maps)
            except Exception as map_err:
                logger.warning(f"Failed scraping SamoelColt maps: {map_err}")

            if maps:
                self.maps_file.parent.mkdir(parents=True, exist_ok=True)
                with open(self.maps_file, "w", encoding="utf-8") as f:
                    json.dump([asdict(m) for m in maps], f, indent=2, ensure_ascii=False)

            total_downloads = len(perks) + sum(1 for c in characters if c.avatar_url) + len(items) + len(addons) + len(maps)
            self._update_status(
                current_step="downloading_assets",
                total=total_downloads,
                progress=0,
            )

            asyncio.run(self.download_all_assets_async(perks, characters, items=items, addons=addons, maps=maps))

            now_iso = datetime.now(timezone.utc).isoformat()
            self.save_config({
                "last_used_source": source_used,
                "last_run_timestamp": now_iso,
            })

            survivor_count = sum(1 for p in perks if p.category == "Survivor")
            killer_count = sum(1 for p in perks if p.category == "Killer")

            stats = {
                "total_perks": len(perks),
                "total_characters": len(characters),
                "survivors": survivor_count,
                "killers": killer_count,
                "total_items": len(items),
                "total_addons": len(addons),
            }

            self._update_status(
                is_running=False,
                current_step="completed",
                last_run=now_iso,
                last_used_source=source_used,
                fallback_used=fallback_used,
            )
            return stats

        except Exception as e:
            logger.error(f"Sync pipeline failed: {e}")
            self._update_status(
                is_running=False,
                current_step="failed",
                error=str(e),
            )
            raise