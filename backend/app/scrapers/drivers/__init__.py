# backend/app/scrapers/drivers/__init__.py
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
