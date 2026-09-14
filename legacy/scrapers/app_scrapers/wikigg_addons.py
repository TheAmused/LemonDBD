# legacy/scrapers/app_scrapers/wikigg_addons.py
# backend/app/scrapers/wikigg_addons.py
from __future__ import annotations

import re
from collections import defaultdict
from bs4 import BeautifulSoup

from app.scrapers.constants import KNOWN_KILLER_POWER_ALIASES
from app.scrapers.types import AddonData, CharacterData
from app.scrapers.utils import (
    extract_cell_markdown_text,
    extract_high_res_url,
    normalize_name_key,
    sanitize_filename,
)
from app.scrapers.wikigg import extract_rarity_from_elements


class WikiGGAddonsMixin:
    """Add-on scraping and canonicalisation, mixed into WikiGGScraperDriver."""

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
