# backend/app/services/perks/queries_perk_lookup.py
"""Single-perk lookups: autocomplete suggestions and fetch by name or slug."""
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from app.core.cache import catalog_cache
from app.core.extensions import db
from app.models import Perk
from app.services.perks.perk_search import localized_character_name, localized_perk_name, text_matches
from app.services.perks.queries_perk import perk_search_prefilter
from app.services.perks.utils import normalize_search_key, slugify


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

        prefilter = perk_search_prefilter(query, lang) if query and query.strip() else None
        if prefilter is not None:
            stmt = stmt.where(prefilter)

        candidates = db.session.scalars(stmt).unique().all()

        if query and query.strip():
            query_lower = query.strip().lower()
            norm_query = normalize_search_key(query)
            candidates = [
                p for p in candidates
                if text_matches(localized_perk_name(p, lang), query_lower, norm_query)
                or text_matches(p.alternate_name or "", query_lower, norm_query)
            ]

        candidates = sorted(candidates, key=lambda p: p.name.lower())[:limit]
        result = [
            {
                "id": p.id,
                "name": localized_perk_name(p, lang),
                "alternate_name": p.alternate_name or "",
                # The response key stays "category"; the column behind it is
                # `role` now, and holds the same "Survivor"/"Killer" values.
                "category": p.role,
                "character": localized_character_name(p.character, lang),
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
