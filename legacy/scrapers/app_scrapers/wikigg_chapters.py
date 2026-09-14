# legacy/scrapers/app_scrapers/wikigg_chapters.py
# backend/app/scrapers/wikigg_chapters.py
from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup, Tag

from app.scrapers.types import ChapterImageData
from app.scrapers.utils import extract_high_res_url, normalize_name_key, sanitize_filename
from app.scrapers.wikigg import logger, parse_date_and_year

# The wiki's own MediaWiki page title for its homepage (confirmed via
# action=query&meta=siteinfo&siprop=general -> "mainpage") -- not "Main_Page",
# which the site doesn't actually use as its title.
HOMEPAGE_TITLE = "Dead by Daylight Wiki"


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

    def scrape_chapter_capsule_images(self) -> dict[str, str]:
        """Scrapes the homepage's "Chapter DLC" gallery (a `dlcCapsule` grid
        under a `categoryLabel` div reading "Chapter DLC", between the
        "Downloadable Content" and "Retired Clothing Pack" categories) for
        each chapter's illustrated capsule art -- a single page fetch covering
        every chapter, unlike the small text-logo scraped from the DLC
        catalog tables in scrape_dlcs_from_wiki. Returns a dict keyed by
        normalize_name_key(chapter name) so callers can match it against
        scrape_dlcs_from_wiki's own dlc_name without assuming the two sources
        format names identically."""
        capsules: dict[str, str] = {}
        try:
            html_doc = self.fetch_page_html(HOMEPAGE_TITLE)
            soup = BeautifulSoup(html_doc, "html.parser")
            label = next(
                (d for d in soup.find_all("div", class_="categoryLabel")
                 if d.get_text(strip=True) == "Chapter DLC"),
                None,
            )
            category_dlcs = label.find_next_sibling("div", class_="categoryDlcs") if label else None
            if not category_dlcs:
                logger.warning("Could not find the homepage's 'Chapter DLC' capsule gallery")
                return capsules

            for capsule in category_dlcs.find_all("div", class_="dlcCapsule"):
                img_tag = capsule.find("img")
                link_tag = capsule.find("div", class_="dlcLink")
                name = link_tag.get_text(strip=True) if link_tag else None
                image_url = extract_high_res_url(img_tag, self.BASE_DOMAIN) if img_tag else None
                if name and image_url:
                    capsules[normalize_name_key(name)] = image_url
        except Exception as e:
            logger.warning(f"Failed scraping homepage chapter capsule gallery: {e}")
        return capsules

    def scrape_chapter_images(self) -> list["ChapterImageData"]:
        """Wraps scrape_dlcs_from_wiki to produce banner-image records keyed by
        the same canonical DLC/chapter name this app already stores on
        Character.chapter_name, for entries where a banner image was found.

        Prefers the homepage's illustrated capsule art (scrape_chapter_capsule_images)
        over the small text-logo scraped from the DLC catalog tables, falling
        back to the logo for any chapter the capsule gallery doesn't cover."""
        capsules = self.scrape_chapter_capsule_images()
        results: list[ChapterImageData] = []
        for dlc in self.scrape_dlcs_from_wiki():
            name = dlc["dlc_name"]
            image_url = capsules.get(normalize_name_key(name)) or dlc.get("dlc_image_url")
            if not image_url:
                continue
            slug = sanitize_filename(name)
            results.append(
                ChapterImageData(
                    name=name,
                    banner_url=image_url,
                    banner_local_path=f"chapters/{slug}.png",
                )
            )
        return results
