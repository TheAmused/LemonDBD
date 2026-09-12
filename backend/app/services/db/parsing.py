# backend/app/services/db/parsing.py
"""Parsers that turn scraped display strings into stored values.

These live here rather than in the models so that both the Alembic backfill and
the JSON import path use exactly one implementation. Every one of them is
lossless for the data actually present, which is what makes it safe to stop
storing the display string: `format_movement_speed(parse_movement_speed(x))`
reproduces `x` for all four speeds in the dataset, and
`Chapter.format_release_date` reproduces all 52 release dates.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

_MOVEMENT_SPEED = re.compile(
    r"(?P<ms>\d+(?:\.\d+)?)\s*m\s*/\s*s(?:\s*\(\s*(?P<pct>\d+(?:\.\d+)?)\s*%\s*\))?",
    re.IGNORECASE,
)

_TERROR_RADIUS_METRES = re.compile(r"(?P<m>\d+(?:\.\d+)?)\s*(?:m\b|metres|meters)", re.IGNORECASE)

_RELEASE_DATE_FORMATS = ("%Y-%m-%d", "%d %B %Y", "%d %b %Y", "%B %d, %Y")

#: Raw Unreal Engine enum values that leaked into `addons.rarity` from the
#: upstream scrape, mapped onto the display rarities everything else uses.
_RARITY_ALIASES = {
    "eitemrarity::common": "Common",
    "eitemrarity::uncommon": "Uncommon",
    "eitemrarity::rare": "Rare",
    "eitemrarity::veryrare": "Very Rare",
    "eitemrarity::ultrarare": "Ultra Rare",
    "eitemrarity::special": "Special",
    "eitemrarity::specialevent": "Event",
    "eitemrarity::event": "Event",
}

_CANONICAL_RARITIES = {
    "common": "Common",
    "uncommon": "Uncommon",
    "rare": "Rare",
    "very rare": "Very Rare",
    "ultra rare": "Ultra Rare",
    "special": "Special",
    "event": "Event",
}

#: The free-text `dlc_type` values the scrape produced, including the truncated
#: "Chapter DLC that", which was the sole reason one chapter disagreed with
#: itself about how it was released.
_DLC_TYPES = {
    "base_game": "base_game",
    "base game": "base_game",
    "chapter dlc": "chapter",
    "chapter dlc that": "chapter",
    "chapter": "chapter",
    "half-chapter dlc": "half_chapter",
    "half chapter dlc": "half_chapter",
    "half_chapter": "half_chapter",
    "free chapter dlc": "free_chapter",
    "free_chapter": "free_chapter",
}


def parse_movement_speed(value: str | None) -> tuple[Decimal | None, Decimal | None]:
    """`"4.6 m/s (115%)"` -> `(Decimal("4.6"), Decimal("115"))`."""
    if not value:
        return None, None
    match = _MOVEMENT_SPEED.search(str(value))
    if not match:
        return None, None
    try:
        speed = Decimal(match.group("ms"))
        percent = Decimal(match.group("pct")) if match.group("pct") else None
    except InvalidOperation:
        return None, None
    return speed, percent


def format_movement_speed(speed: Decimal | None, percent: Decimal | None) -> str:
    """Inverse of `parse_movement_speed`, without trailing zeros."""
    if speed is None:
        return ""
    text = f"{format(Decimal(str(speed)).normalize(), 'f')} m/s"
    if percent is None:
        return text
    return f"{text} ({format(Decimal(str(percent)).normalize(), 'f')}%)"


def parse_terror_radius_metres(value: str | None) -> int | None:
    """First radius mentioned, for sorting. The display string is kept as-is:
    five killers have mode-dependent radii that no single number expresses."""
    if not value:
        return None
    match = _TERROR_RADIUS_METRES.search(str(value))
    if not match:
        return None
    try:
        return int(float(match.group("m")))
    except (TypeError, ValueError):
        return None


def parse_release_date(value: str | date | None) -> date | None:
    """Accept an ISO date or the wiki's `14 June 2016` display form."""
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    text = str(value).strip()
    for fmt in _RELEASE_DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def normalize_rarity(value: str | None) -> str | None:
    """Fold `EItemRarity::SpecialEvent` and friends onto the display rarities."""
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    lowered = text.lower()
    if lowered in _RARITY_ALIASES:
        return _RARITY_ALIASES[lowered]
    if lowered.startswith("eitemrarity::"):
        tail = lowered.split("::", 1)[1]
        spaced = re.sub(r"(?<!^)(?=[a-z]?[A-Z])", " ", text.split("::", 1)[1]).lower().strip()
        return _RARITY_ALIASES.get(f"eitemrarity::{tail}") or _CANONICAL_RARITIES.get(spaced) or text
    return _CANONICAL_RARITIES.get(lowered, text)


def normalize_dlc_type(value: str | None) -> str:
    """Fold the five free-text spellings onto the four real release kinds."""
    if not value:
        return "chapter"
    return _DLC_TYPES.get(str(value).strip().lower(), "chapter")
