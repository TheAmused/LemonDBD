# backend/app/services/perks/queries_perk.py
import logging
import math
from typing import Any, Dict, List, Optional
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.models import Character, Perk, UserCharacterOwnership, UserPerkOwnership
from app.services.perks.utils import slugify

logger = logging.getLogger(__name__)


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

    if search:
        query = search.lower().strip()
        results = [
            p for p in results
            if query in p.get("name", "").lower()
            or query in p.get("alternate_name", "").lower()
            or query in p.get("description", "").lower()
            or query in p.get("character", "").lower()
            or (query == "general" and (not p.get("character") or p.get("character").lower() == "general"))
        ]

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
                stmt = stmt.where(
                    or_(
                        func.lower(Character.name) == character.lower(),
                        func.lower(Character.real_name) == character.lower(),
                        func.lower(Character.short_name) == character.lower(),
                        func.lower(Character.wiki_slug) == character.lower(),
                    )
                )

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

        if search:
            query_str = f"%{search.strip().lower()}%"
            is_general_match = "general" in search.strip().lower()
            conditions = [
                func.lower(Perk.name).like(query_str),
                func.lower(Perk.alternate_name).like(query_str),
                func.lower(Perk.description).like(query_str),
                func.lower(Character.name).like(query_str),
                func.lower(Character.real_name).like(query_str),
            ]
            if is_general_match:
                conditions.append(
                    or_(
                        Perk.character_id.is_(None),
                        Perk.is_generic_counterpart.is_(True),
                    )
                )
            stmt = stmt.where(or_(*conditions))

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

    return fetch_perks_fallback(service, category, character, scope, search, sort_by, order, page, limit)


def fetch_perk_suggestions(
    service,
    query: str = "",
    category: Optional[str] = None,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """Autocomplete suggestions for perks by name."""
    try:
        stmt = select(Perk).outerjoin(Perk.character).options(joinedload(Perk.character))
        if category and category.lower() != "all":
            stmt = stmt.where(func.lower(Perk.category) == category.lower())

        if query:
            q_clean = f"%{query.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Perk.name).like(q_clean),
                    func.lower(Perk.alternate_name).like(q_clean),
                )
            )

        stmt = stmt.order_by(Perk.name.asc()).limit(limit)
        perks = db.session.scalars(stmt).unique().all()
        return [
            {
                "id": p.id,
                "name": p.name,
                "alternate_name": p.alternate_name or "",
                "category": p.category,
                "character": p.character.name if p.character else "General",
                "icon_url": p.icon_url or "",
                "icon_local_path": p.icon_local_path or "",
            }
            for p in perks
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

