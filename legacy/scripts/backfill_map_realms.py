# backend/scripts/backfill_map_realms.py
"""One-time backfill: recompute `realm` for existing Hens333 map_realms rows
using the folder segment already stored in callout_image_url. Safe to re-run;
only touches rows whose recomputed realm differs from what's stored.

Run inside the backend container:
    docker compose exec backend python -m scripts.backfill_map_realms
"""
import logging
from urllib.parse import unquote, urlparse

from sqlalchemy.orm import Session

from app.models import MapRealm
from app.scrapers.maps import resolve_hens_realm

logger = logging.getLogger(__name__)


def _dpath_from_callout_url(callout_image_url: str) -> str:
    path = urlparse(callout_image_url).path
    marker = "/callouts/"
    idx = path.find(marker)
    if idx == -1:
        return ""
    return unquote(path[idx + len(marker):])


def backfill_map_realms(session: Session) -> int:
    rows = session.query(MapRealm).filter(MapRealm.source == "hens333").all()
    updated = 0
    for row in rows:
        dpath = _dpath_from_callout_url(row.callout_image_url or "")
        if not dpath:
            continue
        new_realm = resolve_hens_realm(row.name, dpath)
        if new_realm != row.realm:
            row.realm = new_realm
            updated += 1
    if updated:
        session.commit()
    logger.info(f"Backfilled realm for {updated} Hens333 map row(s).")
    return updated


if __name__ == "__main__":
    from app import create_app
    from app.core.extensions import db

    flask_app = create_app()
    with flask_app.app_context():
        backfill_map_realms(db.session)
