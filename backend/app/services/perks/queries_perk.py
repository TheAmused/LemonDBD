# backend/app/services/perks/queries_perk.py
import logging
import math
from typing import Any, Dict, List, Optional
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.models import Character, Perk, UserCharacterOwnership, UserPerkOwnership
from app.services.perks.utils import normalize_search_key, slugify

logger = logging.getLogger(__name__)


def _text_matches(haystack: str, query_lower: str, norm_query: str) -> bool:
    """Substring match that tolerates diacritics, without breaking scripts (CJK, Cyrillic, ...)
    that normalize_search_key strips down to an empty string."""
    if not haystack:
        return False
    if query_lower and query_lower in haystack.lower():
        return True
    if norm_query:
        return norm_query in normalize_search_key(haystack)
    return False


def _text_equals(value: str, target_lower: str, norm_target: str) -> bool:
    if not value:
        return False
    if target_lower and value.lower() == target_lower:
        return True
    if norm_target:
        return normalize_search_key(value) == norm_target
    return False


def _localized_perk_name(p: Perk, lang: Optional[str]) -> str:
    if lang and isinstance(p.translations, dict) and lang in p.translations:
        trans = p.translations.get(lang) or {}
        if isinstance(trans, dict) and trans.get("name"):
            return trans["name"]
    return p.name


def _localized_character_name(character: Optional[Character], lang: Optional[str]) -> str:
    if not character:
        return "General"
    if lang and isinstance(character.translations, dict) and lang in character.translations:
        trans = character.translations.get(lang) or {}
        if isinstance(trans, dict) and trans.get("name"):
            return trans["name"]
    return character.name


def _localized_character_real_name(character: Character, lang: Optional[str]) -> str:
    if lang and isinstance(character.translations, dict) and lang in character.translations:
        trans = character.translations.get(lang) or {}
        if isinstance(trans, dict) and trans.get("real_name"):
            return trans["real_name"]
    return character.real_name or ""


def _resolve_character_ids_by_name(character: str, lang: Optional[str] = None) -> List[int]:
    """Match a character filter value against the name as shown in the requested locale
    (falls back to English only for a character with no translation for that locale, same
    as what's actually displayed). short_name/wiki_slug are internal identifiers, not
    display text, so they always match regardless of locale."""
    target_lower = character.strip().lower()
    norm_target = normalize_search_key(character)
    matched_ids: List[int] = []
    for c in db.session.scalars(select(Character)).unique().all():
        display_candidates = [_localized_character_name(c, lang), _localized_character_real_name(c, lang)]
        if any(_text_equals(v, target_lower, norm_target) for v in display_candidates):
            matched_ids.append(c.id)
            continue
        # Identifiers, not display text: exact match only, no diacritic-folding, so an
        # underscore-joined slug can't accidentally equal a different locale's display name.
        if target_lower and target_lower in {(c.short_name or "").lower(), (c.wiki_slug or "").lower()}:
            matched_ids.append(c.id)
    return matched_ids


def _perk_search_haystacks(p: Perk, lang: Optional[str] = None) -> List[str]:
    """Name/description strings for a perk exactly as they'd be displayed in the requested
    locale, so search only ever matches the language currently shown on the page."""
    description = p.description or ""
    if lang and isinstance(p.translations, dict):
        loc_data = p.translations.get(lang)
        if isinstance(loc_data, dict) and loc_data.get("description"):
            description = loc_data["description"]
    haystacks = [_localized_perk_name(p, lang), p.alternate_name or "", description]

    char = p.character
    if char:
        haystacks.append(_localized_character_name(char, lang))
        haystacks.append(_localized_character_real_name(char, lang))
    return haystacks


def _perk_matches_search(p: Perk, query_lower: str, norm_query: str, is_general_match: bool, lang: Optional[str] = None) -> bool:
    if is_general_match and (p.character_id is None or p.is_generic_counterpart):
        return True
    return any(_text_matches(h, query_lower, norm_query) for h in _perk_search_haystacks(p, lang))


