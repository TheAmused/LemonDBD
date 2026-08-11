import asyncio
import json
import logging
import re
import threading
from dataclasses import asdict, dataclass, fields
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Union
from urllib.parse import unquote

from bs4 import BeautifulSoup, Tag
from curl_cffi import requests
from curl_cffi.requests import AsyncSession

logger = logging.getLogger(__name__)


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

            char_input = item.get("character") or item.get("character_name") or item.get("owner") or "General"
            matched_char = char_map.get(str(char_input).lower())

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
            category_dir = "survivors" if category == "Survivor" else "killers"
            if canonical_name == "General":
                local_rel_path = f"icons/{category_dir}/General/{sanitized_name}.png"
            else:
                local_rel_path = f"icons/{category_dir}/{canonical_name}/{sanitized_name}.png"

            perks.append(
                PerkData(
                    name=name,
                    character=canonical_name,
                    character_real_name=real_name,
                    character_avatar_path=avatar_path,
                    category=category,
                    description=desc,
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

        if not chunk_text:
            try:
                chunk_text = self.fetch_nightlight_data("https://nightlight.gg/assets/chunk-Ge20zz2D.js")
            except Exception:
                chunk_text = perks_page_html

        perks = self.parse_nightlight_perks(chunk_text, perks_page_html, characters=characters)
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

    def parse_perks(self, html_content: str, characters: List[CharacterData]) -> List[PerkData]:
        soup = BeautifulSoup(html_content, "html.parser")
        perks: List[PerkData] = []
        current_category: Optional[str] = None
        content_area = soup.find("div", class_="mw-parser-output") or soup

        char_by_slug = {c.wiki_slug.lower(): c for c in characters}
        char_by_name = {c.name.lower(): c for c in characters}

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
                                link_title = owner_link.get("title", "").strip()
                                slug = ScraperService.extract_slug_from_href(href).lower()
                                matched = char_by_slug.get(slug) or char_by_name.get(link_title.lower())

                            if not matched:
                                raw_text = owner_cell.get_text().strip()
                                clean_text = re.sub(r"^[.\s\-–]+|[.\s\-–]+$", "", raw_text).strip().lower()

                                if clean_text and clean_text not in ["all", "general", "none", "-", "all survivors", "all killers"]:
                                    for key, c in char_by_name.items():
                                        if clean_text in key or key in clean_text:
                                            matched = c
                                            break

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
    EXCLUDED_SLUGS = WikiScraperDriver.EXCLUDED_SLUGS

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
        self.config_file = self.base_dir / "data" / "scraper_config.json"
        self.static_dir = self.base_dir / "app" / "static"
        self.nightlight_driver = NightlightScraperDriver(self.base_dir)
        self.wiki_driver = WikiScraperDriver(self.base_dir)

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

        lines = [line.strip() for line in cleaned.splitlines()]
        lines = [line for line in lines if line]

        if not lines:
            return ""

        deduped_lines = []
        for line in lines:
            if not deduped_lines or line != deduped_lines[-1]:
                deduped_lines.append(line)
        lines = deduped_lines

        while len(lines) > 1 and lines[-1].lower() == lines[0].lower():
            lines.pop()

        while len(lines) > 1 and lines[-1] in lines[:-1] and len(lines[-1]) < 80:
            lines.pop()

        return "\n".join(lines).strip()

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

    def fetch_html(self, url: str) -> str:
        return self.wiki_driver.fetch_html(url)

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

            await asyncio.gather(*tasks)

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

            total_downloads = len(perks) + sum(1 for c in characters if c.avatar_url) + len(items) + len(addons)
            self._update_status(
                current_step="downloading_assets",
                total=total_downloads,
                progress=0,
            )

            asyncio.run(self.download_all_assets_async(perks, characters, items=items, addons=addons))

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