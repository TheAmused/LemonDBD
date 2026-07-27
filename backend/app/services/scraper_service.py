import asyncio
import json
import logging
import re
import threading
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from bs4 import BeautifulSoup, Tag
from curl_cffi import requests
from curl_cffi.requests import AsyncSession

logger = logging.getLogger(__name__)


@dataclass
class PerkData:
    name: str
    character: str
    category: str
    description: str
    icon_url: str
    icon_local_path: str


class ScraperService:
    TARGET_URL = "https://deadbydaylight.fandom.com/wiki/Perks"
    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 25
    MAX_CONCURRENT_DOWNLOADS = 10

    # Class-level state for background job tracking across API requests
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
    def extract_high_res_icon_url(img_tag: Optional[Tag]) -> str:
        if not img_tag:
            return ""
        raw_url = img_tag.get("data-src") or img_tag.get("src") or ""
        if not raw_url:
            return ""
        high_res_url = re.sub(r"/scale-to-width-down/\d+", "", raw_url)
        if "/revision/latest" in high_res_url:
            high_res_url = high_res_url.split("/revision/latest")[0] + "/revision/latest"
        return high_res_url

    @staticmethod
    def format_description(desc_cell: Tag) -> str:
        if not desc_cell:
            return ""
        cell_copy = BeautifulSoup(str(desc_cell), "html.parser")
        for bold in cell_copy.find_all(["b", "strong"]):
            bold.replace_with(f"**{bold.get_text().strip()}**")
        for italic in cell_copy.find_all(["i", "em"]):
            italic.replace_with(f"*{italic.get_text().strip()}*")
        for li in cell_copy.find_all("li"):
            li.replace_with(f"\n* {li.get_text().strip()}")
        for br in cell_copy.find_all("br"):
            br.replace_with("\n")
        lines = [line.strip() for line in cell_copy.get_text().splitlines()]
        return "\n".join(line for line in lines if line)

    def fetch_html(self) -> str:
        response = requests.get(
            self.TARGET_URL,
            impersonate=self.IMPERSONATE_BROWSER,
            timeout=self.REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        return response.text

    def parse_perks(self, html_content: str) -> List[PerkData]:
        soup = BeautifulSoup(html_content, "html.parser")
        perks: List[PerkData] = []
        current_category: Optional[str] = None
        content_area = soup.find("div", class_="mw-parser-output") or soup

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
                        icon_url = self.extract_high_res_icon_url(icon_tag)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        perk_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()

                        description = self.format_description(cells[2])

                        character = "General"
                        if len(cells) >= 4:
                            char_text = cells[3].get_text().strip()
                            if char_text and char_text.lower() not in ["all", "general", "none", "-", ""]:
                                character = char_text

                        if not perk_name:
                            continue

                        sanitized_name = self.sanitize_filename(perk_name)
                        category_dir = "survivors" if current_category == "Survivor" else "killers"
                        
                        if character == "General":
                            local_rel_path = f"icons/{category_dir}/General/{sanitized_name}.png"
                        else:
                            local_rel_path = f"icons/{category_dir}/{character}/{sanitized_name}.png"

                        perks.append(
                            PerkData(
                                name=perk_name,
                                character=character,
                                category=current_category,
                                description=description,
                                icon_url=icon_url,
                                icon_local_path=local_rel_path,
                            )
                        )
                    except Exception:
                        continue
        return perks

    async def _download_icon(
        self,
        client: AsyncSession,
        semaphore: asyncio.Semaphore,
        icon_url: str,
        relative_path: str,
    ) -> None:
        if not icon_url:
            return

        destination = self.static_dir / relative_path
        if destination.exists():
            with self._lock:
                self._status["progress"] += 1
            return

        destination.parent.mkdir(parents=True, exist_ok=True)

        async with semaphore:
            try:
                response = await client.get(icon_url, timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                destination.write_bytes(response.content)
            except Exception as err:
                logger.error(f"Download failed [{icon_url}]: {err}")
            finally:
                with self._lock:
                    self._status["progress"] += 1

    async def download_icons_async(self, perks: List[PerkData]) -> None:
        semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_DOWNLOADS)
        async with AsyncSession(impersonate=self.IMPERSONATE_BROWSER) as client:
            tasks = [
                self._download_icon(client, semaphore, perk.icon_url, perk.icon_local_path)
                for perk in perks
            ]
            await asyncio.gather(*tasks)

    def run_sync_pipeline(self) -> Dict[str, int]:
        if self.get_status()["is_running"]:
            logger.warning("Scrape pipeline already running.")
            return {}

        self._update_status(
            is_running=True,
            progress=0,
            total=0,
            current_step="fetching_wiki",
            error=None,
        )

        try:
            html = self.fetch_html()
            self._update_status(current_step="parsing_perks")
            perks = self.parse_perks(html)

            self.data_file.parent.mkdir(parents=True, exist_ok=True)
            perk_dicts = [asdict(p) for p in perks]

            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump(perk_dicts, f, indent=2, ensure_ascii=False)

            self._update_status(
                current_step="downloading_icons",
                total=len(perks),
                progress=0,
            )

            asyncio.run(self.download_icons_async(perks))

            survivor_count = sum(1 for p in perks if p.category == "Survivor")
            killer_count = sum(1 for p in perks if p.category == "Killer")

            stats = {
                "total": len(perks),
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