def _perk_dict_matches_search(
    p: Dict[str, Any], query_lower: str, norm_query: str, is_general_match: bool, lang: Optional[str] = None
) -> bool:
    """Same locale-scoped search as _perk_matches_search, for the in-memory cache fallback."""
    if is_general_match and (not p.get("character") or p.get("character", "").lower() == "general"):
        return True
    name = p.get("name", "")
    description = p.get("description", "")
    translations = p.get("translations")
    if lang and isinstance(translations, dict):
        loc_data = translations.get(lang)
        if isinstance(loc_data, dict):
            name = loc_data.get("name") or name
            description = loc_data.get("description") or description
    haystacks = [name, p.get("alternate_name", ""), description, p.get("character", "")]
    return any(_text_matches(h, query_lower, norm_query) for h in haystacks)


def fetch_perks_fallback(
    service,
    category: Optional[str] = None,
    character: Optional[str] = None,
    scope: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "name",
    order: str = "asc",
    page: int = 1,
    limit: int = 50,
    lang: Optional[str] = None,
) -> Dict[str, Any]:
    """In-memory cache fallback filtering for perk queries."""
    results = service._cache
    if category and category.lower() != "all":
        results = [p for p in results if p.get("category", "").lower() == category.lower()]

    if character and character.lower() != "all":
        if character.lower() == "general":
            results = [
                p for p in results
                if not p.get("character")
                or p.get("character").lower() == "general"
                or p.get("is_generic_counterpart")
            ]
        else:
            results = [
                p for p in results
                if p.get("character", "").lower() == character.lower()
                or p.get("character_real_name", "").lower() == character.lower()
            ]

    if scope and scope.lower() == "general":
        results = [
            p for p in results
            if not p.get("character")
            or p.get("character").lower() == "general"
            or p.get("is_generic_counterpart")
        ]
    elif scope and scope.lower() == "teachable":
        results = [
            p for p in results
            if p.get("character")
            and p.get("character").lower() != "general"
            and not p.get("is_generic_counterpart")
        ]

    if search and search.strip():
        query_lower = search.strip().lower()
        norm_query = normalize_search_key(search)
        is_general_match = "general" in query_lower
        results = [p for p in results if _perk_dict_matches_search(p, query_lower, norm_query, is_general_match, lang)]

    valid_sort_field = sort_by.lower() if sort_by.lower() in service.ALLOWED_SORT_FIELDS else "name"
    reverse = (order.lower() == "desc")
    results = sorted(
        results,
        key=lambda x: str(x.get(valid_sort_field, "") or ("General" if valid_sort_field == "character" else "")).lower(),
        reverse=reverse,
    )

    total_count = len(results)
    page = max(1, page)
    limit = max(1, min(limit, 10000))
    total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit

    data_slice = []
    for p in results[start_idx:end_idx]:
        p_copy = dict(p)
        p_copy["is_owned"] = True
        data_slice.append(p_copy)

    return {
        "data": data_slice,
        "pagination": {
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "has_next": end_idx < total_count,
            "has_prev": page > 1,
        },
        "filters": {
            "category": category or "all",
            "character": character or "all",
            "scope": scope or "all",
            "search": search or "",
            "sort_by": valid_sort_field,
            "order": "desc" if reverse else "asc",
            "owned_only": False,
        },
    }


