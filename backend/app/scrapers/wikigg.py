# backend/app/scrapers/wikigg.py
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
from app.scrapers.maps import FOLDER_REALM_MAP, OTHER_MAP_REALM_OVERRIDES
from app.scrapers.types import (
    AddonData,
    ChapterImageData,
    CharacterData,
    ItemData,
    KillerPowerData,
    OfferingData,
    PerkData,
    RealmImageData,
)
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

    def fetch_lang_page_html(self, lang: str, page_title: str) -> str:
        from app.scrapers.drivers import LANGUAGE_DRIVERS
        lang_key = lang.lower().strip()
        driver_cls = LANGUAGE_DRIVERS.get(lang_key)
        if driver_cls:
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
        """Enriches entities using dedicated language drivers."""
        from app.scrapers.drivers import LANGUAGE_DRIVERS
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
            if not driver_cls or driver_cls is WikiGGScraperDriver:
                continue

            try:
                driver_instance = driver_cls(base_dir=self.base_dir)
                if hasattr(self, "fetch_lang_page_html") and callable(self.fetch_lang_page_html):
                    driver_instance.fetch_page_html = lambda p, l=lang_key: self.fetch_lang_page_html(l, p)
                if hasattr(driver_instance, "enrich_translations"):
                    driver_instance.enrich_translations(characters, perks, items, addons)
            except Exception as e:
                logger.warning(f"Failed running translation driver for '{lang_key}': {e}")

    @staticmethod
    def canonicalise_addons(raw_addons: list[dict]) -> list[AddonData]:
        """Assign final display names and icon paths for add-ons from every source.

        Both the global Add-ons page and the per-character pages feed into this one
        function. Doing the naming here - rather than separately in each scrape pass -
        is what keeps a single add-on from entering the database twice under two
        spellings ("Magnetised Manacles" and "Magnetised Manacles (The Judgment)"),
        which previously produced duplicate rows and icons saved under a name the
        database never referenced.

        A "(Target)" suffix is added only to disambiguate an add-on name that genuinely
        belongs to more than one target, and the icon path is derived from the resulting
        display name, so the file on disk and the value stored in the database always
        agree.
        """
        by_identity: dict[tuple[str, str], dict] = {}
        for a in raw_addons:
            name_key = normalize_name_key(a["name"])
            target_key = normalize_name_key(a.get("target") or "")
            if not name_key:
                continue
            identity = (name_key, target_key)
            existing = by_identity.get(identity)
            if existing is None:
                by_identity[identity] = a
                continue
            # Same add-on seen twice (global page + character page): keep the richer
            # record so a page that omitted the icon or description cannot win.
            merged = dict(existing)
            for field in ("icon_url", "description", "rarity", "category"):
                if not merged.get(field) and a.get(field):
                    merged[field] = a[field]
            by_identity[identity] = merged

        targets_per_name: dict[str, set[str]] = defaultdict(set)
        for name_key, target_key in by_identity:
            targets_per_name[name_key].add(target_key)

        addons: list[AddonData] = []
        seen_display: set[str] = set()
        for (name_key, _target_key), a in by_identity.items():
            addon_name = a["name"].strip()
            target = a.get("target") or ""
            needs_suffix = len(targets_per_name[name_key]) > 1 and bool(target)
            display_name = f"{addon_name} ({target})" if needs_suffix else addon_name

            norm_display = normalize_name_key(display_name)
            if norm_display in seen_display:
                continue
            seen_display.add(norm_display)

            local_path = f"icons/addons/{sanitize_filename(display_name)}.webp"
            addons.append(
                AddonData(
                    name=display_name,
                    associated_target=target,
                    category=a.get("category", ""),
                    description=a.get("description", ""),
                    icon_url=a.get("icon_url", ""),
                    icon_local_path=local_path,
                    rarity=a.get("rarity", ""),
                )
            )
        return addons

    def parse_wiki_addons(self, html_content: str, characters: list[CharacterData] | None = None) -> list[AddonData]:
        """Parse the global Add-ons page into fully named AddonData records."""
        return self.canonicalise_addons(self.collect_addon_rows(html_content, characters))

    def collect_addon_rows(self, html_content: str, characters: list[CharacterData] | None = None) -> list[dict]:
        """Extract raw add-on rows from the global Add-ons page (naming happens later)."""
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
                if c.category == "Killer" or getattr(c, "role", "") == "Killer":
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
                if any(k in current_section for k in ["contents", "overview", "stacking", "numbers", "change log", "decommission", "unused", "removed", "retired"]):
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

        return raw_addons

    def scrape_addons_from_character_page(self, char: CharacterData) -> list[AddonData]:
        """Parse one character's own page into fully named AddonData records."""
        return self.canonicalise_addons(self.collect_character_addon_rows(char))

    def collect_character_addon_rows(self, char: CharacterData) -> list[dict]:
        """Extract raw add-on rows from a character's dedicated page."""
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
        addons: list[dict] = []
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

                            # No naming here: canonicalise_addons() decides whether this
                            # add-on needs a "(Target)" suffix once every source has been
                            # merged. Naming it here unconditionally used to create a
                            # second database row for an add-on the global page already had.
                            addons.append({
                                "name": addon_name,
                                "target": target,
                                "category": "Killer",
                                "description": description,
                                "icon_url": icon_url,
                                "rarity": rarity,
                            })
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
                local_path = f"icons/offerings/{sanitized}.webp"

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

    CANONICAL_REALM_NAMES = list(
        dict.fromkeys([*FOLDER_REALM_MAP.values(), *OTHER_MAP_REALM_OVERRIDES.values()])
    )

    # The wiki.gg "Realms" page's own gallery is a Twitter meme gallery (an
    # "Entity Realm Nature Guide"), not per-realm banner art - matching against
    # it produces zero or nonsensical matches. The real source of one banner
    # image per realm is the 21 numbered "RealmKeyArt_NN.png" files, which are
    # only linked from Template:Main_Page/Navigation (the homepage's realm
    # picker); individual realm pages mostly don't embed their own key art.
    # That template labels one realm ("Disturbed Ward") under its old/lore
    # name, so it needs an explicit alias here - the same rename this codebase
    # already tracks in scrapers/maps.py's FOLDER_REALM_MAP ("crotus pen").
    REALM_NAME_ALIASES = {
        "crotus prenn asylum": "Disturbed Ward",
    }

    def scrape_realm_images(self) -> list[RealmImageData]:
        """Fetches the wiki.gg homepage realm-navigation template (the only page
        that links all 21 numbered RealmKeyArt banner images together with a
        realm name) and matches each one against the canonical realm names this
        app already uses (see FOLDER_REALM_MAP / OTHER_MAP_REALM_OVERRIDES in
        scrapers/maps.py). Matching is by normalized name substring since the
        template's link titles don't always match our canonical spelling
        exactly (accents, "(Realm)" suffixes, old map names)."""
        results: list[RealmImageData] = []
        try:
            html_doc = self.fetch_page_html("Template:Main Page/Navigation")
            soup = BeautifulSoup(html_doc, "html.parser")
            content = soup.find("div", class_="mw-parser-output") or soup

            matched_names: set[str] = set()

            for img_tag in content.find_all("img"):
                src = img_tag.get("data-src") or img_tag.get("src") or ""
                if "RealmKeyArt" not in src:
                    continue

                link_tag = img_tag.find_parent("a")
                label_text = (link_tag.get("title") if link_tag else "") or img_tag.get("alt") or ""
                if not label_text:
                    continue

                label_text = self.REALM_NAME_ALIASES.get(normalize_name_key(label_text), label_text)
                norm_label = normalize_name_key(label_text)

                for realm_name in self.CANONICAL_REALM_NAMES:
                    if realm_name in matched_names:
                        continue
                    norm_realm = normalize_name_key(realm_name)
                    if norm_realm == norm_label or norm_realm in norm_label or norm_label in norm_realm:
                        image_url = extract_high_res_url(img_tag, self.BASE_DOMAIN)
                        if not image_url:
                            continue
                        slug = sanitize_filename(realm_name)
                        results.append(
                            RealmImageData(
                                name=realm_name,
                                image_url=image_url,
                                image_local_path=f"realms/{slug}.png",
                            )
                        )
                        matched_names.add(realm_name)
                        break

            logger.info(f"Matched {len(results)}/{len(self.CANONICAL_REALM_NAMES)} realm images from wiki.gg.")
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg realm images: {e}")

        return results

    def scrape_all(
        self,
        languages: str | list[str] | None = None,
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
            addon_rows = self.collect_addon_rows(html_addons, characters)

            known_covered_killers = {
                normalize_name_key(r.get("target") or "") for r in addon_rows if r.get("target")
            }
            if characters:
                for c in characters:
                    if getattr(c, "category", "") == "Killer" or getattr(c, "role", "") == "Killer":
                        c_norm = normalize_name_key(c.name)
                        c_norm_no_the = normalize_name_key(c.name.replace("The ", ""))
                        if c_norm not in known_covered_killers and c_norm_no_the not in known_covered_killers:
                            char_rows = self.collect_character_addon_rows(c)
                            if char_rows:
                                logger.info(f"Enriched {len(char_rows)} add-ons from dedicated page for {c.name}")
                                addon_rows.extend(char_rows)

            # One naming pass over every source. Merging raw rows first is what stops the
            # same add-on arriving twice under two different names.
            addons = self.canonicalise_addons(addon_rows)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg addons: {e}")
            addons = []

        try:
            logger.info("Fetching Offerings...")
            offerings = self.scrape_offerings()
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg offerings: {e}")
            offerings = []

        if languages:
            try:
                self.scrape_translations(characters, perks, items, addons, languages=languages)
            except Exception as e:
                logger.warning(f"Error during multi-language translation enrichment: {e}")

        return characters, perks, items, addons, offerings
