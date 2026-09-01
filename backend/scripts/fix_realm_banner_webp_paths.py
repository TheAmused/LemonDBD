# backend/scripts/fix_realm_banner_webp_paths.py
"""One-time backfill: realm banner rows written before the pipeline ordering
fix point image_local_path at the source scraper's original .png path, even
though the asset downloader always converts and writes a .webp file. Rewrites
each row to .webp when that file actually exists on disk; leaves it alone
otherwise so a missing conversion doesn't silently break the image.

Run inside the backend container:
    docker compose exec backend python -m scripts.fix_realm_banner_webp_paths
"""
import logging
from pathlib import Path

from app.core.extensions import db
from app.models import Realm

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).resolve().parent.parent / "app" / "static"


def main() -> None:
    updated = 0
    for realm in db.session.query(Realm).all():
        path = realm.image_local_path or ""
        if not path.lower().endswith(".png"):
            continue
        webp_path = path[: -len(".png")] + ".webp"
        if (STATIC_DIR / webp_path).exists():
            realm.image_local_path = webp_path
            updated += 1
        else:
            logger.warning(f"No .webp sibling on disk for {realm.name!r} ({path}); leaving as-is")

    db.session.commit()
    print(f"Updated {updated} realm banner path(s) to .webp")


if __name__ == "__main__":
    from app import create_app

    flask_app = create_app()
    with flask_app.app_context():
        main()
