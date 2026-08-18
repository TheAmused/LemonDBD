from __future__ import annotations

import json
import logging
import re
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from bs4 import BeautifulSoup
from curl_cffi import requests

from app.scrapers.types import AddonData, CharacterData, ItemData, KillerPowerData, PerkData
from app.scrapers.utils import (
    clean_description_text,
    extract_high_res_url,
    extract_slug_from_href,
    normalize_name_key,
    sanitize_filename,
)

logger = logging.getLogger(__name__)

PORTRAIT_PATTERN = re.compile(r"(?:^|/)(K|S)(\d+)[-_]", re.IGNORECASE)

GENERIC_PERK_CANONICAL_MAP = {
    "will to live": ("Decisive Strike", "Will to Live"),
    "down to the last": ("Sole Survivor", "Down to the Last"),
    "bound by obsession": ("Object of Obsession", "Bound by Obsession"),
    "keep them waiting": ("Save the Best for Last", "Keep Them Waiting"),
    "see how they run": ("Play with Your Food", "See How They Run"),
    "cull the weak": ("Dying Light", "Cull the Weak"),
    "no holds barred": ("Deadlock", "No Holds Barred"),
    "hex fortune s fool": ("Hex: Plaything", "Hex: Fortune's Fool"),
    "hex fortunes fool": ("Hex: Plaything", "Hex: Fortune's Fool"),
    "scourge hook weeping wounds": ("Scourge Hook: Gift of Pain", "Scourge Hook: Weeping Wounds"),
    "jolt": ("Surge", "Jolt"),
    "fearmonger": ("Mindbreaker", "Fearmonger"),
    "claustrophobia": ("Cruel Limits", "Claustrophobia"),
    "guardian": ("Babysitter", "Guardian"),
    "kinship": ("Camaraderie", "Kinship"),
    "self aware": ("Fixated", "Self-Aware"),
    "selfaware": ("Fixated", "Self-Aware"),
    "situational awareness": ("Better Together", "Situational Awareness"),
    "inner healing": ("Inner Strength", "Inner Healing"),
    "renewal": ("Second Wind", "Renewal"),
}


