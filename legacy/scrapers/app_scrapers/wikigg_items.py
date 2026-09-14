# legacy/scrapers/app_scrapers/wikigg_items.py
# backend/app/scrapers/wikigg_items.py
from __future__ import annotations

from bs4 import BeautifulSoup

from app.scrapers.types import ItemData
from app.scrapers.utils import (
    clean_description_text,
    extract_high_res_url,
    normalize_name_key,
    sanitize_filename,
)
from app.scrapers.wikigg import extract_rarity_from_elements


class WikiGGItemsMixin:
    """Item scraping, mixed into WikiGGScraperDriver."""

    def parse_wiki_items(self, html_content: str) -> list[ItemData]:
        soup = BeautifulSoup(html_content, "html.parser")
        items: list[ItemData] = []
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
                        local_path = f"icons/items/{sanitized}.webp"

                        name_low = item_name.lower().strip()
                        is_event = (
                            rarity.lower() == "event"
                            or any(
                                k in name_low
                                for k in [
                                    "anniversary",
                                    "banquet",
                                    "masquerade",
                                    "lunchbox",
                                    "will o' wisp",
                                    "party starter",
                                    "chinese firecracker",
                                    "festive toolbox",
                                ]
                            )
                        )
                        is_fog_vial = "fog vial" in name_low
                        is_trial = (
                            name_low
                            in [
                                "first aid spray",
                                "vaccine",
                                "emp",
                                "remote flame turret",
                                "pocket mirror",
                                "lament configuration",
                                "hand of vecna",
                                "eye of vecna",
                                "flash grenade",
                                "candelabra",
                                "antidote",
                                "keycard",
                                "vhs tape",
                                "void crystal",
                                "glowing fungus",
                                "blood can",
                                "fragile mirror",
                                "searcher's pendant",
                                "fog crystal",
                            ]
                            or any(
                                k in name_low
                                for k in [
                                    "spray",
                                    "vaccine",
                                    "turret",
                                    "lament",
                                    "vecna",
                                    "keycard",
                                    "candelabra",
                                    "lantern",
                                    "vhs tape",
                                    "blood can",
                                    "crystal",
                                    "mirror",
                                    "fungus",
                                    "pendant",
                                    "antidote",
                                    "emp",
                                ]
                            )
                        )

                        if is_event:
                            item_category = "Event"
                            item_role = "Survivor"
                            rarity = "Event"
                        elif is_fog_vial:
                            item_category = "Fog Vial"
                            item_role = "Survivor"
                        elif is_trial:
                            item_category = "Trial Artifact"
                            item_role = "Survivor"
                        elif "med-kit" in name_low or "aid kit" in name_low:
                            item_category = "Med-Kit"
                            item_role = "Survivor"
                        elif "toolbox" in name_low or "tools" in name_low:
                            item_category = "Toolbox"
                            item_role = "Survivor"
                        elif "flashlight" in name_low:
                            item_category = "Flashlight"
                            item_role = "Survivor"
                        elif "key" in name_low:
                            item_category = "Key"
                            item_role = "Survivor"
                        elif "map" in name_low:
                            item_category = "Map"
                            item_role = "Survivor"
                        elif "firecracker" in name_low:
                            item_category = "Firecracker"
                            item_role = "Survivor"
                        else:
                            item_category = current_category
                            item_role = current_category

                        items.append(
                            ItemData(
                                name=item_name,
                                category=item_category,
                                role=item_role,
                                description=description,
                                icon_url=icon_url,
                                icon_local_path=local_path,
                                rarity=rarity,
                            )
                        )
                    except Exception:
                        continue
        return items
