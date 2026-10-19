# backend/app/services/maps/queries.py
import logging
from typing import Any
from flask import current_app
from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.models import MapRealm, MapSource, Realm
from app.models.map import (
    DEFAULT_IS_MAIN_BUILDING,
    DEFAULT_IS_SHACK,
    DEFAULT_JUNGLE_GYMS,
    DEFAULT_LAYOUT_TYPE,
    DEFAULT_PALLET_DENSITY,
    DEFAULT_SOURCE_LABEL,
    DEFAULT_SOURCE_CODE,
)

logger = logging.getLogger(__name__)


def fetch_maps(
    use_sqlalchemy: bool,
    db_service: Any,
    realm: str | None = None,
    search: str | None = None,
    source: str | None = None,
    lang: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve maps list with optional realm, search, and source filtering."""
    if use_sqlalchemy:
        try:
            if current_app:
                stmt = select(MapRealm)
                if (realm and realm.lower() != "all") or (search and search.strip()):
                    stmt = stmt.join(Realm, MapRealm.realm_id == Realm.id)
                if realm and realm.lower() != "all":
                    stmt = stmt.where(func.lower(Realm.name) == realm.lower())
                if source and source.lower() != "all":
                    stmt = stmt.join(MapSource, MapRealm.source_id == MapSource.id).where(
                        MapSource.code == source.lower()
                    )
                if search and search.strip():
                    term = f"%{search.strip().lower()}%"
                    stmt = stmt.where(
                        or_(
                            func.lower(MapRealm.name).ilike(term),
                            func.lower(Realm.name).ilike(term),
                        )
                    )
                stmt = stmt.order_by(MapRealm.name.asc())
                rows = db.session.scalars(stmt).unique().all()
                table_has_any_rows = rows or db.session.scalar(select(MapRealm.id).limit(1)) is not None
                if table_has_any_rows:
                    return [r.to_dict(lang=lang) for r in rows]
                return []
        except Exception as e:
            logger.exception(f"Database error in fetch_maps: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass
            raise

    return []


def fetch_realms(lang: str | None = None) -> list[dict[str, Any]]:
    """Retrieve all realm banner images, keyed by realm name for client-side matching."""
    try:
        if current_app:
            rows = db.session.scalars(select(Realm)).all()
            return [r.to_dict(lang=lang) for r in rows]
    except Exception as e:
        logger.exception(f"Database error in fetch_realms: {e}")
        try:
            db.session.rollback()
        except Exception:
            pass
        raise
    return []