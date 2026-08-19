# backend/app/services/page_streak/pool.py
from typing import Any, Dict, List
from sqlalchemy import select

from app.core.extensions import db
from app.models import GeneratorSetting
from app.services.ownership_service import OwnershipService
from app.services.page_streak.helpers import DEFAULT_PERKS_PER_PAGE
from app.services.perk_service import PerkService


def get_configured_perks_per_page() -> int:
    """Read the active perks_per_page value from database configuration."""
    setting = db.session.scalars(select(GeneratorSetting).where(GeneratorSetting.id == 1)).first()
    if setting and setting.perks_per_page:
        return int(setting.perks_per_page)
    return DEFAULT_PERKS_PER_PAGE


def fetch_all_killer_perks(perk_service: PerkService) -> List[Dict[str, Any]]:
    """Retrieve all available killer perks via paginated service extraction."""
    page = 1
    limit = 200
    collected: List[Dict[str, Any]] = []
    total = None
    while True:
        result = perk_service.get_perks(category="Killer", page=page, limit=limit)
        data = result.get("data", [])
        if not data:
            break
        collected.extend(data)
        if total is None:
            total = result.get("pagination", {}).get("total")
        if total is not None and len(collected) >= total:
            break
        page += 1
    return collected


def get_user_killer_pool(user_id: int, perk_service: PerkService, ownership_service: OwnershipService) -> List[Dict[str, Any]]:
    """Return killer perks unlocked by the specific user."""
    owned_perks = ownership_service.get_user_perks(user_id, category="Killer")
    unlocked_names = {p["name"] for p in owned_perks if p["is_unlocked"]}
    perks = [p for p in fetch_all_killer_perks(perk_service) if p["name"] in unlocked_names]
    return sorted(perks, key=lambda p: p["name"])


def build_user_perk_pages(user_id: int, perk_service: PerkService, ownership_service: OwnershipService) -> List[List[str]]:
    """Partition the user's unlocked killer perks into sequential page arrays."""
    pool = get_user_killer_pool(user_id, perk_service, ownership_service)
    size = get_configured_perks_per_page()
    names = [p["name"] for p in pool]
    return [names[i : i + size] for i in range(0, len(names), size)]

