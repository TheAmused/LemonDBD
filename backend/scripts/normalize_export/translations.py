# backend/scripts/normalize_export/translations.py
"""Translation-blob tidying: moved keys, promoted English, duplicate overrides."""
from __future__ import annotations

from typing import Any


def strip_moved_translations(row: dict[str, Any], *moved: str) -> int:
    """Remove translation keys that now live on the parent row.

    `chapter_name` (characters) and `realm` (maps) were copied into every
    child's translations blob -- 490 and 232 copies of 52 and 21 names.
    """
    translations = row.get("translations")
    if not isinstance(translations, dict):
        return 0
    removed = 0
    for lang, payload in list(translations.items()):
        if not isinstance(payload, dict):
            continue
        for key in moved:
            if key in payload:
                del payload[key]
                removed += 1
        if not payload:
            del translations[lang]
    return removed


#: Free-text fields whose English lived in two places: the column (scraped
#: wiki markup) and `translations.en` (the clean in-game text). The in-game
#: text wins and becomes the column, so English is stored exactly once, like
#: every other language.
PROMOTE_EN = {
    "perks": ("description",),
    "survivors": ("lore",),
    "killers": ("lore", "power_description"),
    "items": ("description",),
    "addons": ("description",),
    "offerings": ("description",),
}

#: Every translatable field, checked for overrides that merely restate the
#: column. `name` is deliberately not promoted -- there the English override is
#: a genuinely different string (the in-game name vs the wiki page title:
#: "Kinship" vs "Camaraderie", "Aestri Yazar" vs "The Troupe") and replacing
#: the column would rename characters.
TRANSLATABLE = {
    "perks": ("name", "description"),
    "survivors": ("name", "lore"),
    "killers": ("name", "lore", "power_name", "power_description"),
    "items": ("name", "description"),
    "addons": ("name", "description"),
    "offerings": ("name", "description"),
    "maps": ("name", "description"),
    "chapters": ("name",),
    "realms": ("name",),
}


def promote_english(row: dict[str, Any], *fields: str) -> int:
    """Move `translations.en.<field>` onto the column it duplicates."""
    translations = row.get("translations")
    if not isinstance(translations, dict):
        return 0
    english = translations.get("en")
    if not isinstance(english, dict):
        return 0
    promoted = 0
    for field in fields:
        value = english.get(field)
        if value is None:
            continue
        row[field] = value
        del english[field]
        promoted += 1
    if not english:
        translations.pop("en", None)
    return promoted


def collapse_translations(row: dict[str, Any], *fields: str) -> int:
    """Drop every override that is byte-identical to the column it overrides.

    A translations blob is a set of *differences*; an entry equal to the base
    value is noise. This removed the English copies of all 58 item
    descriptions, 934 of 935 add-on descriptions and all 96 offering
    descriptions, plus the same restatements in de/es/ja/pl.
    """
    translations = row.get("translations")
    if not isinstance(translations, dict):
        return 0
    dropped = 0
    for lang, payload in list(translations.items()):
        if not isinstance(payload, dict):
            continue
        for field in fields:
            if field not in payload:
                continue
            base = row.get(field)
            if (payload.get(field) or "").strip() == (base or "").strip():
                del payload[field]
                dropped += 1
        if not payload:
            del translations[lang]
    return dropped


def tidy_text(row: dict[str, Any], entity: str) -> tuple[int, int]:
    promoted = promote_english(row, *PROMOTE_EN.get(entity, ()))
    dropped = collapse_translations(row, *TRANSLATABLE.get(entity, ()))
    return promoted, dropped
