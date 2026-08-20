# backend/app/scrapers/drivers/base.py
from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import unquote
from bs4 import BeautifulSoup, Tag
from curl_cffi import requests

from app.scrapers.types import AddonData, CharacterData, ItemData, PerkData
from app.scrapers.utils import (
    clean_description_text,
    extract_cell_markdown_text,
    extract_high_res_url,
    extract_slug_from_href,
    normalize_name_key,
    sanitize_filename,
)
import re

PORTRAIT_PATTERN = re.compile(r"(?:^|/)(K|S)(\d+)[-_]", re.IGNORECASE)


def extract_icon_token(src_or_alt: str) -> str:
    if not src_or_alt:
        return ""
    m = re.search(r"(?:Full_)?Icon(?:Perks|Items|Addons|Addon|Powers|Help)_([^./?]+)", src_or_alt, re.IGNORECASE)
    if m:
        return re.sub(r"[^a-zA-Z0-9]", "", m.group(1)).lower()
    m2 = re.search(r"(?:^|/)(K|S)(\d+)[-_]", src_or_alt, re.IGNORECASE)
    if m2:
        return f"{m2.group(1).upper()}{int(m2.group(2)):02d}"
    fn = src_or_alt.split("/")[-1].split(".")[0]
    fn = re.sub(r"^\d+px-", "", fn, flags=re.IGNORECASE)
    fn = re.sub(r"^(?:Full_)?(?:Icon(?:Addon|Addons|Items|Perks|Powers)_)?", "", fn, flags=re.IGNORECASE)
    return re.sub(r"[^a-zA-Z0-9]", "", fn).lower()


class BaseWikiDriver:
    """Base driver providing network session, retries, and helper utilities for wiki.gg scraping."""

    BASE_DOMAIN: str = "https://deadbydaylight.wiki.gg"
    IMPERSONATE_BROWSER: str = "chrome120"
    REQUEST_TIMEOUT: int = 30

    def __init__(self, base_dir: Optional[Path] = None, lang_code: str = "en"):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
        self.base_dir = Path(base_dir)
        self.lang_code = lang_code.lower().strip()
        self.session = requests.Session(impersonate=self.IMPERSONATE_BROWSER)

    @property
    def api_url(self) -> str:
        if self.lang_code == "en":
            return f"{self.BASE_DOMAIN}/api.php"
        return f"{self.BASE_DOMAIN}/{self.lang_code}/api.php"

    def fetch_page_html(self, page_title: str) -> str:
        """Fetches and parses a page via MediaWiki API with retry and HTML fallback."""
        clean_title = unquote(page_title)
        params = {
            "action": "parse",
            "page": clean_title,
            "prop": "text",
            "format": "json",
            "redirects": "1",
            "disableeditsection": 1,
            "disabletoc": 1,
        }
        for attempt in range(4):
            try:
                response = self.session.get(
                    self.api_url,
                    params=params,
                    verify=False,
                    timeout=self.REQUEST_TIMEOUT,
                )
                if response.status_code == 200:
                    data = response.json()
                    if "parse" in data and "text" in data["parse"]:
                        return data["parse"]["text"]["*"]
                    if "error" in data:
                        logger.debug(f"MediaWiki parse error on {self.lang_code}/{clean_title}: {data.get('error')}")
                        return ""

                if response.status_code == 429:
                    time.sleep(2.0 * (attempt + 1))
                    continue

                response.raise_for_status()
            except Exception as err:
                logger.debug(f"[{self.lang_code}] API fetch attempt {attempt + 1} for '{clean_title}' failed: {err}")
                time.sleep(1.5)

        # Fallback to direct URL
        fallback_url = (
            f"{self.BASE_DOMAIN}/wiki/{clean_title}"
            if self.lang_code == "en"
            else f"{self.BASE_DOMAIN}/{self.lang_code}/wiki/{clean_title}"
        )
        try:
            res = self.session.get(fallback_url, verify=False, timeout=self.REQUEST_TIMEOUT)
            if res.status_code == 200:
                return res.text
        except Exception as e:
            logger.debug(f"[{self.lang_code}] Fallback fetch for '{clean_title}' failed: {e}")

        return ""

    def build_lookup_indexes(
        self,
        characters: List[CharacterData],
        perks: List[PerkData],
        items: List[ItemData],
        addons: List[AddonData],
    ) -> Dict[str, Dict[str, Any]]:
        """Constructs fast icon token and normalized name lookups for enrichment."""
        from app.scrapers.wikigg import extract_icon_token

        perks_by_token: Dict[str, PerkData] = {}
        for p in perks:
            tok = extract_icon_token(p.icon_url or p.icon_local_path)
            if tok:
                perks_by_token[tok] = p
            perks_by_token[normalize_name_key(p.name)] = p

        chars_by_token: Dict[str, CharacterData] = {}
        for c in characters:
            if c.code_prefix and c.release_number:
                chars_by_token[f"{c.code_prefix.upper()}{c.release_number:02d}"] = c
            tok = extract_icon_token(c.avatar_url or c.avatar_local_path)
            if tok:
                chars_by_token[tok] = c
            chars_by_token[normalize_name_key(c.name)] = c
            if c.real_name:
                chars_by_token[normalize_name_key(c.real_name)] = c

        items_by_token: Dict[str, ItemData] = {}
        for i in items:
            tok = extract_icon_token(i.icon_url or i.icon_local_path)
            if tok:
                items_by_token[tok] = i
            items_by_token[normalize_name_key(i.name)] = i

        addons_by_token: Dict[str, AddonData] = {}
        for a in addons:
            tok = extract_icon_token(a.icon_url or a.icon_local_path)
            if tok:
                addons_by_token[tok] = a
            addons_by_token[normalize_name_key(a.name)] = a

        return {
            "perks": perks_by_token,
            "characters": chars_by_token,
            "items": items_by_token,
            "addons": addons_by_token,
        }
