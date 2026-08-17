import json
import logging
import re
import unicodedata
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Set
from bs4 import BeautifulSoup
from curl_cffi import requests
from app.scrapers.constants import CHARACTER_ALIASES
from app.scrapers.types import AddonData, CharacterData, ItemData, PerkData
from app.scrapers.utils import clean_description_text, normalize_name_key, sanitize_filename

logger = logging.getLogger(__name__)


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
                wiki_slug = item.get("wiki_slug") or item.get("slug") or item.get("id") or sanitize_filename(name)
                short_name = item.get("short_name") or sanitize_filename(name)

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

                sanitized = sanitize_filename(name)
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
    ) -> Tuple[List[PerkData], Dict[str, str]]:
        perks: List[PerkData] = []
        slug_map: Dict[str, str] = {}
        char_map: Dict[str, CharacterData] = {}

        if characters:
            for c in characters:
                char_map[normalize_name_key(c.name)] = c
                char_map[normalize_name_key(c.short_name)] = c
                char_map[normalize_name_key(c.wiki_slug)] = c

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
            match = re.search(r"perks\s*:\s*(\[\s*\{.*?\}\s*\])", chunk_js, re.DOTALL)
            if match:
                try:
                    json_str = re.sub(r"(\b\w+\b)\s*:", r'"\1":', match.group(1))
                    json_str = re.sub(r":\s*\'([^\']*)\'", r': "\1"', json_str)
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
                    "u_slug": u_slug,
                })

        for item in raw_perks:
            if not isinstance(item, dict):
                continue

            name = item.get("name") or item.get("perk_name") or item.get("title") or item.get("n") or ""
            if not name:
                continue

            name = str(name).replace("\\xA0", " ").replace("\\xa0", " ").replace("\\u00a0", " ")
            name = name.replace("\u00a0", " ").replace("\u2019", "'").replace("\u2018", "'")
            name = name.replace("\u2013", "-").replace("\u2014", "-").strip()

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

            u_slug = item.get("u_slug")
            if not u_slug and u_val:
                u_slug = str(u_val).split("/perks/")[-1].strip()
            if u_slug:
                slug_map[normalize_name_key(name)] = u_slug

            role_val = str(item.get("role") or item.get("category") or "Survivor").lower()
            if role_val in ["survivor", "1", "s"]:
                category = "Survivor"
            elif role_val in ["killer", "2", "k"]:
                category = "Killer"
            else:
                category = "Survivor"

            char_input = item.get("character") or item.get("character_name") or item.get("owner") or "General"
            norm_input = normalize_name_key(str(char_input))

            matched_char = None
            if norm_input not in ["none", "all", "general", ""]:
                alias_target = CHARACTER_ALIASES.get(str(char_input).lower())
                if alias_target:
                    matched_char = char_map.get(normalize_name_key(alias_target))
                if not matched_char:
                    matched_char = char_map.get(norm_input)

            if matched_char:
                canonical_name = matched_char.name
                real_name = matched_char.real_name
                avatar_path = matched_char.avatar_local_path
            else:
                canonical_name = str(char_input) if norm_input not in ["none", "all", "general", ""] else "General"
                real_name = canonical_name
                avatar_path = ""

            desc = descriptions.get(name) or descriptions.get(name.replace("\\'", "'")) or ""
            if not desc and stream_payload:
                idx = stream_payload.find(name)
                if idx != -1:
                    snippet = stream_payload[idx : idx + 300]
                    desc = BeautifulSoup(snippet, "html.parser").get_text(separator="\n", strip=True)

            clean_desc = clean_description_text(desc)
            raw_icon = item.get("icon") or item.get("icon_slug") or item.get("slug") or sanitize_filename(name)

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

            sanitized_name = sanitize_filename(name)
            sanitized_char = sanitize_filename(canonical_name)
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

        return perks, slug_map

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
                char_map[normalize_name_key(c.name)] = c
                char_map[normalize_name_key(c.short_name)] = c
                char_map[normalize_name_key(c.wiki_slug)] = c

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
                        raw_objects = (
                            (parsed.get("items") or [])
                            + (parsed.get("addons") or [])
                            + (parsed.get("data") or [])
                        )
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
                        "character": c_m.group(1).replace('"', "") if c_m else "General",
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

            raw_icon = entry.get("icon") or entry.get("i") or entry.get("slug") or sanitize_filename(name)
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

                sanitized = sanitize_filename(name)
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
                norm_target = normalize_name_key(str(target_raw))
                matched_char = char_map.get(norm_target)
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

                sanitized = sanitize_filename(name)
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

    def fetch_nightlight_perk_descriptions(
        self,
        perks: List[PerkData],
        slug_map: Optional[Dict[str, str]] = None,
        existing_known_perks: Optional[Set[str]] = None,
    ) -> Dict[str, str]:
        slug_map = slug_map or {}
        generic_markers = [
            "Track DBD stats",
            "Dead by Daylight Stat Tracker",
            "Nightlight.gg",
            "custom icons",
        ]

        def name_to_slugs(name: str) -> List[str]:
            candidates = []
            norm_key = normalize_name_key(name)
            if norm_key in slug_map:
                candidates.append(slug_map[norm_key])

            clean = (
                name.replace("\u2019", "'")
                .replace("\u2018", "'")
                .replace("\u2013", "-")
                .replace("\u2014", "-")
                .replace("\u00a0", " ")
                .replace("\\xA0", " ")
                .replace("\\xa0", " ")
                .replace("\\u00a0", " ")
                .strip()
            )

            s1 = re.sub(r"\s+", "_", clean)
            candidates.append(s1)

            no_accents = unicodedata.normalize("NFKD", clean).encode("ASCII", "ignore").decode("utf-8")
            s2 = re.sub(r"\s+", "_", no_accents)
            candidates.append(s2)

            no_punct = re.sub(r"[:'!\?,\.]", "", no_accents)
            s3 = re.sub(r"\s+", "_", no_punct)
            candidates.append(s3)

            s4 = re.sub(r"[\s\-]+", "_", no_accents)
            candidates.append(s4)

            s5 = re.sub(r"[\s_]+", "-", no_accents)
            candidates.append(s5)

            candidates.append(urllib.parse.quote(s1, safe="_-."))
            candidates.append(urllib.parse.quote(s2, safe="_-."))

            seen = set()
            result = []
            for c in candidates:
                if c and c not in seen:
                    seen.add(c)
                    result.append(c)
            return result

        def fetch_one(name: str, slugs: List[str]) -> Tuple[str, str, List[str]]:
            for slug in slugs:
                url = f"https://nightlight.gg/perks/{slug}"
                try:
                    html_text = self.fetch_nightlight_data(url)
                    soup = BeautifulSoup(html_text, "html.parser")

                    meta = soup.find("meta", attrs={"name": "description"})
                    if meta and any(m in str(meta.get("content", "")) for m in generic_markers):
                        continue

                    full_desc = ""
                    active_pane = soup.find(
                        "div",
                        class_=lambda c: c and "tab-pane" in c and "active" in c and "show" in c,
                    )
                    if active_pane:
                        desc_div = active_pane.find("div", recursive=False)
                        if desc_div:
                            paragraphs = desc_div.find_all("p", recursive=False)
                            lines = [p.get_text(" ", strip=True) for p in paragraphs if p.get_text(" ", strip=True)]
                            full_desc = "\n".join(lines).strip()

                    if not full_desc and meta and meta.get("content"):
                        full_desc = str(meta["content"]).strip()
                        if any(m in full_desc for m in generic_markers):
                            full_desc = ""

                    if full_desc:
                        return name, full_desc, slugs
                except Exception:
                    pass
            return name, "", slugs

        descriptions: Dict[str, str] = {}
        seen = set()
        tasks = []
        for perk in perks:
            norm_key = normalize_name_key(perk.name)
            if norm_key not in seen:
                seen.add(norm_key)
                tasks.append((perk.name, name_to_slugs(perk.name)))

        if tasks:
            logger.info(f"Fetching Nightlight perk descriptions for {len(tasks)} perks...")
            failed_perks = []
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = {executor.submit(fetch_one, name, slugs): name for name, slugs in tasks}
                for future in as_completed(futures):
                    name, desc, tested_slugs = future.result()
                    if desc:
                        descriptions[normalize_name_key(name)] = desc
                    else:
                        failed_perks.append((name, tested_slugs))

            if failed_perks:
                for name, tested_slugs in failed_perks:
                    logger.warning(f"Nightlight individual page not found for: '{name}' | Tested candidate slugs: {tested_slugs}")

            logger.info(f"Fetched Nightlight descriptions for {len(descriptions)}/{len(tasks)} perks.")

        return descriptions

    def scrape_all(
        self, existing_known_perks: Optional[Set[str]] = None
    ) -> Tuple[List[CharacterData], List[PerkData], List[ItemData], List[AddonData]]:
        logger.info("Scraping Nightlight.gg data...")
        survivors_raw = self.fetch_nightlight_data(self.SURVIVORS_API)
        killers_raw = self.fetch_nightlight_data(self.KILLERS_API)
        characters = self.parse_api_characters(survivors_raw, killers_raw)

        perks_page_html = self.fetch_nightlight_data(self.PERKS_LIST_URL)

        chunk_text = ""
        manifest_match = re.search(r"window\.__reactRouterManifest\s*=\s*(\{.*?\});", perks_page_html, re.DOTALL)
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

        perks, slug_map = self.parse_nightlight_perks(chunk_text, perks_page_html, characters=characters)

        nl_descriptions = self.fetch_nightlight_perk_descriptions(
            perks, slug_map=slug_map, existing_known_perks=existing_known_perks
        )
        enriched_perks = []
        for p in perks:
            nl_desc = nl_descriptions.get(normalize_name_key(p.name), "")
            if nl_desc:
                p.description = nl_desc
            enriched_perks.append(p)
        perks = enriched_perks

        items, addons = self.parse_nightlight_items_and_addons(chunk_text, perks_page_html, characters=characters)

        return characters, perks, items, addons