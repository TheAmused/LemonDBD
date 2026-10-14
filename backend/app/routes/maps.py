# backend/app/routes/maps.py
from flask import Blueprint, jsonify, request

from app.core.http_cache import cache_catalog
from app.services.map_service import MapService
from app.utils.lang import extract_lang
from app.utils.pagination import paginate_args
from app.utils.thumbnails import serve_thumb

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
@cache_catalog(ttl=3600, vary=("realm", "search", "source", "lang", "page", "per_page"))
def get_maps():
    """Retrieve all available map realms with optional query filtering and pagination."""
    realm = request.args.get("realm")
    search = request.args.get("search")
    source = request.args.get("source")

    page, per_page = paginate_args(default_per_page=100, max_per_page=500)
    maps = service.get_maps(realm=realm, search=search, source=source, lang=extract_lang())
    if request.args.get("page") or request.args.get("per_page"):
        start = (page - 1) * per_page
        end = start + per_page
        return jsonify({"maps": maps[start:end], "total": len(maps), "page": page, "per_page": per_page}), 200
    return jsonify({"maps": maps}), 200


THUMB_WIDTH = 320


@maps_bp.route("/thumb/<path:rel>", methods=["GET"])
def get_map_thumb(rel: str):
    """A small WebP copy of a map callout image (cached on disk after the first request).

    The source callouts are ~2000x2200 px; a tier list tile shows them at ~100 px,
    and decoding dozens of full-size bitmaps is what made that page lag.
    """
    return serve_thumb("maps", rel, THUMB_WIDTH)
