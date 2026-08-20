# backend/app/services/perks/queries_equipment.py
import re
from typing import Any, Dict, List, Optional
from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.models import Addon, Item
from app.services.perks.utils import HEADER_EXCLUSIONS


def fetch_items(
    service,
    category: Optional[str] = None,
    search: Optional[str] = None,
    lang: Optional[str] = None,
) -> List[Dict[str, Any]]:
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
        if search:
            q = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Item.name).like(q),
                    func.lower(Item.description).like(q),
                    func.lower(Item.category).like(q),
                    func.lower(Item.role).like(q),
                )
            )
        items = db.session.scalars(stmt).all()
        return [i.to_dict(lang=lang) for i in items if i.name.lower().strip() not in HEADER_EXCLUSIONS]
    except Exception:
        return []


def fetch_addons(
    service,
    category: Optional[str] = None,
    target: Optional[str] = None,
    search: Optional[str] = None,
    lang: Optional[str] = None,
) -> List[Dict[str, Any]]:
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
        if search:
            q = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Addon.name).like(q),
                    func.lower(Addon.description).like(q),
                    func.lower(Addon.category).like(q),
                    func.lower(Addon.associated_target).like(q),
                )
            )
        addons = db.session.scalars(stmt).all()
        return [a.to_dict(lang=lang) for a in addons]
    except Exception:
        return []

