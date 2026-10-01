# backend/app/routes/maps.py
from pathlib import Path

from flask import Blueprint, abort, current_app, jsonify, request, send_file
from PIL import Image

from app.core.http_cache import cache_catalog
from app.services.map_service import MapService
from app.utils.lang import extract_lang

maps_bp = Blueprint("maps", __name__, url_prefix="/api/v1/maps")
service = MapService()


@maps_bp.route("/realms", methods=["GET"])
@cache_catalog(ttl=86400, vary=("lang",))
def get_realms():
    """Retrieve all realm banner images for client-side name matching."""
    realms = service.get_realms(lang=extract_lang())
    return jsonify({"realms": realms}), 200


@maps_bp.route("", methods=["GET"])
@maps_bp.route("/", methods=["GET"])
@cache_catalog(ttl=3600, vary=("realm", "search", "source", "lang"))
def get_maps():
    """Retrieve all available map realms with optional query filtering."""
    realm = request.args.get("realm")
    search = request.args.get("search")
    source = request.args.get("source")

    maps = service.get_maps(realm=realm, search=search, source=source, lang=extract_lang())
    return jsonify({"maps": maps}), 200


THUMB_WIDTH = 320
_THUMB_ROOT = "_thumbs"


@maps_bp.route("/thumb/<path:rel>", methods=["GET"])
def get_map_thumb(rel: str):
    """A small WebP copy of a map callout image (cached on disk after the first request).

    The source callouts are ~2000x2200 px; a tier list tile shows them at ~100 px,
    and decoding dozens of full-size bitmaps is what made that page lag.
    """
    static_root = Path(current_app.static_folder or "").resolve()
    maps_root = (static_root / "maps").resolve()
    source = (maps_root / rel).resolve()
    if maps_root not in source.parents or _THUMB_ROOT in source.relative_to(maps_root).parts:
        abort(404)
    if source.suffix.lower() not in {".webp", ".png", ".jpg", ".jpeg"} or not source.is_file():
        abort(404)

    thumb = (maps_root / _THUMB_ROOT / str(THUMB_WIDTH) / rel).with_suffix(".webp")
    if not thumb.is_file() or thumb.stat().st_mtime < source.stat().st_mtime:
        thumb.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as img:
            img.thumbnail((THUMB_WIDTH, THUMB_WIDTH * 2))
            img.save(thumb, "WEBP", quality=82, method=4)

    response = send_file(thumb, mimetype="image/webp", max_age=60 * 60 * 24 * 30)
    response.headers["Cache-Control"] = "public, max-age=2592000"
    return response
