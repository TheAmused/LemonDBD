# backend/app/services/perks/queries_perk.py
import logging
import math
import re
from typing import Any
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import joinedload

from app.core.catalog_memo import remember
from app.core.extensions import db
from app.models import Killer, Perk, Survivor, UserCharacterOwnership, UserPerkOwnership
from app.services.perks.perk_search import (
    has_no_owner,
    is_general_query,
    localized_character_name,
    localized_character_real_name,
    perk_matches_search,
    text_equals,
)
from app.services.perks.utils import normalize_search_key

logger = logging.getLogger(__name__)

ALLOWED_SORT_FIELDS: set[str] = {"name", "character", "category"}


def _is_postgres() -> bool:
    return db.engine.dialect.name in ("postgresql", "postgres")


def perk_search_prefilter(query: str, lang: str | None):
    """Postgres-only accent/punctuation-insensitive `WHERE` condition, built to
    be a strict superset of what the existing Python-side `text_matches` +
    `normalize_search_key` pass keeps -- it narrows candidates fetched from
    the DB, but `text_matches` still runs afterwards as the exact filter, so
    this can only ever exclude non-matches, never a real match. Returns None
    when there's nothing meaningful to filter by (empty query) or the active
    dialect can't run `unaccent()`/`regexp_replace()` (e.g. the SQLite the
    unit test suite uses), in which case the caller falls back to fetching
    every row, matching prior behavior exactly.
    """
    if not _is_postgres():
        return None
    # Use the same NFKD fold as the Python-side filter so the prefilter is
    # a genuine superset: ä→a, ę→e, ł→l, etc. Spaces are removed because the
    # column regex also strips non-alphanumerics.
    norm_query = re.sub(r"[^a-z0-9]", "", normalize_search_key(query))
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
            display_candidates = [localized_character_name(c, lang), localized_character_real_name(c, lang)]
            if any(text_equals(v, target_lower, norm_target) for v in display_candidates):
                matched_ids.append(c.id)
                continue
            # `code_prefix` ("K01") is derived from role + release_number, so it
            # is a Python attribute rather than a column and cannot be compared
            # in SQL; the display names are handled by the localized comparison
            # above.
            if target_lower and target_lower == c.code_prefix.lower():
                matched_ids.append(c.id)
    return survivor_ids, killer_ids


def fetch_perks(
    service: Any = None,
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
    if user_id is not None or owned_only:
        return _query_perks(service, category, character, scope, search, sort_by, order, page, limit, user_id, owned_only, lang)
    # Key on the values the query uses, not the raw arguments, so an unknown
    # `sort_by` ("name") cannot fill the memo with copies of one page.
    allowed_sorts = getattr(service, "ALLOWED_SORT_FIELDS", ALLOWED_SORT_FIELDS)
    key = (
        "fetch_perks",
        (category or "").lower(),
        (character or "").lower(),
        (scope or "").lower(),
        (search or "").strip().lower(),
        sort_by.lower() if sort_by.lower() in allowed_sorts else "name",
        order.lower() == "desc",
        max(1, page),
        max(1, min(limit, 10000)),
        lang,
    )
    return remember(
        key,
        lambda: _query_perks(service, category, character, scope, search, sort_by, order, page, limit, user_id, owned_only, lang),
        ttl=60.0,
    )


def _query_perks(
    service: Any,
    category: str | None,
    character: str | None,
    scope: str | None,
    search: str | None,
    sort_by: str,
    order: str,
    page: int,
    limit: int,
    user_id: int | None,
    owned_only: bool,
    lang: str | None,
) -> dict[str, Any]:
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
                    has_no_owner(),
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
                has_no_owner(),
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
                has_no_owner(),
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
        is_general_match = is_general_query(query_lower, lang)
        candidates = db.session.scalars(stmt).unique().all()
        matched_ids = [
            p.id for p in candidates if perk_matches_search(p, query_lower, norm_query, is_general_match, lang)
        ]
        search_matched_count = len(matched_ids)
        stmt = stmt.where(Perk.id.in_(matched_ids))

    allowed_sorts = getattr(service, "ALLOWED_SORT_FIELDS", ALLOWED_SORT_FIELDS)
    valid_sort_field = sort_by.lower() if sort_by.lower() in allowed_sorts else "name"
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
