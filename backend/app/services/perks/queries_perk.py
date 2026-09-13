# backend/app/services/perks/queries_perk.py
import logging
import math
import re
from typing import Any
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import joinedload

from app.core.cache import catalog_cache
from app.core.extensions import db
from app.models import Killer, Perk, Survivor, UserCharacterOwnership, UserPerkOwnership
from app.services.perks.utils import normalize_search_key, slugify

logger = logging.getLogger(__name__)


def _is_postgres() -> bool:
    return db.engine.dialect.name in ("postgresql", "postgres")


def _perk_search_prefilter(query: str, lang: str | None):
    """Postgres-only accent/punctuation-insensitive `WHERE` condition, built to
    be a strict superset of what the existing Python-side `_text_matches` +
    `normalize_search_key` pass keeps -- it narrows candidates fetched from
    the DB, but `_text_matches` still runs afterwards as the exact filter, so
    this can only ever exclude non-matches, never a real match. Returns None
    when there's nothing meaningful to filter by (empty query) or the active
    dialect can't run `unaccent()`/`regexp_replace()` (e.g. the SQLite the
    unit test suite uses), in which case the caller falls back to fetching
    every row, matching prior behavior exactly.
    """
    if not _is_postgres():
        return None
    norm_query = re.sub(r"[^a-z0-9]", "", query.lower())
    if not norm_query:
        return None
    pattern = f"%{norm_query}%"

    def normalized(col):
        return func.regexp_replace(func.unaccent(func.lower(col)), r"[^a-zA-Z0-9]", "", "g")

    conditions = [
        normalized(Perk.name).ilike(pattern),
        normalized(func.coalesce(Perk.alternate_name, "")).ilike(pattern),
    ]
    if lang:
        localized_name = Perk.translations[lang]["name"].astext
        conditions.append(normalized(func.coalesce(localized_name, "")).ilike(pattern))
    return or_(*conditions)


def _text_matches(haystack: str, query_lower: str, norm_query: str) -> bool:
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


_GENERAL_KEYWORD_STEMS = {
    "en": "general",
    "pl": "ogóln",
    "de": "allgemein",
    "es": "general",
    "ja": "共通",
}


def _is_general_query(query_lower: str, lang: str | None) -> bool:
    stem = _GENERAL_KEYWORD_STEMS.get(lang or "en", "general")
    return stem in query_lower


def _localized_perk_name(p: Perk, lang: str | None) -> str:
    if lang and isinstance(p.translations, dict) and lang in p.translations:
        trans = p.translations.get(lang) or {}
        if isinstance(trans, dict) and trans.get("name"):
            return trans["name"]
    return p.name


def _localized_character_name(character: "Survivor | Killer | None", lang: str | None) -> str:
    if not character:
        return "General"
    if lang and isinstance(character.translations, dict) and lang in character.translations:
        trans = character.translations.get(lang) or {}
        if isinstance(trans, dict) and trans.get("name"):
            return trans["name"]
    return character.name


def _localized_character_real_name(character: "Survivor | Killer", lang: str | None) -> str:
    if lang and isinstance(character.translations, dict) and lang in character.translations:
        trans = character.translations.get(lang) or {}
        if isinstance(trans, dict) and trans.get("real_name"):
            return trans["real_name"]
    return character.real_name or ""


def _resolve_character_ids_by_name(character: str, lang: str | None = None) -> tuple[list[int], list[int]]:
    """Match a character name to owner ids, as `(survivor_ids, killer_ids)`.

    One flat list of ids no longer identifies anything: survivor 7 and killer 7
    are different characters, so the id has to travel with the table it came
    from. The two lists are kept apart all the way into the `WHERE` clause.
    """
    target_lower = character.strip().lower()
    norm_target = normalize_search_key(character)
    survivor_ids: list[int] = []
    killer_ids: list[int] = []
    for model, matched_ids in ((Survivor, survivor_ids), (Killer, killer_ids)):
        for c in db.session.scalars(select(model)).unique().all():
            display_candidates = [_localized_character_name(c, lang), _localized_character_real_name(c, lang)]
            if any(_text_equals(v, target_lower, norm_target) for v in display_candidates):
                matched_ids.append(c.id)
                continue
            # `code_prefix` ("K01") is derived from role + release_number, so it
            # is a Python attribute rather than a column and cannot be compared
            # in SQL; the display names are handled by the localized comparison
            # above.
            if target_lower and target_lower == c.code_prefix.lower():
                matched_ids.append(c.id)
    return survivor_ids, killer_ids


