# backend/app/scrapers/wikigg_characters.py
from __future__ import annotations

import asyncio
import re
import unicodedata
from collections import defaultdict
from typing import Any
from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession

from app.core.json_provider import safe_json_dumps
from app.scrapers.types import CharacterData, KillerPowerData
from app.scrapers.utils import (
    clean_description_text,
    extract_high_res_url,
    extract_slug_from_href,
    sanitize_filename,
)
from app.scrapers.wikigg import PORTRAIT_PATTERN, clean_chapter_title, logger, parse_date_and_year


class WikiGGCharactersMixin:
    """Character roster scraping and page enrichment, mixed into WikiGGScraperDriver."""

    def scrape_roster_from_page(self, page_title: str, role: str) -> list[CharacterData]:
        html_doc = self.fetch_page_html(page_title)
        soup = BeautifulSoup(html_doc, "html.parser")
        content = soup.find("div", class_="mw-parser-output") or soup

        characters: list[CharacterData] = []
        seen_slugs: set[str] = set()

        killer_meta_by_slug: dict[str, dict[str, Any]] = {}
        if role == "Killer":
            for cell in content.find_all(["td", "th"]):
                links = cell.find_all("a", href=re.compile(r"^/wiki/(?!File:|Category:|Special:).+"))
                text_links = [a for a in links if not a.find("img") and a.get_text(strip=True)]
                if len(text_links) >= 2:
                    power_tag = text_links[0]
                    killer_tag = text_links[1]
                    k_slug = extract_slug_from_href(killer_tag.get("href", "")).lower()
                    p_name = re.sub(
                        r"\[\s*edit\s*\]", "", power_tag.get_text(strip=True), flags=re.IGNORECASE
                    ).strip()
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
                    avatar_local_path=f"avatars/{sub_dir}/{sanitized}.webp",
                    release_number=release_num,
                    code_prefix=code_prefix,
                    power=power_data,
                )
            )

        return characters

    def enrich_characters_from_pages(self, characters: list[CharacterData]) -> None:
        def norm_key(text: str) -> str:
            if not text:
                return ""
            n = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8").lower()
            return re.sub(r"[^a-z0-9]", "", n)

        dlcs = self.scrape_dlcs_from_wiki()
        logger.info(f"Loaded {len(dlcs)} live DLC entries from wiki.gg")

        async def _fetch_all():
            async with AsyncSession(impersonate="chrome120", verify=False) as session:
                semaphore = asyncio.Semaphore(5)

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

                                html_raw = data.get("parse", {}).get("text", {}).get("*", "")
                                if not html_raw:
                                    return

                                soup = BeautifulSoup(html_raw, "html.parser")
                                content = soup.find("div", class_="mw-parser-output") or soup

                                real_name = ""
                                movement_speed = ""
                                terror_radius = ""
                                tr_meters = 32
                                height = ""
                                cost_text = ""
                                power_name = ""
                                power_desc = ""
                                power_icon_url = ""
                                infobox_dlc_text = ""
                                infobox_dlc_link = ""
                                infobox_release_date = ""

                                for tr in content.find_all("tr"):
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
                                        elif t_txt in ["dlc", "chapter"]:
                                            infobox_dlc_text = v_txt
                                            a_link = td.find("a")
                                            if a_link:
                                                infobox_dlc_link = extract_slug_from_href(a_link.get("href", ""))
                                        elif t_txt in ["release date", "released", "release"]:
                                            infobox_release_date = v_txt

                                intro_paragraphs = []
                                for p in content.find_all("p"):
                                    p_txt = p.get_text(separator=" ", strip=True)
                                    if len(p_txt) > 25 and ("introduced" in p_txt.lower() or "released" in p_txt.lower() or "featured in" in p_txt.lower()):
                                        intro_paragraphs.append(p_txt)

                                intro_full_text = " ".join(intro_paragraphs)

                                parsed_chapter_name = ""
                                parsed_chapter_number = ""
                                parsed_dlc_type = ""
                                parsed_release_date = ""
                                parsed_release_year = None

                                intro_match = re.search(
                                    r"introduced as (?:the|a)\s+(?:Killer|Survivor)\s+of\s+(?:the\s+)?([^,]+?),\s+a\s+([^,]+?)\s+released\s+(?:on|in)\s+([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+of)?\s+[0-9]{4}|[A-Za-z]+\s+[0-9]{1,2}(?:st|nd|rd|th)?,?\s+[0-9]{4}|[A-Za-z]+\s+[0-9]{4}|[0-9]{4})",
                                    intro_full_text,
                                    re.IGNORECASE,
                                )
                                if intro_match:
                                    raw_chap = intro_match.group(1).strip()
                                    parsed_dlc_type = intro_match.group(2).strip()
                                    date_raw = intro_match.group(3).strip()
                                    parsed_release_date, parsed_release_year = parse_date_and_year(date_raw)
                                    c_num, c_title = clean_chapter_title(raw_chap)
                                    parsed_chapter_number = c_num or ""
                                    parsed_chapter_name = c_title or raw_chap

                                if not parsed_release_date:
                                    if "base game" in intro_full_text.lower() or (char.release_number and char.release_number <= 4 and "chapter" not in intro_full_text.lower()):
                                        parsed_chapter_name = "Base Game"
                                        parsed_dlc_type = "base_game"
                                        d_p, y_p = parse_date_and_year(intro_full_text)
                                        parsed_release_date = d_p or "14 June 2016"
                                        parsed_release_year = y_p or 2016

                                if not parsed_release_date:
                                    d_p, y_p = parse_date_and_year(intro_full_text)
                                    if d_p:
                                        parsed_release_date = d_p
                                        parsed_release_year = y_p

                                if not parsed_release_date and infobox_release_date:
                                    d_p, y_p = parse_date_and_year(infobox_release_date)
                                    if d_p:
                                        parsed_release_date = d_p
                                        parsed_release_year = y_p

                                if not parsed_chapter_name and infobox_dlc_text:
                                    c_num, c_title = clean_chapter_title(infobox_dlc_text)
                                    parsed_chapter_number = c_num or ""
                                    parsed_chapter_name = c_title or infobox_dlc_text

                                if not parsed_release_date or not parsed_chapter_name:
                                    c_norm = norm_key(char.name)
                                    for d in dlcs:
                                        for ac in d.get("characters", []):
                                            ac_norm = norm_key(ac)
                                            if ac_norm == c_norm or (len(c_norm) >= 4 and (c_norm in ac_norm or ac_norm in c_norm)):
                                                if not parsed_chapter_name:
                                                    c_num, c_title = clean_chapter_title(d["dlc_name"])
                                                    parsed_chapter_number = c_num or ""
                                                    parsed_chapter_name = c_title or d["dlc_name"]
                                                if not parsed_release_date and d.get("release_date"):
                                                    parsed_release_date = d["release_date"]
                                                    parsed_release_year = d.get("release_year")
                                                if not parsed_dlc_type:
                                                    parsed_dlc_type = "Chapter DLC"
                                                break
                                        if parsed_release_date and parsed_chapter_name:
                                            break

                                if (not parsed_release_date or not parsed_release_year) and (infobox_dlc_link or parsed_chapter_name):
                                    chap_slug = infobox_dlc_link or parsed_chapter_name.replace(" ", "_")
                                    try:
                                        chap_params = {
                                            "action": "parse",
                                            "page": chap_slug,
                                            "prop": "text",
                                            "format": "json",
                                            "redirects": "1",
                                        }
                                        cr = await session.get(self.API_URL, params=chap_params, timeout=12, verify=False)
                                        cdata = cr.json()
                                        chtml = cdata.get("parse", {}).get("text", {}).get("*", "")
                                        if chtml:
                                            csoup = BeautifulSoup(chtml, "html.parser")
                                            for elem in csoup.find_all(["p", "tr"]):
                                                ctxt = elem.get_text(separator=" ", strip=True)
                                                cd_p, cy_p = parse_date_and_year(ctxt)
                                                if cd_p:
                                                    parsed_release_date = cd_p
                                                    parsed_release_year = cy_p
                                                    break
                                    except Exception:
                                        pass

                                is_licensed = False
                                if cost_text:
                                    if "auric cells" in cost_text.lower() and "iridescent" not in cost_text.lower():
                                        is_licensed = True
                                    elif "iridescent" in cost_text.lower():
                                        is_licensed = False

                                if not is_licensed and ("™" in char.name or "®" in char.name or "™" in parsed_chapter_name or "®" in parsed_chapter_name):
                                    is_licensed = True

                                if char.category == "Killer":
                                    for img in content.find_all("img"):
                                        alt = img.get("alt", "")
                                        src = img.get("src", "")
                                        if "iconpowers" in src.lower() or "iconpowers" in alt.lower() or "power" in alt.lower():
                                            power_icon_url = extract_high_res_url(img, self.BASE_DOMAIN)
                                            if not power_name and alt:
                                                power_name = alt.replace("IconPowers ", "").replace(".png", "").strip()
                                            break

                                    for h in content.find_all(["h2", "h3", "h4"]):
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

                                lore_text = ""
                                for h in content.find_all(["h2", "h3"]):
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

                                if real_name and real_name != char.name:
                                    char.real_name = real_name

                                char.chapter_name = parsed_chapter_name or "Base Game"
                                char.chapter_number = parsed_chapter_number or None
                                char.dlc_type = parsed_dlc_type or ("base_game" if char.chapter_name == "Base Game" else "Chapter DLC")
                                char.release_date = parsed_release_date or "14 June 2016"
                                char.release_year = parsed_release_year or 2016
                                char.is_licensed = is_licensed
                                char.lore = lore_text or None

                                if char.category == "Killer":
                                    p_name = power_name or (char.power.name if char.power else "")
                                    p_desc = power_desc or (char.power.description if char.power else "")
                                    p_icon = power_icon_url or (char.power.icon_url if char.power else "")
                                    p_speed = movement_speed or (char.power.movement_speed if char.power else "4.6 m/s (115%)")
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

        chapter_groups = defaultdict(list)
        for char in characters:
            if char.chapter_name and char.chapter_name.lower() != "base game":
                chapter_groups[norm_key(char.chapter_name)].append(char)

        for group in chapter_groups.values():
            if len(group) > 1:
                for c in group:
                    c.dlc_counterparts = safe_json_dumps([other.name for other in group if other.name != c.name], default_val="[]")

    def scrape_characters_dynamically(self) -> list[CharacterData]:
        logger.info("Fetching Survivors via MediaWiki API...")
        survivors = self.scrape_roster_from_page("Survivors", "Survivor")

        logger.info("Fetching Killers via MediaWiki API...")
        killers = self.scrape_roster_from_page("Killers", "Killer")

        all_characters = survivors + killers
        logger.info(f"Enriching all {len(all_characters)} characters with live infobox, chapter, licensing, and combat power details...")
        self.enrich_characters_from_pages(all_characters)

        logger.info(f"Discovered {len(all_characters)} characters ({len(survivors)} Survivors, {len(killers)} Killers).")
        return all_characters
