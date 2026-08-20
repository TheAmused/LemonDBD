# backend/app/scrapers/drivers/ja.py
from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional
from bs4 import BeautifulSoup

from app.scrapers.drivers.base import BaseWikiDriver
from app.scrapers.types import AddonData, CharacterData, ItemData, PerkData
from app.scrapers.utils import (
    clean_description_text,
    extract_cell_markdown_text,
    normalize_name_key,
)

logger = logging.getLogger(__name__)


class WikiGGDriverJP(BaseWikiDriver):
    """Specialized driver for scraping Dead by Daylight Japanese Wiki."""

    def __init__(self, base_dir: Optional[Any] = None):
        super().__init__(base_dir=base_dir, lang_code="ja")

    def enrich_translations(
        self,
        characters: List[CharacterData],
        perks: List[PerkData],
        items: List[ItemData],
        addons: List[AddonData],
    ) -> None:
        """Scrapes Japanese sources and enriches canonical entities with Japanese names and descriptions."""
        from app.scrapers.drivers.base import PORTRAIT_PATTERN, extract_icon_token

        logger.info("Enriching entities with Japanese (ja/jp) translations...")
        indexes = self.build_lookup_indexes(characters, perks, items, addons)
        perks_by_token = indexes["perks"]
        chars_by_token = indexes["characters"]
        items_by_token = indexes["items"]
        addons_by_token = indexes["addons"]

        # Japanese perk enrichment
        try:
            p_html = self.fetch_page_html("パーク")
            if p_html:
                soup = BeautifulSoup(p_html, "html.parser")
                for table in soup.find_all("table"):
                    for row in table.find_all("tr")[1:]:
                        cells = row.find_all(["td", "th"])
                        if len(cells) >= 2:
                            img = row.find("img")
                            tok = extract_icon_token(img.get("src", "") if img else "")

                            name_tag = cells[1].find("a") if len(cells) > 1 else cells[0].find("a")
                            if name_tag:
                                translated_name = name_tag.get_text().strip()
                            elif len(cells) > 1:
                                translated_name = cells[1].get_text(separator="\n", strip=True).splitlines()[0].strip()
                            else:
                                translated_name = cells[0].get_text().strip()

                            desc = ""
                            if len(cells) >= 3:
                                desc = extract_cell_markdown_text(cells[2])

                            matched_p = perks_by_token.get(tok)
                            if matched_p and translated_name and not translated_name.isdigit():
                                clean_desc = desc if desc else (matched_p.translations.get("ja", {}).get("description") or "")
                                entry = {
                                    "name": translated_name,
                                    "description": clean_desc,
                                }
                                matched_p.translations["ja"] = entry
                                matched_p.translations["jp"] = entry
        except Exception as e:
            logger.warning(f"Error enriching Japanese perks: {e}")
