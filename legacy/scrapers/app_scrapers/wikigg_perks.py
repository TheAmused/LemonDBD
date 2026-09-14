# legacy/scrapers/app_scrapers/wikigg_perks.py
# backend/app/scrapers/wikigg_perks.py
from __future__ import annotations

import re
from bs4 import BeautifulSoup

from app.scrapers.constants import GENERIC_PERK_CANONICAL_MAP
from app.scrapers.types import CharacterData, PerkData
from app.scrapers.utils import (
    clean_description_text,
    extract_high_res_url,
    extract_slug_from_href,
    normalize_name_key,
    sanitize_filename,
)


class WikiGGPerksMixin:
    """Perk scraping, mixed into WikiGGScraperDriver."""

    def parse_perks(self, html_content: str, characters: list[CharacterData]) -> list[PerkData]:
        soup = BeautifulSoup(html_content, "html.parser")
        perks_dict: dict[str, PerkData] = {}
        alias_backlog: dict[str, str] = {}
        current_category: str | None = None
        content_area = soup.find("div", class_="mw-parser-output") or soup

        char_by_key: dict[str, CharacterData] = {}
        for c in characters:
            keys = [c.name, c.real_name, c.wiki_slug, c.short_name]
            if c.name.startswith("The "):
                keys.append(c.name[4:])
            else:
                keys.append(f"The {c.name}")
            for k in keys:
                if k:
                    char_by_key[normalize_name_key(k)] = c

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                header_text = element.get_text().lower()
                if "survivor" in header_text:
                    current_category = "Survivor"
                elif "killer" in header_text:
                    current_category = "Killer"

            elif element.name == "table" and "wikitable" in element.get("class", []):
                if not current_category:
                    continue

                rows = element.find_all("tr")
                for row in rows[1:]:
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 3:
                        continue
                    try:
                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        perk_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                        if not perk_name:
                            continue

                        norm_perk = normalize_name_key(perk_name)

                        if norm_perk in GENERIC_PERK_CANONICAL_MAP:
                            canonical_target, alias_name = GENERIC_PERK_CANONICAL_MAP[norm_perk]
                            norm_target = normalize_name_key(canonical_target)
                            if norm_target in perks_dict:
                                perks_dict[norm_target].alternate_name = alias_name
                                perks_dict[norm_target].is_generic_counterpart = True
                            else:
                                alias_backlog[norm_target] = alias_name
                            continue

                        icon_tag = cells[0].find("img")
                        icon_url = extract_high_res_url(icon_tag, self.BASE_DOMAIN)

                        cell_copy = BeautifulSoup(str(cells[2]), "html.parser")
                        for bold in cell_copy.find_all(["b", "strong"]):
                            bold.replace_with(f"**{bold.get_text().strip()}**")
                        for italic in cell_copy.find_all(["i", "em"]):
                            italic.replace_with(f"*{italic.get_text().strip()}*")
                        for li in cell_copy.find_all("li"):
                            li.replace_with(f"\n* {li.get_text().strip()}")
                        for br in cell_copy.find_all("br"):
                            br.replace_with("\n")
                        lines = [line.strip() for line in cell_copy.get_text().splitlines()]
                        raw_description = "\n".join(line for line in lines if line)
                        description = clean_description_text(raw_description)

                        canonical_name = "General"
                        real_name = "General"
                        avatar_path = ""

                        if len(cells) >= 4:
                            owner_cell = cells[3]
                            owner_link = owner_cell.find("a")

                            matched = None
                            if owner_link:
                                href = owner_link.get("href", "")
                                link_title = owner_link.get("title", "").strip()
                                slug = extract_slug_from_href(href)
                                matched = (
                                    char_by_key.get(normalize_name_key(slug))
                                    or char_by_key.get(normalize_name_key(link_title))
                                    or char_by_key.get(normalize_name_key(owner_link.get_text()))
                                )

                            if not matched:
                                raw_text = owner_cell.get_text().strip()
                                clean_text = re.sub(r"^[.\s\-–]+|[.\s\-–]+$", "", raw_text).strip()
                                if clean_text and normalize_name_key(clean_text) not in ["all", "general", "none", "", "all survivors", "all killers"]:
                                    matched = char_by_key.get(normalize_name_key(clean_text))

                            if matched:
                                canonical_name = matched.name
                                real_name = matched.real_name
                                avatar_path = matched.avatar_local_path

                        sanitized_name = sanitize_filename(perk_name)
                        category_dir = "survivors" if current_category == "Survivor" else "killers"

                        if canonical_name == "General":
                            local_rel_path = f"icons/{category_dir}/General/{sanitized_name}.webp"
                        else:
                            local_rel_path = f"icons/{category_dir}/{canonical_name}/{sanitized_name}.webp"

                        norm_key_str = normalize_name_key(perk_name)
                        alternate_name = alias_backlog.get(norm_key_str)
                        is_generic = alternate_name is not None

                        perks_dict[norm_key_str] = PerkData(
                            name=perk_name,
                            character=canonical_name,
                            character_real_name=real_name,
                            character_avatar_path=avatar_path,
                            category=current_category,
                            description=description,
                            icon_url=icon_url,
                            icon_local_path=local_rel_path,
                            alternate_name=alternate_name,
                            is_generic_counterpart=is_generic,
                        )
                    except Exception:
                        continue

        return list(perks_dict.values())
