# backend/app/scrapers/drivers/de.py
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


class WikiGGDriverDE(BaseWikiDriver):
    """Specialized driver for scraping Dead by Daylight German Wiki (de.deadbydaylight.wiki.gg)."""

    def __init__(self, base_dir: Optional[Any] = None):
        super().__init__(base_dir=base_dir, lang_code="de")

    def enrich_translations(
        self,
        characters: List[CharacterData],
        perks: List[PerkData],
        items: List[ItemData],
        addons: List[AddonData],
    ) -> None:
        """Scrapes German pages and enriches canonical entities with German names and descriptions."""
        from app.scrapers.drivers.base import PORTRAIT_PATTERN, extract_icon_token

        logger.info("Enriching entities with German (de) translations...")
        indexes = self.build_lookup_indexes(characters, perks, items, addons)
        perks_by_token = indexes["perks"]
        chars_by_token = indexes["characters"]
        items_by_token = indexes["items"]
        addons_by_token = indexes["addons"]

        # 1. German Perks (Talente)
        try:
            p_html = self.fetch_page_html("Talente")
            if p_html:
                soup = BeautifulSoup(p_html, "html.parser")
                for table in soup.find_all("table"):
                    rows = table.find_all("tr")
                    for row in rows:
                        cells = row.find_all(["td", "th"])
                        if len(cells) >= 2:
                            img = row.find("img")
                            tok = extract_icon_token(img.get("src", "") if img else "")

                            # German wiki includes <small>English Name</small> in the name cell
                            small_tag = row.find("small")
                            small_text = normalize_name_key(small_tag.get_text() if small_tag else "")

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

                            matched_p = perks_by_token.get(tok) or (perks_by_token.get(small_text) if small_text else None)
                            if matched_p and translated_name and not translated_name.isdigit():
                                clean_desc = desc if desc else (matched_p.translations.get("de", {}).get("description") or "")
                                matched_p.translations["de"] = {
                                    "name": translated_name,
                                    "description": clean_desc,
                                }
        except Exception as e:
            logger.warning(f"Error enriching German perks: {e}")

        # 2. German Characters (Killer and Überlebende)
        try:
            for c_page in ["Killer", "Überlebende"]:
                c_html = self.fetch_page_html(c_page)
                if c_html:
                    soup = BeautifulSoup(c_html, "html.parser")
                    for table in soup.find_all("table"):
                        for row in table.find_all("tr"):
                            cells = row.find_all(["td", "th"])
                            for cell_idx, cell in enumerate(cells):
                                imgs = cell.find_all("img")
                                for img in imgs:
                                    src = img.get("src", "")
                                    m = PORTRAIT_PATTERN.search(src)
                                    if m:
                                        code = f"{m.group(1).upper()}{int(m.group(2)):02d}"
                                        matched_c = chars_by_token.get(code)
                                        if matched_c:
                                            txt = cell.get_text(" ", strip=True)
                                            if not txt and len(cells) > cell_idx + 1:
                                                txt = cells[cell_idx + 1].get_text(" ", strip=True)
                                            if not txt:
                                                txt = row.get_text(" ", strip=True)
                                            parts = [p.strip() for p in re.split(r"[-–:]", txt) if p.strip()]
                                            translated_name = parts[-1] if parts else txt
                                            if translated_name:
                                                if "de" not in matched_c.translations:
                                                    matched_c.translations["de"] = {
                                                        "name": translated_name,
                                                        "lore": matched_c.lore or "",
                                                    }
                                                else:
                                                    matched_c.translations["de"]["name"] = translated_name
        except Exception as e:
            logger.warning(f"Error enriching German characters: {e}")

        # 3. German Items (Gegenstände)
        try:
            i_html = self.fetch_page_html("Gegenstände")
            if i_html:
                soup = BeautifulSoup(i_html, "html.parser")
                for table in soup.find_all("table"):
                    for row in table.find_all("tr")[1:]:
                        cells = row.find_all(["td", "th"])
                        if len(cells) >= 2:
                            img = row.find("img")
                            tok = extract_icon_token(img.get("src", "") if img else "")
                            name_tag = cells[1].find("a") if len(cells) > 1 else cells[0].find("a")
                            name = (name_tag.get_text() if name_tag else cells[1].get_text()).strip()
                            desc = ""
                            if len(cells) >= 4:
                                desc = extract_cell_markdown_text(cells[3])
                            elif len(cells) == 3:
                                desc = extract_cell_markdown_text(cells[2])

                            matched_i = items_by_token.get(tok)
                            if matched_i and name:
                                matched_i.translations["de"] = {
                                    "name": name,
                                    "description": desc,
                                }
        except Exception as e:
            logger.warning(f"Error enriching German items: {e}")

        # 4. German Addons (Zusätze)
        try:
            a_html = self.fetch_page_html("Zusätze")
            if a_html:
                soup = BeautifulSoup(a_html, "html.parser")
                for table in soup.find_all("table"):
                    for row in table.find_all("tr")[1:]:
                        cells = row.find_all(["td", "th"])
                        if len(cells) >= 2:
                            img = row.find("img")
                            tok = extract_icon_token(img.get("src", "") if img else "")
                            name_tag = cells[1].find("a") if len(cells) > 1 else cells[0].find("a")
                            name = (name_tag.get_text() if name_tag else cells[1].get_text()).strip()
                            desc = ""
                            if len(cells) >= 4:
                                desc = extract_cell_markdown_text(cells[3])
                            elif len(cells) == 3:
                                desc = extract_cell_markdown_text(cells[2])

                            matched_a = addons_by_token.get(tok)
                            if matched_a and name:
                                matched_a.translations["de"] = {
                                    "name": name,
                                    "description": desc,
                                }
        except Exception as e:
            logger.warning(f"Error enriching German addons: {e}")