class WikiGGScraperDriver:
    BASE_DOMAIN = "https://deadbydaylight.wiki.gg"
    API_URL = "https://deadbydaylight.wiki.gg/api.php"

    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_dir = Path(base_dir)
        self.session = requests.Session(impersonate=self.IMPERSONATE_BROWSER)

    def fetch_page_html(self, page_title: str) -> str:
        params = {
            "action": "parse",
            "page": page_title,
            "prop": "text",
            "format": "json",
        }
        for attempt in range(4):
            try:
                response = self.session.get(
                    self.API_URL,
                    params=params,
                    verify=False,
                    timeout=self.REQUEST_TIMEOUT,
                )
                if response.status_code == 200:
                    data = response.json()
                    if "parse" in data and "text" in data["parse"]:
                        return data["parse"]["text"]["*"]

                if response.status_code == 429:
                    time.sleep(2.0 * (attempt + 1))
                    continue

                response.raise_for_status()
            except Exception as err:
                logger.warning(f"API fetch attempt {attempt + 1} for '{page_title}' failed: {err}")
                time.sleep(1.5)

        fallback_url = f"{self.BASE_DOMAIN}/wiki/{page_title}"
        res = self.session.get(fallback_url, verify=False, timeout=self.REQUEST_TIMEOUT)
        res.raise_for_status()
        return res.text

    def scrape_roster_from_page(self, page_title: str, role: str) -> List[CharacterData]:
        html = self.fetch_page_html(page_title)
        soup = BeautifulSoup(html, "html.parser")
        content = soup.find("div", class_="mw-parser-output") or soup

        characters: List[CharacterData] = []
        seen_slugs: Set[str] = set()

        killer_meta_by_slug: Dict[str, Dict[str, Any]] = {}
        if role == "Killer":
            for cell in content.find_all(["td", "th"]):
                links = cell.find_all("a", href=re.compile(r"^/wiki/(?!File:|Category:|Special:).+"))
                text_links = [a for a in links if not a.find("img") and a.get_text(strip=True)]
                if len(text_links) >= 2:
                    power_tag = text_links[0]
                    killer_tag = text_links[1]
                    k_slug = extract_slug_from_href(killer_tag.get("href", "")).lower()
                    p_name = re.sub(r"\[\s*edit\s*\]", "", power_tag.get_text(strip=True), flags=re.IGNORECASE).strip()
                    if k_slug and p_name:
                        killer_meta_by_slug[k_slug] = {
                            "power_name": p_name,
                            "power_desc": "",
                            "movement_speed": "4.6 m/s (115%)",
                            "terror_radius": "32 m",
                            "terror_radius_meters": 32,
                            "height": "Tall",
                        }

        for link in content.find_all("a", href=re.compile(r"^/wiki/")):
            href = link.get("href", "")
            slug = extract_slug_from_href(href)
            slug_lower = slug.lower()

            if not slug or slug_lower in seen_slugs:
                continue
            if slug.startswith(("Category:", "File:", "Special:", "Dead_by_Daylight", "Help:", "User:", "Template:", "Tome")):
                continue

            img = link.find("img")
            if not img:
                continue

            avatar_url = extract_high_res_url(img, self.BASE_DOMAIN)
            if not avatar_url:
                continue

            filename = avatar_url.split("/revision")[0].rstrip("/").split("/")[-1]
            match = PORTRAIT_PATTERN.search(filename)
            if not match:
                continue

            prefix_role = "Killer" if match.group(1).upper() == "K" else "Survivor"
            if prefix_role != role:
                continue

            release_num = int(match.group(2))
            code_prefix = f"{match.group(1).upper()}{match.group(2)}"

            raw_title = (link.get("title") or link.get_text() or "").strip().replace("_", " ")
            if not raw_title or len(raw_title) > 60:
                raw_title = slug.replace("_", " ")

            seen_slugs.add(slug_lower)
            sanitized = sanitize_filename(raw_title)
            sub_dir = "survivors" if role == "Survivor" else "killers"

            power_data = None
            if role == "Killer":
                k_meta = (
                    killer_meta_by_slug.get(slug_lower)
                    or killer_meta_by_slug.get(slug_lower.replace("the_", ""))
                    or killer_meta_by_slug.get(f"the_{slug_lower}")
                    or {}
                )
                if not k_meta:
                    for km_slug, km_val in killer_meta_by_slug.items():
                        if km_slug in slug_lower or slug_lower in km_slug:
                            k_meta = km_val
                            break

                power_name = k_meta.get("power_name") or ""
                power_data = KillerPowerData(
                    name=power_name,
                    description=k_meta.get("power_desc", ""),
                    movement_speed=k_meta.get("movement_speed", "4.6 m/s (115%)"),
                    terror_radius=k_meta.get("terror_radius", "32 m"),
                    terror_radius_meters=k_meta.get("terror_radius_meters", 32),
                    height=k_meta.get("height", "Tall"),
                )

            characters.append(
                CharacterData(
                    name=raw_title,
                    real_name=raw_title,
                    wiki_slug=slug,
                    short_name=slug_lower,
                    category=role,
                    avatar_url=avatar_url,
                    avatar_local_path=f"avatars/{sub_dir}/{sanitized}.png",
                    release_number=release_num,
                    code_prefix=code_prefix,
                    power=power_data,
                )
            )

        return characters

    def scrape_dlcs_from_wiki(self) -> List[Dict[str, Any]]:
        """Scrapes the live Downloadable_Content catalog directly from wiki.gg."""
        try:
            html = self.fetch_page_html("Downloadable_Content")
            soup = BeautifulSoup(html, "html.parser")
            dlcs = []
            is_under_licensed_section = False

            for node in soup.find_all(["h2", "h3", "h4"]):
                if node.name == "h2":
                    h2_txt = node.get_text(strip=True).lower()
                    if "licensed dlcs" in h2_txt:
                        is_under_licensed_section = True
                    elif "available dlcs" in h2_txt or "unavailable" in h2_txt:
                        is_under_licensed_section = False

                if node.name in ["h3", "h4"]:
                    raw_title = (
                        node.get_text(strip=True)
                        .replace("[edit]", "")
                        .replace("â„¢", "™")
                        .replace("Â®", "®")
                        .strip()
                    )
                    if not raw_title or raw_title.lower() in [
                        "overview",
                        "purchasing a dlc",
                        "licensed dlcs",
                        "available dlcs",
                        "chapters",
                        "clothing packs",
                        "character packs",
                        "original soundtrack",
                    ]:
                        continue

                    date_str = ""
                    year_num = None
                    chars_added = []
                    is_licensed = (
                        is_under_licensed_section
                        or "™" in raw_title
                        or "®" in raw_title
                        or any(k in raw_title.lower() for k in [
                            "leatherface", "saw", "halloween", "ash", "ghost face", "stranger things",
                            "silent hill", "resident evil", "hellraiser", "sadako", "alien", "chucky",
                            "alan wake", "dungeons & dragons", "tomb raider", "castlevania", "nicolas cage", "left behind"
                        ])
                    )

                    curr = node.find_next_sibling()
                    while curr and curr.name not in ["h2", "h3", "h4"]:
                        txt = curr.get_text(separator=" ", strip=True)
                        if "was released" in txt or "released on" in txt or "released for" in txt:
                            dm = re.search(r"\bon\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", txt, re.I)
                            if dm:
                                date_str = dm.group(1).strip()
                            ym = re.search(r"\b(20[1-3][0-9])\b", txt)
                            if ym:
                                year_num = int(ym.group(1))
                                if not date_str:
                                    date_str = ym.group(1)
                            if "auric cells" in txt.lower() and "iridescent" not in txt.lower():
                                is_licensed = True

                        if "adds " in txt or "features " in txt:
                            for a in curr.find_all("a"):
                                c_name = a.get_text(strip=True)
                                if (
                                    c_name
                                    and c_name not in ["Main Article", "DLC", "Chapter", "Paragraph", "Killer", "Survivor"]
                                    and not c_name.startswith(("File:", "Special:"))
                                ):
                                    chars_added.append(c_name)

                        curr = curr.find_next_sibling()

                    if date_str or chars_added:
                        dlcs.append({
                            "dlc_name": raw_title,
                            "release_date": date_str,
                            "release_year": year_num,
                            "is_licensed": is_licensed,
                            "characters": chars_added,
                        })
            return dlcs
        except Exception as e:
            logger.warning(f"Failed to scrape Downloadable_Content page: {e}")
            return []

    def enrich_characters_from_pages(self, characters: List[CharacterData]) -> None:
        import asyncio
        import unicodedata
        import urllib.parse
        from curl_cffi.requests import AsyncSession

        def norm_key(text: str) -> str:
            if not text:
                return ""
            n = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8").lower()
            return re.sub(r"[^a-z0-9]", "", n)

        # 1. Scrape live DLC catalog directly from wiki.gg
        dlcs = self.scrape_dlcs_from_wiki()
        logger.info(f"Loaded {len(dlcs)} live DLC entries from wiki.gg")

        # Map DLC data to each character
        for char in characters:
            c_norm = norm_key(char.name)
            matched_dlc = None
            for d in dlcs:
                for added_char in d.get("characters", []):
                    ac_norm = norm_key(added_char)
                    if ac_norm == c_norm or (len(c_norm) >= 4 and (c_norm in ac_norm or ac_norm in c_norm)):
                        matched_dlc = d
                        break
                if matched_dlc:
                    break

            if matched_dlc:
                char.chapter_name = matched_dlc["dlc_name"]
                char.release_date = matched_dlc["release_date"]
                char.release_year = matched_dlc["release_year"]
                char.is_licensed = matched_dlc["is_licensed"]
                char.dlc_type = "Chapter DLC"
                counterparts = [
                    c for c in matched_dlc.get("characters", [])
                    if norm_key(c) != c_norm
                ]
                char.dlc_counterparts = counterparts if counterparts else None
            elif char.release_number and char.release_number <= 4:
                char.chapter_name = "Base Game"
                char.release_date = "14 June 2016"
                char.release_year = 2016
                char.is_licensed = False
                char.dlc_type = "base_game"

        # 2. Enrich combat stats, power descriptions, and real names per character page
        async def _fetch_all():
            async with AsyncSession(impersonate="chrome120", verify=False) as session:
                semaphore = asyncio.Semaphore(4)

                async def _fetch_one(char: CharacterData):
                    slug = char.wiki_slug or char.name.replace(" ", "_")
                    async with semaphore:
                        for attempt in range(3):
                            try:
                                await asyncio.sleep(0.05)
                                params = {
                                    "action": "parse",
                                    "page": slug,
                                    "prop": "text",
                                    "format": "json",
                                    "redirects": "1",
                                }
                                r = await session.get(self.API_URL, params=params, timeout=15, verify=False)
                                data = r.json()
                                if "error" in data:
                                    await asyncio.sleep(1.0)
                                    continue

                                html = data.get("parse", {}).get("text", {}).get("*", "")
                                if not html:
                                    return

                                soup = BeautifulSoup(html, "html.parser")
                                real_name = ""
                                movement_speed = ""
                                terror_radius = ""
                                tr_meters = 32
                                height = ""
                                cost_text = ""
                                power_name = ""
                                power_desc = ""
                                power_icon_url = ""

                                for tr in soup.find_all("tr"):
                                    th = tr.find(["th", "td"], class_=lambda c: c and "title" in str(c).lower())
                                    td = tr.find(["td"], class_=lambda c: c and "value" in str(c).lower())
                                    if not (th and td):
                                        tds = tr.find_all(["th", "td"])
                                        if len(tds) >= 2:
                                            th, td = tds[0], tds[1]
                                    if th and td:
                                        t_txt = th.get_text(strip=True).lower()
                                        v_txt = td.get_text(separator=" ", strip=True)

                                        if t_txt in ["name", "real name"]:
                                            real_name = v_txt
                                        elif "movement speed" in t_txt and "alternate" not in t_txt:
                                            m_speed = re.search(
                                                r"(\d+(?:\.\d+)?)\s*%\s*[\|\(]?\s*(\d+(?:\.\d+)?)\s*m/s", v_txt
                                            )
                                            if not m_speed:
                                                m_speed = re.search(
                                                    r"(\d+(?:\.\d+)?)\s*m/s.*?(\d+(?:\.\d+)?)\s*%", v_txt
                                                )
                                                if m_speed:
                                                    movement_speed = f"{m_speed.group(1)} m/s ({m_speed.group(2)}%)"
                                            else:
                                                movement_speed = f"{m_speed.group(2)} m/s ({m_speed.group(1)}%)"
                                            if not movement_speed:
                                                movement_speed = v_txt
                                        elif "terror radius" in t_txt:
                                            terror_radius = v_txt
                                            m = re.search(r"(\d+)", terror_radius)
                                            if m:
                                                tr_meters = int(m.group(1))
                                        elif "height" in t_txt:
                                            height = v_txt
                                        elif "cost" in t_txt:
                                            cost_text = v_txt
                                        elif "power" in t_txt and "attack" not in t_txt and "trivia" not in t_txt:
                                            power_name = v_txt

                                # Power and image extraction for Killers
                                if char.category == "Killer":
                                    for img in soup.find_all("img"):
                                        alt = img.get("alt", "")
                                        src = img.get("src", "")
                                        if "iconpowers" in src.lower() or "iconpowers" in alt.lower() or "power" in alt.lower():
                                            power_icon_url = extract_high_res_url(img, self.BASE_DOMAIN)
                                            if not power_name and alt:
                                                power_name = alt.replace("IconPowers ", "").replace(".png", "").strip()
                                            break

                                    for h in soup.find_all(["h2", "h3", "h4"]):
                                        htxt = h.get_text(strip=True).lower()
                                        if "power:" in htxt or "power" in htxt or "special ability" in htxt:
                                            p_elems = []
                                            curr = h.find_next_sibling()
                                            while curr and curr.name not in ["h2", "h3"]:
                                                if curr.name in ["p", "ul", "ol", "div"]:
                                                    txt = curr.get_text(separator=" ", strip=True)
                                                    if len(txt) > 20 and not txt.startswith("File:") and not txt.startswith("Main article"):
                                                        p_elems.append(txt)
                                                curr = curr.find_next_sibling()
                                            if p_elems:
                                                power_desc = clean_description_text("\n\n".join(p_elems[:5]))
                                                break

                                if real_name and real_name != char.name:
                                    char.real_name = real_name

                                if cost_text:
                                    if "auric cells" in cost_text.lower() and "iridescent" not in cost_text.lower():
                                        char.is_licensed = True

                                # Lore paragraphs
                                lore_text = ""
                                for h in soup.find_all(["h2", "h3"]):
                                    htxt = h.get_text(strip=True).lower()
                                    if "lore" in htxt or "background" in htxt or "biography" in htxt:
                                        p_list = []
                                        curr = h.find_next_sibling()
                                        while curr and curr.name not in ["h2", "h3"]:
                                            if curr.name in ["p", "blockquote"]:
                                                txt = curr.get_text(separator=" ", strip=True)
                                                if len(txt) > 30 and not txt.startswith("File:") and not txt.startswith("Main article"):
                                                    p_list.append(clean_description_text(txt))
                                            curr = curr.find_next_sibling()
                                        if p_list:
                                            lore_text = "\n\n".join(p_list[:6])
                                            break
                                if lore_text:
                                    char.lore = lore_text

                                # Combat stats for killers
                                if char.category == "Killer":
                                    p_name = power_name or (char.power.name if char.power else "")
                                    p_desc = power_desc or (char.power.description if char.power else "")
                                    p_icon = power_icon_url or (char.power.icon_url if char.power else "")
                                    p_speed = movement_speed or (
                                        char.power.movement_speed if char.power else "4.6 m/s (115%)"
                                    )
                                    p_tr = terror_radius or (char.power.terror_radius if char.power else "32 m")
                                    p_height = height or (char.power.height if char.power else "Tall")

                                    char.power = KillerPowerData(
                                        name=p_name,
                                        description=p_desc,
                                        icon_url=p_icon,
                                        movement_speed=p_speed,
                                        terror_radius=p_tr,
                                        terror_radius_meters=tr_meters,
                                        height=p_height,
                                    )
                                return
                            except Exception as e:
                                if attempt == 2:
                                    logger.warning(f"Failed enriching character {slug}: {e}")
                                await asyncio.sleep(0.5 * (attempt + 1))

                tasks = [_fetch_one(c) for c in characters]
                await asyncio.gather(*tasks)

        try:
            asyncio.run(_fetch_all())
        except Exception as err:
            logger.error(f"Error in enrich_characters_from_pages: {err}")

    def scrape_characters_dynamically(self) -> List[CharacterData]:
        logger.info("Fetching Survivors via MediaWiki API...")
        survivors = self.scrape_roster_from_page("Survivors", "Survivor")

        logger.info("Fetching Killers via MediaWiki API...")
        killers = self.scrape_roster_from_page("Killers", "Killer")

        all_characters = survivors + killers
        logger.info(f"Enriching all {len(all_characters)} characters with live infobox, chapter, licensing, and combat power details...")
        self.enrich_characters_from_pages(all_characters)

        logger.info(f"Discovered {len(all_characters)} characters ({len(survivors)} Survivors, {len(killers)} Killers).")
        return all_characters

    def parse_perks(self, html_content: str, characters: List[CharacterData]) -> List[PerkData]:
        soup = BeautifulSoup(html_content, "html.parser")
        perks_dict: Dict[str, PerkData] = {}
        alias_backlog: Dict[str, str] = {}
        current_category: Optional[str] = None
        content_area = soup.find("div", class_="mw-parser-output") or soup

        char_by_key: Dict[str, CharacterData] = {}
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
                            local_rel_path = f"icons/{category_dir}/General/{sanitized_name}.png"
                        else:
                            local_rel_path = f"icons/{category_dir}/{canonical_name}/{sanitized_name}.png"

                        norm_key = normalize_name_key(perk_name)
                        alternate_name = alias_backlog.get(norm_key)
                        is_generic = alternate_name is not None

                        perks_dict[norm_key] = PerkData(
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
                        if name_lower.endswith(" items") or name_lower.endswith(" add-ons") or "uncommon items" in name_lower:
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

                        if not rarity:
                            item_rarity_lookup = {
                                "camping aid kit": "Common",
                                "first aid kit": "Uncommon",
                                "emergency med-kit": "Rare",
                                "ranger med-kit": "Very Rare",
                                "all hallows' eve lunchbox": "Event",
                                "anniversary med-kit": "Event",
                                "banquet med-kit": "Event",
                                "masquerade med-kit": "Event",
                                "worn-out tools": "Common",
                                "toolbox": "Uncommon",
                                "mechanic's toolbox": "Rare",
                                "commodious toolbox": "Rare",
                                "alex's toolbox": "Very Rare",
                                "engineer's toolbox": "Very Rare",
                                "anniversary toolbox": "Event",
                                "banquet toolbox": "Event",
                                "festive toolbox": "Event",
                                "masquerade toolbox": "Event",
                                "flashlight": "Uncommon",
                                "sport flashlight": "Rare",
                                "utility flashlight": "Very Rare",
                                "anniversary flashlight": "Event",
                                "banquet flashlight": "Event",
                                "masquerade flashlight": "Event",
                                "will o' wisp": "Event",
                                "broken key": "Rare",
                                "dull key": "Very Rare",
                                "skeleton key": "Ultra Rare",
                                "cryptic map": "Rare",
                                "scribbled map": "Rare",
                                "annotated map": "Very Rare",
                                "bloodsense map": "Ultra Rare",
                                "chinese firecracker": "Event",
                                "third year party starter": "Event",
                                "winter party starter": "Event",
                                "apprentice's fog vial": "Common",
                                "artisan's fog vial": "Uncommon",
                                "vigo's fog vial": "Rare",
                                "hand of vecna": "Ultra Rare",
                                "eye of vecna": "Ultra Rare",
                                "lament configuration": "Ultra Rare",
                                "emp": "Rare",
                                "remote flame turret": "Rare",
                                "first aid spray": "Uncommon",
                                "vaccine": "Uncommon",
                                "vhs tape": "Rare",
                                "flash grenade": "Uncommon",
                                "antidote": "Uncommon",
                                "candelabra": "Rare",
                                "lantern": "Rare",
                                "keycard": "Rare",
                                "pocket mirror": "Rare",
                                "fragile mirror": "Rare",
                                "searcher's pendant": "Rare",
                                "blood can": "Rare",
                                "glowing fungus": "Uncommon",
                                "fog crystal": "Event",
                                "void crystal": "Event",
                            }
                            rarity = item_rarity_lookup.get(item_name.lower().strip(), "")
                            if not rarity:
                                if "anniversary" in item_name.lower() or "masquerade" in item_name.lower() or "event" in item_name.lower() or "festive" in item_name.lower():
                                    rarity = "Event"
                                else:
                                    rarity = "Common"

                        description = clean_description_text(description)
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

    def parse_wiki_addons(self, html_content: str, characters: Optional[List[CharacterData]] = None) -> List[AddonData]:
        soup = BeautifulSoup(html_content, "html.parser")
        raw_addons: List[dict] = []
        content_area = soup.find("div", class_="mw-parser-output") or soup
        current_target = "General"
        current_category = "Survivor"

        dynamic_power_to_killer: Dict[str, str] = {}
        if characters:
            for c in characters:
                if c.category == "Killer":
                    dynamic_power_to_killer[normalize_name_key(c.name)] = c.name
                    dynamic_power_to_killer[normalize_name_key(c.name.replace("The ", ""))] = c.name
                    if c.real_name:
                        dynamic_power_to_killer[normalize_name_key(c.real_name)] = c.name
                    if c.wiki_slug:
                        dynamic_power_to_killer[normalize_name_key(c.wiki_slug)] = c.name
                    if c.short_name:
                        dynamic_power_to_killer[normalize_name_key(c.short_name)] = c.name
                    if c.power and c.power.name:
                        dynamic_power_to_killer[normalize_name_key(c.power.name)] = c.name

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                headline = element.find(class_=re.compile(r"mw-headline"))
                if headline:
                    raw_header = headline.get_text(strip=True)
                else:
                    for edit_tag in element.find_all(class_=re.compile(r"mw-editsection|editsection")):
                        edit_tag.decompose()
                    raw_header = element.get_text().strip()

                cleaned_header = re.sub(r"\[\s*edit\s*\]", "", raw_header, flags=re.IGNORECASE).strip()

                if "killer" in cleaned_header.lower():
                    current_category = "Killer"
                elif "survivor" in cleaned_header.lower():
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
                            if p_key and (p_key in norm_target or norm_target in p_key):
                                matched_killer = k_name
                                break

                    current_target = matched_killer if matched_killer else target_clean

            elif element.name == "table" and "wikitable" in element.get("class", []):
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

                        rarity = ""
                        description = ""
                        if len(cells) >= 4:
                            rarity = cells[2].get_text().strip()
                            description = clean_description_text(cells[3].get_text(separator="\n", strip=True))
                        elif len(cells) == 3:
                            description = clean_description_text(cells[2].get_text(separator="\n", strip=True))

                        if not rarity:
                            if row_count == 20:
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
                            elif row_count == 14:
                                if row_idx < 3:
                                    rarity = "Common"
                                elif row_idx < 7:
                                    rarity = "Uncommon"
                                elif row_idx < 11:
                                    rarity = "Rare"
                                else:
                                    rarity = "Very Rare"
                            elif row_count == 11:
                                if row_idx < 3:
                                    rarity = "Common"
                                elif row_idx < 6:
                                    rarity = "Uncommon"
                                elif row_idx < 9:
                                    rarity = "Rare"
                                else:
                                    rarity = "Very Rare"
                            elif row_count == 5:
                                if "fog" in current_target.lower():
                                    rarities_5 = ["Common", "Uncommon", "Rare", "Very Rare", "Ultra Rare"]
                                    rarity = rarities_5[min(row_idx, 4)]
                                else:
                                    rarities_5 = ["Uncommon", "Rare", "Rare", "Very Rare", "Very Rare"]
                                    rarity = rarities_5[min(row_idx, 4)]
                            elif "event" in current_target.lower() or "blight serum" in addon_name.lower():
                                rarity = "Event"
                            else:
                                pos = row_idx / max(1, row_count - 1)
                                if pos < 0.25:
                                    rarity = "Common"
                                elif pos < 0.5:
                                    rarity = "Uncommon"
                                elif pos < 0.75:
                                    rarity = "Rare"
                                elif pos < 0.9:
                                    rarity = "Very Rare"
                                else:
                                    rarity = "Ultra Rare"

                        description = clean_description_text(description)

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
            target = a["target"]

            if len(name_target_counts[normalize_name_key(addon_name)]) > 1:
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
        logger.info("Scraping deadbydaylight.wiki.gg data via MediaWiki API...")
        characters = self.scrape_characters_dynamically()

        logger.info("Fetching Perks...")
        html_perks = self.fetch_page_html("Perks")
        perks = self.parse_perks(html_perks, characters)

        try:
            logger.info("Fetching Items...")
            html_items = self.fetch_page_html("Items")
            items = self.parse_wiki_items(html_items)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg items: {e}")
            items = []

        try:
            logger.info("Fetching Add-ons...")
            html_addons = self.fetch_page_html("Add-ons")
            addons = self.parse_wiki_addons(html_addons, characters)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg addons: {e}")
            addons = []

        return characters, perks, items, addons