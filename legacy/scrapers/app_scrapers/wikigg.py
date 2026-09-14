# legacy/scrapers/app_scrapers/wikigg.py
# backend/app/scrapers/wikigg.py
from __future__ import annotations

import html
import logging
import re
import time
from pathlib import Path
from bs4 import Tag
from curl_cffi import requests

from app.scrapers.types import (
    AddonData,
    CharacterData,
    ItemData,
    OfferingData,
    PerkData,
)
from app.scrapers.utils import normalize_name_key

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


from app.scrapers.wikigg_addons import WikiGGAddonsMixin
from app.scrapers.wikigg_chapters import WikiGGChaptersMixin
from app.scrapers.wikigg_characters import WikiGGCharactersMixin
from app.scrapers.wikigg_items import WikiGGItemsMixin
from app.scrapers.wikigg_offerings import WikiGGOfferingsMixin
from app.scrapers.wikigg_perks import WikiGGPerksMixin
from app.scrapers.wikigg_realms import WikiGGRealmsMixin


class WikiGGScraperDriver(
    WikiGGCharactersMixin,
    WikiGGChaptersMixin,
    WikiGGPerksMixin,
    WikiGGItemsMixin,
    WikiGGAddonsMixin,
    WikiGGOfferingsMixin,
    WikiGGRealmsMixin,
):
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
