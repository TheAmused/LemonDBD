# backend/app/services/perks/perk_search.py
"""Pure text-matching and localization helpers shared by the perk queries."""
from typing import Any

from sqlalchemy import and_

from app.models import Killer, Perk, Survivor
from app.services.perks.utils import normalize_search_key


def text_matches(haystack: str, query_lower: str, norm_query: str) -> bool:
    if not haystack:
        return False
    if query_lower and query_lower in haystack.lower():
        return True
    if norm_query:
        return norm_query in normalize_search_key(haystack)
    return False


def text_equals(value: str, target_lower: str, norm_target: str) -> bool:
    if not value:
        return False
    if target_lower and value.lower() == target_lower:
        return True
    if norm_target:
        return normalize_search_key(value) == norm_target
    return False


_GENERAL_KEYWORD_STEMS = {
    "en": "general",
    "pl": "ogóln",
    "de": "allgemein",
    "es": "general",
    "ja": "共通",
}


def is_general_query(query_lower: str, lang: str | None) -> bool:
    stem = _GENERAL_KEYWORD_STEMS.get(lang or "en", "general")
    return stem in query_lower


def localized_perk_name(p: Perk, lang: str | None) -> str:
    if lang and isinstance(p.translations, dict) and lang in p.translations:
        trans = p.translations.get(lang) or {}
        if isinstance(trans, dict) and trans.get("name"):
            return trans["name"]
    return p.name


def localized_character_name(character: "Survivor | Killer | None", lang: str | None) -> str:
    if not character:
        return "General"
    if lang and isinstance(character.translations, dict) and lang in character.translations:
        trans = character.translations.get(lang) or {}
        if isinstance(trans, dict) and trans.get("name"):
            return trans["name"]
    return character.name


def localized_character_real_name(character: "Survivor | Killer", lang: str | None) -> str:
    if lang and isinstance(character.translations, dict) and lang in character.translations:
        trans = character.translations.get(lang) or {}
        if isinstance(trans, dict) and trans.get("real_name"):
            return trans["real_name"]
    return character.real_name or ""


def has_no_owner():
    """`WHERE` condition for a general perk.

    The 27 perks that belong to no character used to be `character_id IS NULL`;
    with one owner column per table it takes both being NULL.
    """
    return and_(Perk.survivor_id.is_(None), Perk.killer_id.is_(None))


def perk_search_haystacks(p: Perk, lang: str | None = None) -> list[str]:
    haystacks = [localized_perk_name(p, lang), p.alternate_name or ""]

    char = p.character
    if char:
        haystacks.append(localized_character_name(char, lang))
        haystacks.append(localized_character_real_name(char, lang))
    return haystacks


def perk_matches_search(p: Perk, query_lower: str, norm_query: str, is_general_match: bool, lang: str | None = None) -> bool:
    if is_general_match and ((p.survivor_id is None and p.killer_id is None) or p.is_generic_counterpart):
        return True
    return any(text_matches(h, query_lower, norm_query) for h in perk_search_haystacks(p, lang))


def perk_dict_matches_search(
    p: dict[str, Any], query_lower: str, norm_query: str, is_general_match: bool, lang: str | None = None
) -> bool:
    if is_general_match and (not p.get("character") or p.get("character", "").lower() == "general"):
        return True
    name = p.get("name", "")
    translations = p.get("translations")
    if lang and isinstance(translations, dict):
        loc_data = translations.get(lang)
        if isinstance(loc_data, dict):
            name = loc_data.get("name") or name
    haystacks = [name, p.get("alternate_name", ""), p.get("character", "")]
    return any(text_matches(h, query_lower, norm_query) for h in haystacks)
