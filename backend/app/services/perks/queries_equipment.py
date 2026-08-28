# backend/app/services/perks/queries_equipment.py
import re
from typing import Any
from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.models import Addon, Item
from app.services.perks.utils import HEADER_EXCLUSIONS


def fetch_items(
    service,
    category: str | None = None,
    search: str | None = None,
    lang: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve survivors items with category filtering and header exclusions."""
    try:
        stmt = select(Item).where(~Item.name.ilike("% items"))
        if category and category.lower() != "all":
            cat_clean = category.strip().lower()
            cat_alt = cat_clean[:-1] if cat_clean.endswith("s") else cat_clean + "s"
            stmt = stmt.where(
                or_(
                    func.lower(Item.category) == cat_clean,
                    func.lower(Item.category) == cat_alt,
                    func.lower(Item.role) == cat_clean,
                )
            )
        items = db.session.scalars(stmt).all()
        result = [i.to_dict(lang=lang) for i in items if i.name.lower().strip() not in HEADER_EXCLUSIONS]
        if search:
            q = search.strip().lower()
            filtered = []
            for it in result:
                name_m = q in it.get("name", "").lower() or q in it.get("raw_name", "").lower()
                desc_m = q in it.get("description", "").lower()
                cat_m = q in it.get("category", "").lower() or q in it.get("role", "").lower()
                if name_m or desc_m or cat_m:
                    filtered.append(it)
            return filtered
        return result
    except Exception:
        return []


def fetch_addons(
    service,
    category: str | None = None,
    target: str | None = None,
    search: str | None = None,
    lang: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve equipment addons filtered by category or associated target power/item."""
    try:
        stmt = select(Addon)
        if category and category.lower() != "all":
            cat_clean = category.strip().lower()
            cat_alt = cat_clean[:-1] if cat_clean.endswith("s") else cat_clean + "s"
            stmt = stmt.where(
                or_(
                    func.lower(Addon.category) == cat_clean,
                    func.lower(Addon.category) == cat_alt,
                )
            )
        if target and target.lower() != "all":
            t_clean = target.strip().lower()
            t_alt = t_clean[:-1] if t_clean.endswith("s") else t_clean + "s"
            t_no_article = re.sub(r"^the\s+", "", t_clean).strip()
            stmt = stmt.where(
                or_(
                    func.lower(Addon.associated_target) == t_clean,
                    func.lower(Addon.associated_target) == t_alt,
                    func.lower(Addon.associated_target) == t_no_article,
                    func.lower(Addon.associated_target) == f"the {t_no_article}",
                )
            )
        addons = db.session.scalars(stmt).all()
        result = [a.to_dict(lang=lang) for a in addons]
        if search:
            q = search.strip().lower()
            filtered = []
            for ad in result:
                name_m = q in ad.get("name", "").lower() or q in ad.get("raw_name", "").lower()
                desc_m = q in ad.get("description", "").lower()
                cat_m = q in ad.get("category", "").lower()
                target_m = q in ad.get("associated_target", "").lower()
                if name_m or desc_m or cat_m or target_m:
                    filtered.append(ad)
            return filtered
        return result
    except Exception:
        return []
