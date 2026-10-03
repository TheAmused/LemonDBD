# backend/app/services/perks/queries_map.py
from typing import Any
from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.models import MapRealm, MapSource, Realm


def fetch_maps(
    service,
    realm: str | None = None,
    search: str | None = None,
    source: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve maps list from database with cache fallback."""
    try:
        stmt = select(MapRealm)
        if source and source.lower() != "all":
            stmt = stmt.join(MapSource, MapRealm.source_id == MapSource.id).where(
                MapSource.code == source.lower()
            )
        # Both filters used to read `map_realms.realm` / `.realm_id`, two
        # denormalized copies of the realm's name and slug. They are one join
        # now, so a realm rename can no longer leave maps pointing at a realm
        # that does not exist.
        if (realm and realm.lower() != "all") or search:
            stmt = stmt.join(Realm, MapRealm.realm_id == Realm.id)
        if realm and realm.lower() != "all":
            r_clean = realm.lower().strip()
            stmt = stmt.where(
                or_(
                    func.lower(Realm.name) == r_clean,
                )
            )
        if search:
            q = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(MapRealm.name).like(q),
                    func.lower(Realm.name).like(q),
                )
            )
        maps = db.session.scalars(stmt).unique().all()
        if maps:
            return [m.to_dict() for m in maps]
    except Exception:
        pass
    return service._maps_cache


def _resolve_map(map_id: str) -> MapRealm | None:
    """Find one map from a route parameter that may be an id or a name."""
    clean = (map_id or "").strip()
    if not clean:
        return None
    try:
        pk = int(clean)
    except (TypeError, ValueError):
        pk = None
    if pk is not None:
        return db.session.get(MapRealm, pk)
    wanted = clean.lower().replace("_", " ").replace("-", " ").strip()
    stmt = select(MapRealm).where(
        or_(
            func.lower(MapRealm.name) == clean.lower(),
            func.lower(MapRealm.name) == wanted,
        )
    )
    return db.session.scalars(stmt).unique().first()
