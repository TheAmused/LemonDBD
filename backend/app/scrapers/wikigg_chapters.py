# backend/app/scrapers/wikigg_chapters.py
from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup, Tag

from app.scrapers.types import ChapterImageData
from app.scrapers.utils import extract_high_res_url, sanitize_filename
from app.scrapers.wikigg import parse_date_and_year


class WikiGGChaptersMixin:
    """DLC/chapter banner-image scraping, mixed into WikiGGScraperDriver."""

    def _extract_dlc_image_url(self, node: Tag) -> str | None:
        """Finds the nearest banner/key-art <img> within a DLC catalog row or
        heading-block, resolved to a high-res absolute URL. Returns None if the
        node has no image (frontend falls back to a plain text header)."""
        img_tag = node.find("img")
        if not img_tag:
            return None
        return extract_high_res_url(img_tag, self.BASE_DOMAIN) or None

    def scrape_dlcs_from_wiki(self) -> list[dict[str, Any]]:
        dlcs: list[dict[str, Any]] = []
        seen_dlc_names = set()

        for page in ["Downloadable_Content", "Chapters"]:
            try:
                html_doc = self.fetch_page_html(page)
                soup = BeautifulSoup(html_doc, "html.parser")
                content = soup.find("div", class_="mw-parser-output") or soup

                for table in content.find_all("table", class_=re.compile(r"wikitable|article-table")):
                    rows = table.find_all("tr")
                    for tr in rows:
                        tds = tr.find_all("td")
                        if not tds:
                            continue

                        row_text = tr.get_text(separator=" ", strip=True)
                        date_str, year_num = parse_date_and_year(row_text)

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
                                "dlc_image_url": self._extract_dlc_image_url(tr),
                            })

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
                        image_url = None
                        is_licensed = is_under_licensed or "™" in raw_title or "®" in raw_title

                        curr = node.find_next_sibling()
                        while curr and curr.name not in ["h2", "h3", "h4"]:
                            txt = curr.get_text(separator=" ", strip=True)
                            d_parsed, y_parsed = parse_date_and_year(txt)
                            if d_parsed and not date_str:
                                date_str = d_parsed
                                year_num = y_parsed

                            if not image_url:
                                image_url = self._extract_dlc_image_url(curr)

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
                                "dlc_image_url": image_url,
                            })
            except Exception as e:
                logger.warning(f"Failed scraping DLC catalog from '{page}': {e}")

        return dlcs

    def scrape_chapter_images(self) -> list["ChapterImageData"]:
        """Wraps scrape_dlcs_from_wiki to produce banner-image records keyed by
        the same canonical DLC/chapter name this app already stores on
        Character.chapter_name, for entries where a banner image was found."""
        results: list[ChapterImageData] = []
        for dlc in self.scrape_dlcs_from_wiki():
            image_url = dlc.get("dlc_image_url")
            if not image_url:
                continue
            name = dlc["dlc_name"]
            slug = sanitize_filename(name)
            results.append(
                ChapterImageData(
                    name=name,
                    banner_url=image_url,
                    banner_local_path=f"chapters/{slug}.png",
                )
            )
        return results