def _has_no_owner():
    """`WHERE` condition for a general perk.

    The 27 perks that belong to no character used to be `character_id IS NULL`;
    with one owner column per table it takes both being NULL.
    """
    return and_(Perk.survivor_id.is_(None), Perk.killer_id.is_(None))


def _perk_search_haystacks(p: Perk, lang: str | None = None) -> list[str]:
    haystacks = [_localized_perk_name(p, lang), p.alternate_name or ""]

    char = p.character
    if char:
        haystacks.append(_localized_character_name(char, lang))
        haystacks.append(_localized_character_real_name(char, lang))
    return haystacks


def _perk_matches_search(p: Perk, query_lower: str, norm_query: str, is_general_match: bool, lang: str | None = None) -> bool:
    if is_general_match and ((p.survivor_id is None and p.killer_id is None) or p.is_generic_counterpart):
        return True
    return any(_text_matches(h, query_lower, norm_query) for h in _perk_search_haystacks(p, lang))


def _perk_dict_matches_search(
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
    return any(_text_matches(h, query_lower, norm_query) for h in haystacks)


def fetch_perks_fallback(
    service,
    category: str | None = None,
    character: str | None = None,
    scope: str | None = None,
    search: str | None = None,
    sort_by: str = "name",
    order: str = "asc",
    page: int = 1,
    limit: int = 50,
    lang: str | None = None,
) -> dict[str, Any]:
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
        is_general_match = _is_general_query(query_lower, lang)
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
    category: str | None = None,
    character: str | None = None,
    scope: str | None = None,
    search: str | None = None,
    sort_by: str = "name",
    order: str = "asc",
    page: int = 1,
    limit: int = 50,
    user_id: int | None = None,
    owned_only: bool = False,
    lang: str | None = None,
) -> dict[str, Any]:
    """Execute paginated, sorted perk search with optional role and ownership filtering."""
    cache_key = None
    if user_id is None and not owned_only:
        cache_key = ("fetch_perks", category, character, scope, search, sort_by, order, page, limit, lang)
        cached_res = catalog_cache.get(cache_key)
        if cached_res is not None:
            return cached_res

    try:
        # `Perk.character` is a read-only property over the two owner
        # relationships, so the join and the eager load name both of them.
        # Each is an outer join to at most one row, which is what the single
        # join to `characters` was.
        stmt = (
            select(Perk)
            .outerjoin(Perk.survivor)
            .outerjoin(Perk.killer)
            .options(joinedload(Perk.survivor), joinedload(Perk.killer))
        )

        if category and category.lower() != "all":
            stmt = stmt.where(func.lower(Perk.role) == category.lower())

        if character and character.lower() != "all":
            if character.lower() == "general":
                stmt = stmt.where(
                    or_(
                        _has_no_owner(),
                        Perk.is_generic_counterpart.is_(True),
                    )
                )
            else:
                matched_survivor_ids, matched_killer_ids = _resolve_character_ids_by_name(character, lang)
                stmt = stmt.where(
                    or_(
                        Perk.survivor_id.in_(matched_survivor_ids),
                        Perk.killer_id.in_(matched_killer_ids),
                    )
                )

        if scope and scope.lower() == "general":
            stmt = stmt.where(
                or_(
                    _has_no_owner(),
                    Perk.is_generic_counterpart.is_(True),
                )
            )
        elif scope and scope.lower() == "teachable":
            stmt = stmt.where(
                and_(
                    or_(
                        Perk.survivor_id.is_not(None),
                        Perk.killer_id.is_not(None),
                    ),
                    Perk.is_generic_counterpart.is_(False),
                )
            )

        if owned_only and user_id:
            locked_perks_subq = select(UserPerkOwnership.perk_id).where(
                UserPerkOwnership.user_id == user_id,
                UserPerkOwnership.is_unlocked.is_(False),
            )
            # One ownership row names one side, so the deactivated-character
            # set is two subqueries. Each excludes the NULL half of its own
            # rows: a killer's ownership row has `survivor_id IS NULL`, and a
            # single NULL in a `NOT IN` list makes the whole predicate NULL,
            # which would drop every perk instead of none.
            deactivated_survivors_subq = select(UserCharacterOwnership.survivor_id).where(
                UserCharacterOwnership.user_id == user_id,
                UserCharacterOwnership.is_owned.is_(False),
                UserCharacterOwnership.survivor_id.is_not(None),
            )
            deactivated_killers_subq = select(UserCharacterOwnership.killer_id).where(
                UserCharacterOwnership.user_id == user_id,
                UserCharacterOwnership.is_owned.is_(False),
                UserCharacterOwnership.killer_id.is_not(None),
            )
            unlocked_perks_subq = select(UserPerkOwnership.perk_id).where(
                UserPerkOwnership.user_id == user_id,
                UserPerkOwnership.is_unlocked.is_(True),
            )

            stmt = stmt.where(
                or_(
                    _has_no_owner(),
                    Perk.is_generic_counterpart.is_(True),
                    and_(
                        Perk.id.not_in(locked_perks_subq),
                        or_(
                            Perk.id.in_(unlocked_perks_subq),
                            # At most one owner column is set, so the perk's
                            # owner is active when the side it is on is not
                            # deactivated and the other side is NULL.
                            and_(
                                or_(
                                    Perk.survivor_id.is_(None),
                                    Perk.survivor_id.not_in(deactivated_survivors_subq),
                                ),
                                or_(
                                    Perk.killer_id.is_(None),
                                    Perk.killer_id.not_in(deactivated_killers_subq),
                                ),
                            ),
                        ),
                    ),
                )
            )

        search_matched_count: int | None = None
        if search and search.strip():
            query_lower = search.strip().lower()
            norm_query = normalize_search_key(search)
            is_general_match = _is_general_query(query_lower, lang)
            candidates = db.session.scalars(stmt).unique().all()
            matched_ids = [
                p.id for p in candidates if _perk_matches_search(p, query_lower, norm_query, is_general_match, lang)
            ]
            search_matched_count = len(matched_ids)
            stmt = stmt.where(Perk.id.in_(matched_ids))

        valid_sort_field = sort_by.lower() if sort_by.lower() in service.ALLOWED_SORT_FIELDS else "name"
        if valid_sort_field == "character":
            # Whichever owner is joined; a general perk has neither and keeps
            # sorting under "General".
            sort_col = func.coalesce(Survivor.name, Killer.name, "General")
        elif valid_sort_field == "category":
            sort_col = Perk.role
        else:
            sort_col = Perk.name

        reverse = (order.lower() == "desc")
        if reverse:
            stmt = stmt.order_by(sort_col.desc(), Perk.name.desc())
        else:
            stmt = stmt.order_by(sort_col.asc(), Perk.name.asc())

        if search_matched_count is not None:
            total_count = search_matched_count
        else:
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
            # Two sets rather than one: an id only identifies a character
            # together with its role, and survivor 7 and killer 7 both exist.
            deactivated_rows = db.session.execute(
                select(UserCharacterOwnership.survivor_id, UserCharacterOwnership.killer_id).where(
                    UserCharacterOwnership.user_id == user_id,
                    UserCharacterOwnership.is_owned.is_(False),
                )
            ).all()
            deactivated_survivor_ids = {row[0] for row in deactivated_rows if row[0] is not None}
            deactivated_killer_ids = {row[1] for row in deactivated_rows if row[1] is not None}
            perk_explicit_rows = db.session.execute(
                select(UserPerkOwnership.perk_id, UserPerkOwnership.is_unlocked).where(
                    UserPerkOwnership.user_id == user_id
                )
            ).all()
            perk_explicit_map = {row[0]: row[1] for row in perk_explicit_rows}

            for p in perks:
                d = p.to_dict(lang=lang)
                is_gen = (p.survivor_id is None and p.killer_id is None) or p.is_generic_counterpart
                if is_gen:
                    is_owned = True
                elif p.id in perk_explicit_map:
                    is_owned = perk_explicit_map[p.id]
                elif p.survivor_id is not None:
                    is_owned = p.survivor_id not in deactivated_survivor_ids
                elif p.killer_id is not None:
                    is_owned = p.killer_id not in deactivated_killer_ids
                else:
                    is_owned = True
                d["is_owned"] = bool(is_owned)
                paginated_data.append(d)
        else:
            for p in perks:
                d = p.to_dict(lang=lang)
                d["is_owned"] = True
                paginated_data.append(d)

        result = {
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
        if cache_key is not None:
            catalog_cache.set(cache_key, result, ttl=60.0)
        return result
    except Exception as e:
        logger.debug(f"Falling back to memory cache in get_perks: {e}")

    fallback_res = fetch_perks_fallback(service, category, character, scope, search, sort_by, order, page, limit, lang)
    if cache_key is not None:
        catalog_cache.set(cache_key, fallback_res, ttl=30.0)
    return fallback_res


def fetch_perk_suggestions(
    service,
    query: str = "",
    category: str | None = None,
    limit: int = 10,
    lang: str | None = None,
) -> list[dict[str, Any]]:
    """Autocomplete suggestions for perks by name."""
    cache_key = ("fetch_perk_suggestions", query.strip().lower() if query else "", category.lower() if category else "all", limit, lang)
    cached = catalog_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        stmt = (
            select(Perk)
            .outerjoin(Perk.survivor)
            .outerjoin(Perk.killer)
            .options(joinedload(Perk.survivor), joinedload(Perk.killer))
        )
        if category and category.lower() != "all":
            stmt = stmt.where(func.lower(Perk.role) == category.lower())

        prefilter = _perk_search_prefilter(query, lang) if query and query.strip() else None
        if prefilter is not None:
            stmt = stmt.where(prefilter)

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
        result = [
            {
                "id": p.id,
                "name": _localized_perk_name(p, lang),
                "alternate_name": p.alternate_name or "",
                # The response key stays "category"; the column behind it is
                # `role` now, and holds the same "Survivor"/"Killer" values.
                "category": p.role,
                "character": _localized_character_name(p.character, lang),
                "icon_url": p.icon_url or "",
                "icon_local_path": p.icon_local_path or "",
            }
            for p in candidates
        ]
        catalog_cache.set(cache_key, result, ttl=120.0)
        return result
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
        catalog_cache.set(cache_key, res, ttl=60.0)
        return res


def fetch_perk_by_identifier(service, identifier: str, lang: str | None = None) -> dict[str, Any] | None:
    """Find a perk by canonical title or formatted slug."""
    target = identifier.lower().strip()
    target_slug = slugify(identifier)

    cache_key = ("fetch_perk_by_identifier", target, lang)
    cached = catalog_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        stmt = select(Perk).options(joinedload(Perk.survivor), joinedload(Perk.killer)).where(
            or_(
                func.lower(Perk.name) == target,
                func.lower(Perk.alternate_name) == target,
                func.lower(func.replace(func.replace(Perk.name, " ", "_"), "-", "_")) == target_slug,
                func.lower(func.replace(func.replace(Perk.alternate_name, " ", "_"), "-", "_")) == target_slug,
            )
        )
        perk = db.session.scalars(stmt).first()
        if perk:
            res = perk.to_dict(lang=lang)
            catalog_cache.set(cache_key, res, ttl=120.0)
            return res
    except Exception:
        pass

    for p in service._cache:
        p_name = p.get("name", "").lower().strip()
        p_alt = p.get("alternate_name", "").lower().strip()
        if p_name == target or p_alt == target or slugify(p_name) == target_slug or slugify(p_alt) == target_slug:
            catalog_cache.set(cache_key, p, ttl=120.0)
            return p
    return None