def fetch_perks(
    service,
    category: Optional[str] = None,
    character: Optional[str] = None,
    scope: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "name",
    order: str = "asc",
    page: int = 1,
    limit: int = 50,
    user_id: Optional[int] = None,
    owned_only: bool = False,
    lang: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute paginated, sorted perk search with optional role and ownership filtering."""
    try:
        stmt = select(Perk).outerjoin(Perk.character).options(joinedload(Perk.character))

        if category and category.lower() != "all":
            stmt = stmt.where(func.lower(Perk.category) == category.lower())

        if character and character.lower() != "all":
            if character.lower() == "general":
                stmt = stmt.where(
                    or_(
                        Perk.character_id.is_(None),
                        Perk.is_generic_counterpart.is_(True),
                    )
                )
            else:
                matched_char_ids = _resolve_character_ids_by_name(character, lang)
                stmt = stmt.where(Perk.character_id.in_(matched_char_ids))

        if scope and scope.lower() == "general":
            stmt = stmt.where(
                or_(
                    Perk.character_id.is_(None),
                    Perk.is_generic_counterpart.is_(True),
                )
            )
        elif scope and scope.lower() == "teachable":
            stmt = stmt.where(
                and_(
                    Perk.character_id.is_not(None),
                    Perk.is_generic_counterpart.is_(False),
                )
            )

        if owned_only and user_id:
            locked_perks_subq = select(UserPerkOwnership.perk_id).where(
                UserPerkOwnership.user_id == user_id,
                UserPerkOwnership.is_unlocked.is_(False),
            )
            deactivated_chars_subq = select(UserCharacterOwnership.character_id).where(
                UserCharacterOwnership.user_id == user_id,
                UserCharacterOwnership.is_owned.is_(False),
            )
            unlocked_perks_subq = select(UserPerkOwnership.perk_id).where(
                UserPerkOwnership.user_id == user_id,
                UserPerkOwnership.is_unlocked.is_(True),
            )

            stmt = stmt.where(
                or_(
                    Perk.character_id.is_(None),
                    Perk.is_generic_counterpart.is_(True),
                    and_(
                        Perk.id.not_in(locked_perks_subq),
                        or_(
                            Perk.id.in_(unlocked_perks_subq),
                            Perk.character_id.not_in(deactivated_chars_subq),
                        ),
                    ),
                )
            )

        if search and search.strip():
            query_lower = search.strip().lower()
            norm_query = normalize_search_key(search)
            is_general_match = "general" in query_lower
            candidates = db.session.scalars(stmt).unique().all()
            matched_ids = [
                p.id for p in candidates if _perk_matches_search(p, query_lower, norm_query, is_general_match, lang)
            ]
            stmt = stmt.where(Perk.id.in_(matched_ids))

        valid_sort_field = sort_by.lower() if sort_by.lower() in service.ALLOWED_SORT_FIELDS else "name"
        if valid_sort_field == "character":
            sort_col = func.coalesce(Character.name, "General")
        elif valid_sort_field == "category":
            sort_col = Perk.category
        else:
            sort_col = Perk.name

        reverse = (order.lower() == "desc")
        if reverse:
            stmt = stmt.order_by(sort_col.desc(), Perk.name.desc())
        else:
            stmt = stmt.order_by(sort_col.asc(), Perk.name.asc())

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = db.session.scalar(count_stmt) or 0

        page = max(1, page)
        limit = max(1, min(limit, 10000))
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
        offset = (page - 1) * limit

        paginated_stmt = stmt.offset(offset).limit(limit)
        perks = db.session.scalars(paginated_stmt).unique().all()

        paginated_data = []
        if user_id:
            deactivated_char_ids = set(
                db.session.scalars(
                    select(UserCharacterOwnership.character_id).where(
                        UserCharacterOwnership.user_id == user_id,
                        UserCharacterOwnership.is_owned.is_(False),
                    )
                ).all()
            )
            perk_explicit_rows = db.session.execute(
                select(UserPerkOwnership.perk_id, UserPerkOwnership.is_unlocked).where(
                    UserPerkOwnership.user_id == user_id
                )
            ).all()
            perk_explicit_map = {row[0]: row[1] for row in perk_explicit_rows}

            for p in perks:
                d = p.to_dict(lang=lang)
                is_gen = p.character_id is None or p.is_generic_counterpart
                if is_gen:
                    is_owned = True
                elif p.id in perk_explicit_map:
                    is_owned = perk_explicit_map[p.id]
                else:
                    is_owned = (p.character_id not in deactivated_char_ids) if p.character_id else True
                d["is_owned"] = bool(is_owned)
                paginated_data.append(d)
        else:
            for p in perks:
                d = p.to_dict(lang=lang)
                d["is_owned"] = True
                paginated_data.append(d)

        return {
            "data": paginated_data,
            "pagination": {
                "total": total_count,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
                "has_next": offset + limit < total_count,
                "has_prev": page > 1,
            },
            "filters": {
                "category": category or "all",
                "character": character or "all",
                "scope": scope or "all",
                "search": search or "",
                "sort_by": valid_sort_field,
                "order": "desc" if reverse else "asc",
                "owned_only": owned_only,
            },
        }
    except Exception as e:
        logger.debug(f"Falling back to memory cache in get_perks: {e}")

    return fetch_perks_fallback(service, category, character, scope, search, sort_by, order, page, limit, lang)


def fetch_perk_suggestions(
    service,
    query: str = "",
    category: Optional[str] = None,
    limit: int = 10,
    lang: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Autocomplete suggestions for perks by name, matched in the requested locale only."""
    try:
        stmt = select(Perk).outerjoin(Perk.character).options(joinedload(Perk.character))
        if category and category.lower() != "all":
            stmt = stmt.where(func.lower(Perk.category) == category.lower())

        candidates = db.session.scalars(stmt).unique().all()

        if query and query.strip():
            query_lower = query.strip().lower()
            norm_query = normalize_search_key(query)
            candidates = [
                p for p in candidates
                if _text_matches(_localized_perk_name(p, lang), query_lower, norm_query)
                or _text_matches(p.alternate_name or "", query_lower, norm_query)
            ]

        candidates = sorted(candidates, key=lambda p: p.name.lower())[:limit]
        return [
            {
                "id": p.id,
                "name": _localized_perk_name(p, lang),
                "alternate_name": p.alternate_name or "",
                "category": p.category,
                "character": _localized_character_name(p.character, lang),
                "icon_url": p.icon_url or "",
                "icon_local_path": p.icon_local_path or "",
            }
            for p in candidates
        ]
    except Exception:
        q_clean = query.strip().lower()
        res = []
        for p in service._cache:
            if category and category.lower() != "all" and p.get("category", "").lower() != category.lower():
                continue
            if not q_clean or q_clean in p.get("name", "").lower() or q_clean in p.get("alternate_name", "").lower():
                res.append({
                    "id": p.get("id"),
                    "name": p.get("name", ""),
                    "alternate_name": p.get("alternate_name", ""),
                    "category": p.get("category", "Survivor"),
                    "character": p.get("character", "General"),
                    "icon_url": p.get("icon_url", ""),
                    "icon_local_path": p.get("icon_local_path", ""),
                })
            if len(res) >= limit:
                break
        return res


def fetch_perk_by_identifier(service, identifier: str, lang: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Find a perk by canonical title or formatted slug."""
    target = identifier.lower().strip()
    target_slug = slugify(identifier)

    try:
        stmt = select(Perk).options(joinedload(Perk.character)).where(
            or_(
                func.lower(Perk.name) == target,
                func.lower(Perk.alternate_name) == target,
                func.lower(func.replace(func.replace(Perk.name, " ", "_"), "-", "_")) == target_slug,
                func.lower(func.replace(func.replace(Perk.alternate_name, " ", "_"), "-", "_")) == target_slug,
            )
        )
        perk = db.session.scalars(stmt).first()
        if perk:
            return perk.to_dict(lang=lang)
    except Exception:
        pass

    for p in service._cache:
        p_name = p.get("name", "").lower().strip()
        p_alt = p.get("alternate_name", "").lower().strip()
        if p_name == target or p_alt == target or slugify(p_name) == target_slug or slugify(p_alt) == target_slug:
            return p
    return None

