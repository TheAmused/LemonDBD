import logging
import re
from collections import defaultdict
from pathlib import Path
from typing import List, Optional, Tuple
from bs4 import BeautifulSoup
from curl_cffi import requests
from app.scrapers.constants_wikigg import (
    CHARACTER_ALIASES,
    DEPRECATED_PERK_NAMES,
    EXCLUDED_SLUGS,
    PORTRAIT_PATTERN,
    RENAMED_PERK_MAP,
)
from app.scrapers.types import AddonData, CharacterData, ItemData, PerkData
from app.scrapers.utils import (
    classify_portrait,
    clean_description_text,
    extract_high_res_url,
    extract_slug_from_href,
    normalize_name_key,
    normalise_character_name,
    sanitize_filename,
)

logger = logging.getLogger(__name__)


class WikiGGScraperDriver:
    BASE_DOMAIN = "https://deadbydaylight.wiki.gg"
    PERKS_URL = "https://deadbydaylight.wiki.gg/wiki/Perks"
    SURVIVORS_URL = "https://deadbydaylight.wiki.gg/wiki/Survivors"
    KILLERS_URL = "https://deadbydaylight.wiki.gg/wiki/Killers"
    ITEMS_URL = "https://deadbydaylight.wiki.gg/wiki/Items"
    ADDONS_URL = "https://deadbydaylight.wiki.gg/wiki/Add-ons"

    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://deadbydaylight.wiki.gg/wiki/Dead_by_Daylight_Wiki",
    }

    PORTRAIT_PATTERN = PORTRAIT_PATTERN
    ROLE_BY_PREFIX = {"K": "Killer", "S": "Survivor"}
    EXCLUDED_SLUGS = EXCLUDED_SLUGS
    CHARACTER_ALIASES = CHARACTER_ALIASES

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_dir = Path(base_dir)

    def fetch_html(self, url: str) -> str:
        try:
            response = requests.get(
                url,
                headers=self.HEADERS,
                impersonate=self.IMPERSONATE_BROWSER,
                verify=True,
                timeout=self.REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            return response.text
        except Exception as err:
            err_msg = str(err).lower()
            if "certificate" in err_msg or "ssl" in err_msg or "curl: (60)" in err_msg:
                logger.warning(f"SSL verification failed for {url}. Retrying with verify=False...")
                response = requests.get(
                    url,
                    headers=self.HEADERS,
                    impersonate=self.IMPERSONATE_BROWSER,
                    verify=False,
                    timeout=self.REQUEST_TIMEOUT,
                )
                response.raise_for_status()
                return response.text
            raise

    def scrape_characters_dynamically(self) -> List[CharacterData]:
        characters: List[CharacterData] = []
        seen_slugs = set()

        def process_page(url: str, default_category: str):
            try:
                logger.info(f"Scraping {default_category} from deadbydaylight.wiki.gg...")
                html = self.fetch_html(url)
                soup = BeautifulSoup(html, "html.parser")
                content = soup.find("div", class_="mw-parser-output") or soup

                for link in content.find_all("a", href=re.compile(r"^/wiki/")):
                    href = link.get("href", "")
                    slug = extract_slug_from_href(href)
                    slug_lower = slug.lower()

                    if not slug or slug_lower in seen_slugs or slug_lower in self.EXCLUDED_SLUGS:
                        continue

                    if slug.startswith(("Category:", "File:", "Special:", "Dead_by_Daylight", "Help:", "User:", "Template:", "Tome")):
                        continue

                    img = link.find("img")
                    if not img:
                        continue

                    avatar_url = extract_high_res_url(img, self.BASE_DOMAIN)
                    if not avatar_url:
                        continue

                    filename = avatar_url.split("/")[-1]
                    match = self.PORTRAIT_PATTERN.match(filename)
                    if not match:
                        continue

                    category = "Killer" if match.group(1).upper() == "K" else "Survivor"
                    try:
                        release_number = int(match.group(2))
                    except ValueError:
                        release_number = 0

                    title = link.get("title", "").strip() or link.get_text().strip()
                    full_name = title.replace("_", " ").strip()
                    if not full_name or len(full_name) > 50:
                        continue

                    if any(x in slug_lower for x in ["perk", "item", "addon", "power", "patch", "dlc", "store", "tips", "bloodpoint"]):
                        continue

                    seen_slugs.add(slug_lower)
                    sanitized = sanitize_filename(full_name)
                    sub_dir = "survivors" if category == "Survivor" else "killers"

                    characters.append(
                        CharacterData(
                            name=full_name,
                            real_name=full_name,
                            wiki_slug=slug,
                            short_name=slug_lower,
                            category=category,
                            avatar_url=avatar_url,
                            avatar_local_path=f"avatars/{sub_dir}/{sanitized}.png",
                            release_number=release_number,
                        )
                    )
            except Exception as e:
                logger.error(f"Error scraping {default_category} from wiki.gg: {e}")

        process_page(self.SURVIVORS_URL, "Survivor")
        process_page(self.KILLERS_URL, "Killer")

        return characters

    def parse_perks(self, html_content: str, characters: List[CharacterData]) -> List[PerkData]:
        soup = BeautifulSoup(html_content, "html.parser")
        perks: List[PerkData] = []
        current_category: Optional[str] = None
        content_area = soup.find("div", class_="mw-parser-output") or soup
        seen_perks = set()

        char_by_key = {}
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
                        icon_tag = cells[0].find("img")
                        icon_url = extract_high_res_url(icon_tag, self.BASE_DOMAIN)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        perk_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()

                        if not perk_name:
                            continue

                        norm_perk = normalize_name_key(perk_name)

                        if norm_perk in DEPRECATED_PERK_NAMES and norm_perk not in RENAMED_PERK_MAP:
                            continue

                        if norm_perk in RENAMED_PERK_MAP:
                            perk_name = RENAMED_PERK_MAP[norm_perk]
                            norm_perk = normalize_name_key(perk_name)

                        if norm_perk in seen_perks:
                            continue
                        seen_perks.add(norm_perk)

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
                                alias_target = self.CHARACTER_ALIASES.get(link_title.lower()) or self.CHARACTER_ALIASES.get(slug.lower())
                                if alias_target:
                                    matched = char_by_key.get(normalize_name_key(alias_target))
                                if not matched:
                                    matched = char_by_key.get(normalize_name_key(slug)) or char_by_key.get(normalize_name_key(link_title))

                            if not matched:
                                raw_text = owner_cell.get_text().strip()
                                clean_text = re.sub(r"^[.\s\-–]+|[.\s\-–]+$", "", raw_text).strip().lower()

                                if clean_text and clean_text not in ["all", "general", "none", "-", "all survivors", "all killers"]:
                                    alias_target = self.CHARACTER_ALIASES.get(clean_text)
                                    if alias_target:
                                        matched = char_by_key.get(normalize_name_key(alias_target))
                                    if not matched:
                                        matched = char_by_key.get(normalize_name_key(clean_text))

                            if matched:
                                canonical_name = matched.name
                                real_name = matched.real_name
                                avatar_path = matched.avatar_local_path

                        sanitized_name = sanitize_filename(perk_name)
                        category_dir = "survivors" if current_category == "Survivor" else "killers"

                        if canonical_name == "General":
                            local_rel_path = f"icons/{category_dir}/General/{sanitized_name}.png"
                        else:
                            local_rel_path = f"icons/{category_dir}/{canonical_name}/{sanitized_name}.png"

                        perks.append(
                            PerkData(
                                name=perk_name,
                                character=canonical_name,
                                character_real_name=real_name,
                                character_avatar_path=avatar_path,
                                category=current_category,
                                description=description,
                                icon_url=icon_url,
                                icon_local_path=local_rel_path,
                            )
                        )
                    except Exception:
                        continue
        return perks

    def parse_wiki_items(self, html_content: str) -> List[ItemData]:
        soup = BeautifulSoup(html_content, "html.parser")
        items: List[ItemData] = []
        content_area = soup.find("div", class_="mw-parser-output") or soup
        current_category = "Survivor"
        seen_items = set()

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                htext = element.get_text().lower()
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
                        header_exclusions = {
                            "uncommon items", "rare items", "very rare items", "ultra rare items",
                            "common items", "event items", "unused item", "limited items",
                            "survivor items", "killer items", "items", "add-ons", "addons", "equipment"
                        }
                        if name_lower in header_exclusions or name_lower.endswith(" items") or name_lower.endswith(" add-ons"):
                            continue

                        norm_item = normalize_name_key(item_name)
                        if norm_item in seen_items:
                            continue
                        seen_items.add(norm_item)

                        rarity = ""
                        description = ""
                        if len(cells) >= 4:
                            rarity = cells[2].get_text().strip()
                            description = cells[3].get_text(separator="\n", strip=True)
                        elif len(cells) == 3:
                            description = cells[2].get_text(separator="\n", strip=True)

                        description = clean_description_text(description)

                        if not rarity:
                            for r_word in ["Ultra Rare", "Very Rare", "Rare", "Uncommon", "Common", "Event", "Iridescent"]:
                                if r_word.lower() in description.lower():
                                    rarity = r_word
                                    break

                        sanitized = sanitize_filename(item_name)
                        local_path = f"icons/items/{sanitized}.png"

                        items.append(
                            ItemData(
                                name=item_name,
                                category=current_category,
                                role=current_category,
                                description=description,
                                icon_url=icon_url,
                                icon_local_path=local_path,
                                rarity=rarity,
                            )
                        )
                    except Exception:
                        continue
        return items

    def parse_wiki_addons(self, html_content: str) -> List[AddonData]:
        soup = BeautifulSoup(html_content, "html.parser")
        raw_addons: List[dict] = []
        content_area = soup.find("div", class_="mw-parser-output") or soup
        current_target = "General"
        current_category = "Survivor"

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                htext = element.get_text().strip()
                htext_lower = htext.lower()
                if "killer" in htext_lower:
                    current_category = "Killer"
                elif "survivor" in htext_lower:
                    current_category = "Survivor"

                target_clean = re.sub(r"\s+(?:Add-ons|Addons)$", "", htext, flags=re.IGNORECASE).strip()
                if target_clean and target_clean.lower() not in ["survivor", "killer", "general", "common", "uncommon", "rare", "very rare", "ultra rare"]:
                    current_target = target_clean

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
                        addon_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                        if not addon_name:
                            continue

                        rarity = ""
                        description = ""
                        if len(cells) >= 4:
                            rarity = cells[2].get_text().strip()
                            description = cells[3].get_text(separator="\n", strip=True)
                        elif len(cells) == 3:
                            description = cells[2].get_text(separator="\n", strip=True)

                        description = clean_description_text(description)

                        if not rarity:
                            for r_word in ["Ultra Rare", "Very Rare", "Rare", "Uncommon", "Common", "Event", "Iridescent"]:
                                if r_word.lower() in description.lower():
                                    rarity = r_word
                                    break

                        raw_addons.append({
                            "name": addon_name,
                            "target": current_target,
                            "category": current_category,
                            "description": description,
                            "icon_url": icon_url,
                            "rarity": rarity,
                        })
                    except Exception:
                        continue

        name_target_counts = defaultdict(set)
        for a in raw_addons:
            name_target_counts[normalize_name_key(a["name"])].add(normalize_name_key(a["target"]))

        addons: List[AddonData] = []
        seen_unique_names = set()

        for a in raw_addons:
            addon_name = a["name"]
            norm_name = normalize_name_key(addon_name)
            target = a["target"]

            if len(name_target_counts[norm_name]) > 1:
                display_name = f"{addon_name} ({target})"
            else:
                display_name = addon_name

            norm_unique = normalize_name_key(display_name)
            if norm_unique in seen_unique_names:
                continue
            seen_unique_names.add(norm_unique)

            sanitized = sanitize_filename(display_name)
            local_path = f"icons/addons/{sanitized}.png"

            addons.append(
                AddonData(
                    name=display_name,
                    associated_target=target,
                    category=a["category"],
                    description=a["description"],
                    icon_url=a["icon_url"],
                    icon_local_path=local_path,
                    rarity=a["rarity"],
                )
            )

        return addons

    def scrape_all(self) -> Tuple[List[CharacterData], List[PerkData], List[ItemData], List[AddonData]]:
        logger.info("Scraping deadbydaylight.wiki.gg data...")
        characters = self.scrape_characters_dynamically()
        html = self.fetch_html(self.PERKS_URL)
        perks = self.parse_perks(html, characters)
        try:
            html_items = self.fetch_html(self.ITEMS_URL)
            items = self.parse_wiki_items(html_items)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg items: {e}")
            items = []
        try:
            html_addons = self.fetch_html(self.ADDONS_URL)
            addons = self.parse_wiki_addons(html_addons)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg addons: {e}")
            addons = []
        return characters, perks, items, addons