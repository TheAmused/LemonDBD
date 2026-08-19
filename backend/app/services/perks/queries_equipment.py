# backend/app/services/perks/queries_equipment.py
from typing import Any, Dict, List, Optional
from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.models import Addon, Item
from app.services.perks.utils import HEADER_EXCLUSIONS


def fetch_items(
    service,
    category: Optional[str] = None,
    search: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Retrieve survivors items with category filtering and header exclusions."""
    try:
        stmt = select(Item).where(~Item.name.ilike("% items"))
        if category and category.lower() != "all":
            stmt = stmt.where(func.lower(Item.category) == category.lower())
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
        return [i.to_dict() for i in items if i.name.lower().strip() not in HEADER_EXCLUSIONS]
    except Exception:
        return []


def fetch_addons(
    service,
    category: Optional[str] = None,
    target: Optional[str] = None,
    search: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Retrieve equipment addons filtered by category or associated target power/item."""
    try:
        stmt = select(Addon)
        if category and category.lower() != "all":
            stmt = stmt.where(func.lower(Addon.category) == category.lower())
        if target and target.lower() != "all":
            stmt = stmt.where(func.lower(Addon.associated_target) == target.lower())
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
        return [a.to_dict() for a in addons]
    except Exception:
        return []

