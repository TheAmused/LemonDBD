# legacy/scrapers/app_scrapers/drivers/__init__.py
# backend/app/scrapers/drivers/__init__.py
from __future__ import annotations

from app.scrapers.drivers.base import BaseWikiDriver
from app.scrapers.drivers.de import WikiGGDriverDE
from app.scrapers.drivers.es import WikiGGDriverES
from app.scrapers.drivers.fr import WikiGGDriverFR
from app.scrapers.drivers.it import WikiGGDriverIT
from app.scrapers.drivers.ja import WikiGGDriverJP
from app.scrapers.drivers.pl import WikiGGDriverPL

# English has no dedicated driver here: it is the wiki's native language,
# scraped directly by WikiGGScraperDriver in app.scrapers.wikigg. These
# per-language drivers exist only to enrich already-scraped entities with
# translations, so there is nothing for an "en" entry to add.
LANGUAGE_DRIVERS: dict[str, type[BaseWikiDriver]] = {
    "pl": WikiGGDriverPL,
    "de": WikiGGDriverDE,
    "es": WikiGGDriverES,
    "ja": WikiGGDriverJP,
    "jp": WikiGGDriverJP,
    "fr": WikiGGDriverFR,
    "it": WikiGGDriverIT,
}


__all__ = [
    "BaseWikiDriver",
    "WikiGGDriverPL",
    "WikiGGDriverDE",
    "WikiGGDriverES",
    "WikiGGDriverJP",
    "WikiGGDriverFR",
    "WikiGGDriverIT",
    "LANGUAGE_DRIVERS",
]
