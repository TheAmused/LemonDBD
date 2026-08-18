from __future__ import annotations

import asyncio
import html
import json
import logging
import re
import time
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from bs4 import BeautifulSoup, Tag
from curl_cffi import requests
from curl_cffi.requests import AsyncSession

from app.scrapers.types import AddonData, CharacterData, ItemData, KillerPowerData, PerkData
from app.scrapers.utils import (
    clean_description_text,
    extract_high_res_url,
    extract_slug_from_href,
    normalize_name_key,
    sanitize_filename,
)

logger = logging.getLogger(__name__)

PORTRAIT_PATTERN = re.compile(r"(?:^|/)(K|S)(\d+)[-_]", re.IGNORECASE)

GENERIC_PERK_CANONICAL_MAP = {
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


def parse_date_and_year(text: str) -> Tuple[Optional[str], Optional[int]]:
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


def clean_chapter_title(raw_chapter: str) -> Tuple[Optional[str], str]:
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
    cells: List[Tag],
    img_tag: Optional[Tag] = None,
    section_context: str = "",
) -> str:
    """Extracts the item/add-on rarity from live wiki elements, image sources, or section context."""
    # 1. Check direct table cells text if a designated column is present
    if len(cells) >= 4:
        c_text = cells[2].get_text(strip=True)
        m = RARITY_PATTERN.search(c_text)
        if m:
            return normalize_rarity_name(m.group(1))

    # 2. Check HTML attributes on cell elements (title, class, data-rarity, alt)
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

    # 3. Check Image URL / filename (e.g. IconAddon_..._veryRare.png or IconItems_..._ultraRare.png)
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

    # 4. Check section context
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

    def __init__(self, base_dir: Optional[Path] = None):
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

    def scrape_roster_from_page(self, page_title: str, role: str) -> List[CharacterData]:
        html_doc = self.fetch_page_html(page_title)
        soup = BeautifulSoup(html_doc, "html.parser")
        content = soup.find("div", class_="mw-parser-output") or soup

        characters: List[CharacterData] = []
        seen_slugs: Set[str] = set()

        killer_meta_by_slug: Dict[str, Dict[str, Any]] = {}
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

    def scrape_dlcs_from_wiki(self) -> List[Dict[str, Any]]:
        """Scrapes the live Downloadable_Content and Chapters catalogs directly from wiki.gg."""
        dlcs: List[Dict[str, Any]] = []
        seen_dlc_names = set()

        for page in ["Downloadable_Content", "Chapters"]:
            try:
                html_doc = self.fetch_page_html(page)
                soup = BeautifulSoup(html_doc, "html.parser")
                content = soup.find("div", class_="mw-parser-output") or soup

                # 1. Parse tables on DLC/Chapters pages
                for table in content.find_all("table", class_=re.compile(r"wikitable|article-table")):
                    rows = table.find_all("tr")
                    for tr in rows:
                        tds = tr.find_all("td")
                        if not tds:
                            continue

                        row_text = tr.get_text(separator=" ", strip=True)
                        date_str, year_num = parse_date_and_year(row_text)

                        # Find character links and DLC links in the row
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

                # 2. Parse section headers (h2, h3, h4)
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

    def enrich_characters_from_pages(self, characters: List[CharacterData]) -> None:
        def norm_key(text: str) -> str:
            if not text:
                return ""
            n = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8").lower()
            return re.sub(r"[^a-z0-9]", "", n)

        # 1. Scrape live DLC catalog from wiki.gg
        dlcs = self.scrape_dlcs_from_wiki()
        logger.info(f"Loaded {len(dlcs)} live DLC entries from wiki.gg")

        # 2. Enrich combat stats, chapter info, and release dates directly per character page
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

                                # A. Parse Infobox Rows
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

                                # B. Parse Lead Overview Paragraphs for Introduction & Release Date
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

                                # Pattern 1: Standard wiki introductory sentence
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

                                # Pattern 2: Base Game intro
                                if not parsed_release_date:
                                    if "base game" in intro_full_text.lower() or (char.release_number and char.release_number <= 4 and "chapter" not in intro_full_text.lower()):
                                        parsed_chapter_name = "Base Game"
                                        parsed_dlc_type = "base_game"
                                        d_p, y_p = parse_date_and_year(intro_full_text)
                                        parsed_release_date = d_p or "14 June 2016"
                                        parsed_release_year = y_p or 2016

                                # Pattern 3: General release date extractor from intro paragraphs
                                if not parsed_release_date:
                                    d_p, y_p = parse_date_and_year(intro_full_text)
                                    if d_p:
                                        parsed_release_date = d_p
                                        parsed_release_year = y_p

                                # Pattern 4: Fallback to infobox DLC & release date
                                if not parsed_release_date and infobox_release_date:
                                    d_p, y_p = parse_date_and_year(infobox_release_date)
                                    if d_p:
                                        parsed_release_date = d_p
                                        parsed_release_year = y_p

                                if not parsed_chapter_name and infobox_dlc_text:
                                    c_num, c_title = clean_chapter_title(infobox_dlc_text)
                                    parsed_chapter_number = c_num or ""
                                    parsed_chapter_name = c_title or infobox_dlc_text

                                # Pattern 5: Cross-reference with live DLC catalog if still missing
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

                                # Pattern 6: Fetch Chapter DLC page directly if date is still missing
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

                                # C. Licensing Assessment
                                is_licensed = False
                                if cost_text:
                                    if "auric cells" in cost_text.lower() and "iridescent" not in cost_text.lower():
                                        is_licensed = True
                                    elif "iridescent" in cost_text.lower():
                                        is_licensed = False

                                if not is_licensed and ("™" in char.name or "®" in char.name or "™" in parsed_chapter_name or "®" in parsed_chapter_name):
                                    is_licensed = True

                                # D. Power & Image Extraction for Killers
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

                                # E. Lore Paragraphs
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

                                # Assign fields to character
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

        # 3. Dynamic DLC Counterparts Linking
        chapter_groups = defaultdict(list)
        for char in characters:
            if char.chapter_name and char.chapter_name.lower() != "base game":
                chapter_groups[norm_key(char.chapter_name)].append(char)

        for group in chapter_groups.values():
            if len(group) > 1:
                for c in group:
                    c.dlc_counterparts = json.dumps([other.name for other in group if other.name != c.name])

    def scrape_characters_dynamically(self) -> List[CharacterData]:
        logger.info("Fetching Survivors via MediaWiki API...")
        survivors = self.scrape_roster_from_page("Survivors", "Survivor")

        logger.info("Fetching Killers via MediaWiki API...")
        killers = self.scrape_roster_from_page("Killers", "Killer")

        all_characters = survivors + killers
        logger.info(f"Enriching all {len(all_characters)} characters with live infobox, chapter, licensing, and combat power details...")
        self.enrich_characters_from_pages(all_characters)

        logger.info(f"Discovered {len(all_characters)} characters ({len(survivors)} Survivors, {len(killers)} Killers).")
        return all_characters

    def parse_perks(self, html_content: str, characters: List[CharacterData]) -> List[PerkData]:
        soup = BeautifulSoup(html_content, "html.parser")
        perks_dict: Dict[str, PerkData] = {}
        alias_backlog: Dict[str, str] = {}
        current_category: Optional[str] = None
        content_area = soup.find("div", class_="mw-parser-output") or soup

        char_by_key: Dict[str, CharacterData] = {}
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

    def parse_wiki_items(self, html_content: str) -> List[ItemData]:
        soup = BeautifulSoup(html_content, "html.parser")
        items: List[ItemData] = []
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

    def parse_wiki_addons(self, html_content: str, characters: Optional[List[CharacterData]] = None) -> List[AddonData]:
        soup = BeautifulSoup(html_content, "html.parser")
        raw_addons: List[dict] = []
        content_area = soup.find("div", class_="mw-parser-output") or soup
        current_target = "General"
        current_category = "Survivor"
        current_section = ""

        dynamic_power_to_killer: Dict[str, str] = {}
        if characters:
            for c in characters:
                if c.category == "Killer":
                    dynamic_power_to_killer[normalize_name_key(c.name)] = c.name
                    dynamic_power_to_killer[normalize_name_key(c.name.replace("The ", ""))] = c.name
                    if c.real_name:
                        dynamic_power_to_killer[normalize_name_key(c.real_name)] = c.name
                    if c.wiki_slug:
                        dynamic_power_to_killer[normalize_name_key(c.wiki_slug)] = c.name
                    if c.short_name:
                        dynamic_power_to_killer[normalize_name_key(c.short_name)] = c.name
                    if c.power and c.power.name:
                        dynamic_power_to_killer[normalize_name_key(c.power.name)] = c.name

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

                        # Positional fallback if rarity is still generic Common and standard 20-row killer table
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
                            "target": current_target,
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

        addons: List[AddonData] = []
        seen_unique_names = set()

        for a in raw_addons:
            addon_name = a["name"]
            target = a["target"]

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

    def scrape_all(self) -> Tuple[List[CharacterData], List[PerkData], List[ItemData], List[AddonData]]:
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

        return characters, perks, items, addons