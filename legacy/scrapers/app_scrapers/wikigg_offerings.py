# legacy/scrapers/app_scrapers/wikigg_offerings.py
# backend/app/scrapers/wikigg_offerings.py
from __future__ import annotations

from bs4 import BeautifulSoup

from app.scrapers.types import OfferingData
from app.scrapers.utils import (
    clean_description_text,
    extract_high_res_url,
    normalize_name_key,
    sanitize_filename,
)
from app.scrapers.wikigg import extract_rarity_from_elements, logger


class WikiGGOfferingsMixin:
    """Offering scraping, mixed into WikiGGScraperDriver."""

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
