import asyncio
import json
import logging
import re
import threading
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from urllib.parse import unquote

from bs4 import BeautifulSoup, Tag
from curl_cffi import requests
from curl_cffi.requests import AsyncSession

logger = logging.getLogger(__name__)

# Wiki portraits are named K01_TheTrapper_Portrait.png / S07_AceVisconti_Portrait.png.
# The prefix letter is the role and the digits are the release number, which makes the
# filename the only reliable way to tell a character from a power or an item.
PORTRAIT_PATTERN = re.compile(r"^(K|S)(\d+)_.*_Portrait", re.ASCII)

ROLE_BY_PREFIX = {"K": "Killer", "S": "Survivor"}


@dataclass
class CharacterData:
    name: str
    real_name: str
    wiki_slug: str
    short_name: str
    category: str
    avatar_url: str
    avatar_local_path: str
    release_number: int = 0


@dataclass
class PerkData:
    name: str
    character: str
    character_real_name: str
    character_avatar_path: str
    category: str
    description: str
    icon_url: str
    icon_local_path: str


class ScraperService:
    PERKS_URL = "https://deadbydaylight.fandom.com/wiki/Perks"
    SURVIVORS_URL = "https://deadbydaylight.fandom.com/wiki/Survivors"
    KILLERS_URL = "https://deadbydaylight.fandom.com/wiki/Killers"

    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30
    MAX_CONCURRENT_DOWNLOADS = 10

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://deadbydaylight.fandom.com/wiki/Dead_by_Daylight_Wiki",
    }

    _lock = threading.Lock()
    _status: Dict[str, Any] = {
        "is_running": False,
        "progress": 0,
        "total": 0,
        "current_step": "idle",
        "last_run": None,
        "error": None,
    }

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_dir = Path(base_dir)
        self.data_file = self.base_dir / "data" / "perks.json"
        self.characters_file = self.base_dir / "data" / "characters.json"
        self.static_dir = self.base_dir / "app" / "static"

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        with cls._lock:
            return cls._status.copy()

    @classmethod
    def _update_status(cls, **kwargs) -> None:
        with cls._lock:
            cls._status.update(kwargs)

    @staticmethod
    def sanitize_filename(name: str) -> str:
        clean_str = name.lower().strip()
        clean_str = re.sub(r"[\s\-/]+", "_", clean_str)
        clean_str = re.sub(r'[\\/*?:"<>|]', "", clean_str)
        clean_str = re.sub(r"_+", "_", clean_str)
        return clean_str.strip("_")

    @staticmethod
    def extract_high_res_url(img_tag: Optional[Tag]) -> str:
        if not img_tag:
            return ""
        raw_url = (
            img_tag.get("data-src")
            or img_tag.get("src")
            or img_tag.get("data-srcset")
            or ""
        )
        if not raw_url:
            return ""
        if "," in raw_url:
            raw_url = raw_url.split(",")[-1].strip().split()[0]
        high_res_url = re.sub(r"/scale-to-width-down/\d+", "", raw_url)
        if "/revision/latest" in high_res_url:
            high_res_url = high_res_url.split("/revision/latest")[0] + "/revision/latest"
        return high_res_url

    @staticmethod
    def extract_slug_from_href(href: str) -> str:
        if not href or "/wiki/" not in href:
            return ""
        raw_slug = href.split("/wiki/")[-1].split("#")[0].split("?")[0]
        return unquote(raw_slug).strip()

    @staticmethod
    def classify_portrait(image_url: str):
        """Return (category, release_number) when the image is a character portrait.

        Anything else — power icons, item icons, wiki concept images — returns None,
        which is how powers stop being mistaken for characters.
        """
        if not image_url:
            return None

        filename = image_url.split("/revision")[0].rstrip("/").split("/")[-1]
        match = PORTRAIT_PATTERN.match(filename)
        if not match:
            return None

        category = ROLE_BY_PREFIX.get(match.group(1))
        if not category:
            return None

        try:
            release_number = int(match.group(2))
        except ValueError:
            return None

        return category, release_number

    @staticmethod
    def normalise_character_name(title: str, category: str) -> str:
        """Killers lose their leading article; survivors keep their name intact."""
        clean = (title or "").strip()
        if category == "Killer" and clean.startswith("The "):
            return clean[4:].strip()
        return clean

    def fetch_html(self, url: str) -> str:
        response = requests.get(
            url,
            headers=self.HEADERS,
            impersonate=self.IMPERSONATE_BROWSER,
            timeout=self.REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        return response.text

    def parse_character_page(self, html: str) -> List[CharacterData]:
        """Extract characters from a wiki index page.

        A link is a character only when its image is a portrait; the filename decides
        the category and release number, so it does not matter which index page the
        link was found on.
        """
        soup = BeautifulSoup(html, "html.parser")
        content = soup.find("div", class_="mw-parser-output") or soup

        characters: List[CharacterData] = []
        seen = set()

        for link in content.find_all("a", href=re.compile(r"^/wiki/")):
            img = link.find("img")
            if not img:
                continue

            image_url = self.extract_high_res_url(img)
            classified = self.classify_portrait(image_url)
            if not classified:
                continue

            category, release_number = classified

            title = (link.get("title") or "").strip() or link.get_text().strip()
            name = self.normalise_character_name(title, category)
            if not name:
                continue

            key = (category, name.lower())
            if key in seen:
                continue
            seen.add(key)

            slug = self.extract_slug_from_href(link.get("href", ""))
            sanitized = self.sanitize_filename(name)
            sub_dir = "survivors" if category == "Survivor" else "killers"

            characters.append(
                CharacterData(
                    name=name,
                    real_name=name,
                    wiki_slug=slug,
                    short_name=slug.lower(),
                    category=category,
                    avatar_url=image_url,
                    avatar_local_path=f"avatars/{sub_dir}/{sanitized}.png",
                    release_number=release_number,
                )
            )

        return characters

    def scrape_characters_dynamically(self) -> List[CharacterData]:
        characters: List[CharacterData] = []
        seen = set()

        for url in (self.SURVIVORS_URL, self.KILLERS_URL):
            try:
                logger.info(f"Scraping character index: {url}")
                page_characters = self.parse_character_page(self.fetch_html(url))
            except Exception as e:
                logger.error(f"Error scraping {url}: {e}")
                continue

            if not page_characters:
                logger.error(f"No portraits found on {url} — wiki layout may have changed.")

            for character in page_characters:
                key = (character.category, character.name.lower())
                if key in seen:
                    continue
                seen.add(key)
                characters.append(character)

        characters.sort(key=lambda c: (c.category, c.release_number, c.name))
        return characters

    def parse_perks(self, html_content: str, characters: List[CharacterData]) -> List[PerkData]:
        soup = BeautifulSoup(html_content, "html.parser")
        perks: List[PerkData] = []
        current_category: Optional[str] = None
        content_area = soup.find("div", class_="mw-parser-output") or soup

        char_by_slug = {}
        char_by_name = {}
        for c in characters:
            # The perks page is inconsistent about the article: killers are stored
            # without it but linked as "The Trapper", while "The Troupe" is stored
            # with it and linked as "Troupe". Register both spellings either way.
            aliases = [c.name, c.real_name]
            if c.name:
                aliases.append(f"The {c.name}")
                if c.name.startswith("The "):
                    aliases.append(c.name[4:])
            for alias in aliases:
                if alias:
                    char_by_name.setdefault(alias.lower(), c)

            slugs = [c.wiki_slug]
            if c.wiki_slug and c.wiki_slug.startswith("The_"):
                slugs.append(c.wiki_slug[4:])
            elif c.wiki_slug:
                slugs.append(f"The_{c.wiki_slug}")
            for slug in slugs:
                if slug:
                    char_by_slug.setdefault(slug.lower(), c)

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
                        icon_url = self.extract_high_res_url(icon_tag)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        perk_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()

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
                        description = "\n".join(line for line in lines if line)

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
                                slug = self.extract_slug_from_href(href).lower()
                                matched = char_by_slug.get(slug) or char_by_name.get(link_title.lower())

                            if not matched:
                                raw_text = owner_cell.get_text().strip()
                                clean_text = re.sub(r"^[.\s\-–]+|[.\s\-–]+$", "", raw_text).strip().lower()

                                if clean_text and clean_text not in ["all", "general", "none", "-", "all survivors", "all killers"]:
                                    for key, c in char_by_name.items():
                                        if clean_text in key or key in clean_text:
                                            matched = c
                                            break

                            if matched:
                                canonical_name = matched.name
                                real_name = matched.real_name
                                avatar_path = matched.avatar_local_path

                        if not perk_name:
                            continue

                        sanitized_name = self.sanitize_filename(perk_name)
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

    async def _download_asset(
        self,
        client: AsyncSession,
        semaphore: asyncio.Semaphore,
        url: str,
        relative_path: str,
    ) -> None:
        if not url:
            return

        destination = self.static_dir / relative_path
        if destination.exists():
            with self._lock:
                self._status["progress"] += 1
            return

        destination.parent.mkdir(parents=True, exist_ok=True)

        async with semaphore:
            try:
                response = await client.get(url, headers=self.HEADERS, timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                destination.write_bytes(response.content)
            except Exception as err:
                logger.error(f"Download failed [{url}]: {err}")
            finally:
                with self._lock:
                    self._status["progress"] += 1

    async def download_all_assets_async(self, perks: List[PerkData], characters: List[CharacterData]) -> None:
        semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_DOWNLOADS)
        async with AsyncSession(impersonate=self.IMPERSONATE_BROWSER) as client:
            tasks = [
                self._download_asset(client, semaphore, perk.icon_url, perk.icon_local_path)
                for perk in perks
            ]
            for char in characters:
                if char.avatar_url:
                    tasks.append(
                        self._download_asset(client, semaphore, char.avatar_url, char.avatar_local_path)
                    )

            await asyncio.gather(*tasks)

    def run_sync_pipeline(self) -> Dict[str, int]:
        if self.get_status()["is_running"]:
            logger.warning("Scrape pipeline already running.")
            return {}

        self._update_status(
            is_running=True,
            progress=0,
            total=0,
            current_step="scraping_characters",
            error=None,
        )

        try:
            characters = self.scrape_characters_dynamically()

            self.characters_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.characters_file, "w", encoding="utf-8") as f:
                json.dump([asdict(c) for c in characters], f, indent=2, ensure_ascii=False)

            self._update_status(current_step="fetching_perks_wiki")
            html = self.fetch_html(self.PERKS_URL)

            self._update_status(current_step="parsing_perks")
            perks = self.parse_perks(html, characters)

            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump([asdict(p) for p in perks], f, indent=2, ensure_ascii=False)

            total_downloads = len(perks) + sum(1 for c in characters if c.avatar_url)
            self._update_status(
                current_step="downloading_assets",
                total=total_downloads,
                progress=0,
            )

            asyncio.run(self.download_all_assets_async(perks, characters))

            survivor_count = sum(1 for p in perks if p.category == "Survivor")
            killer_count = sum(1 for p in perks if p.category == "Killer")

            stats = {
                "total_perks": len(perks),
                "total_characters": len(characters),
                "survivors": survivor_count,
                "killers": killer_count,
            }

            self._update_status(
                is_running=False,
                current_step="completed",
                last_run=datetime.utcnow().isoformat(),
            )
            return stats

        except Exception as e:
            logger.error(f"Sync pipeline failed: {e}")
            self._update_status(
                is_running=False,
                current_step="failed",
                error=str(e),
            )
            raise