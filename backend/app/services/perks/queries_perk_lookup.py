# backend/app/services/perks/queries_perk_lookup.py
"""Single-perk lookups: autocomplete suggestions and fetch by name or slug."""
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from app.core.catalog_memo import remember
from app.core.extensions import db
from app.models import Perk
from app.services.perks.perk_search import localized_character_name, localized_perk_name, text_matches
from app.services.perks.queries_perk import perk_search_prefilter
from app.services.perks.utils import normalize_search_key, slugify


def fetch_perk_suggestions(
    service: Any = None,
    query: str = "",
    category: str | None = None,
    limit: int = 10,
    lang: str | None = None,
) -> list[dict[str, Any]]:
    """Autocomplete suggestions for perks by name.

    A database error propagates so `@cache_catalog` answers 5xx instead of
    storing an empty list as the suggestions for an hour.
    """
    key = ("fetch_perk_suggestions", query.strip().lower() if query else "", category.lower() if category else "all", limit, lang)
    return remember(key, lambda: _load_perk_suggestions(query, category, limit, lang), ttl=120.0)


def _load_perk_suggestions(query: str, category: str | None, limit: int, lang: str | None) -> list[dict[str, Any]]:
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
    return [
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


def fetch_perk_by_identifier(service: Any = None, identifier: str = "", lang: str | None = None) -> dict[str, Any] | None:
    """Find a perk by canonical title or formatted slug."""
    return remember(
        ("fetch_perk_by_identifier", identifier.lower().strip(), lang),
        lambda: _load_perk(identifier, lang),
        ttl=120.0,
    )


def _load_perk(identifier: str, lang: str | None) -> dict[str, Any] | None:
    target = identifier.lower().strip()
    target_slug = slugify(identifier)

    stmt = select(Perk).options(joinedload(Perk.survivor), joinedload(Perk.killer)).where(
        or_(
            func.lower(Perk.name) == target,
            func.lower(Perk.alternate_name) == target,
            func.lower(func.replace(func.replace(Perk.name, " ", "_"), "-", "_")) == target_slug,
            func.lower(func.replace(func.replace(Perk.alternate_name, " ", "_"), "-", "_")) == target_slug,
        )
    )
    perk = db.session.scalars(stmt).first()
    return perk.to_dict(lang=lang) if perk else None
