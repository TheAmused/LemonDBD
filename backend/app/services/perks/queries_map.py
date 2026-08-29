# backend/app/services/perks/queries_map.py
from typing import Any
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.models import MapRealm


def fetch_maps(
    service,
    realm: str | None = None,
    search: str | None = None,
    source: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve maps list from database with cache fallback."""
    try:
        stmt = select(MapRealm).options(
            joinedload(MapRealm.tiles),
            joinedload(MapRealm.objectives),
        )
        if source and source.lower() != "all":
            stmt = stmt.where(func.lower(MapRealm.source) == source.lower())
        if realm and realm.lower() != "all":
            r_clean = realm.lower().strip()
            stmt = stmt.where(
                or_(
                    func.lower(MapRealm.realm) == r_clean,
                    func.lower(MapRealm.realm_id) == r_clean,
                )
            )
        if search:
            q = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(MapRealm.name).like(q),
                    func.lower(MapRealm.realm).like(q),
                )
            )
        maps = db.session.scalars(stmt).unique().all()
        if maps:
            return [m.to_dict() for m in maps]
    except Exception:
        pass
    return service._maps_cache


def fetch_map_detail(
    service,
    map_id: str,
    seed: str | None = None,
    floor: int | None = None,
) -> dict[str, Any] | None:
    """Retrieve full map details including seed and floor configurations."""
    try:
        target = map_id.lower().replace("_", "").replace("-", "").strip()
        stmt = select(MapRealm).options(
            joinedload(MapRealm.tiles),
            joinedload(MapRealm.objectives),
        )
        maps = db.session.scalars(stmt).unique().all()
        for m in maps:
            m_clean = m.map_id.lower().replace("_", "").replace("-", "").strip()
            if m.map_id.lower() == map_id.lower() or m.name.lower() == map_id.lower() or target in m_clean or m_clean in target:
                res = m.to_dict()
                res["seed_variant"] = seed or "seed_a"
                res["floor"] = floor or 1
                return res
    except Exception:
        pass
    return None
