from flask import Blueprint, abort, jsonify, request
from sqlalchemy import select

from app.core.cache_params import norm_int, norm_lower
from app.core.extensions import db
from app.core.http_cache import cache_catalog
from app.models.map_layout import MapLayout
from app.schemas.map import MapLayoutDetailResponse
from app.services.map_service import MapService
from app.utils.lang import extract_lang
from app.utils.pagination import paginate_args
from app.utils.thumbnails import serve_thumb

maps_bp = Blueprint("maps", __name__, url_prefix="/api/v1/maps")
service = MapService()


MAPS_DEFAULT_PER_PAGE = 100
MAPS_MAX_PER_PAGE = 500
MAPS_MAX_PAGE = 10000


@maps_bp.route("/realms", methods=["GET"])
@cache_catalog(ttl=86400, vary=())
def get_realms():
    """Retrieve all realm banner images for client-side name matching."""
    realms = service.get_realms(lang=extract_lang())
    return jsonify({"realms": realms}), 200


@maps_bp.route("", methods=["GET"])
@maps_bp.route("/", methods=["GET"])
@cache_catalog(
    ttl=3600,
    vary={
        "realm": norm_lower(drop_all=True),
        "search": norm_lower(),
        "source": norm_lower(drop_all=True),
        # The response shape depends on whether either was sent at all.
        "page": norm_int(1, 1, MAPS_MAX_PAGE, clamp_high=False, absent_is_none=True),
        "per_page": norm_int(MAPS_DEFAULT_PER_PAGE, 1, MAPS_MAX_PER_PAGE, absent_is_none=True),
    },
)
def get_maps():
    """Retrieve all available map realms with optional query filtering and pagination."""
    realm = request.args.get("realm")
    search = request.args.get("search")
    source = request.args.get("source")

    page, per_page = paginate_args(default_per_page=MAPS_DEFAULT_PER_PAGE, max_per_page=MAPS_MAX_PER_PAGE)
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


@maps_bp.route("/<int:map_id>/layout", methods=["GET"])
def get_map_layout(map_id: int):
    """Fetch vector layout footprint for a single map on demand."""
    layout = db.session.scalar(select(MapLayout).where(MapLayout.map_id == map_id))
    if not layout:
        abort(404, description="Map layout not found")
    response_dto = MapLayoutDetailResponse(
        map_id=layout.map_id,
        version=layout.version,
        layout=layout.layout_data,
    )
    return jsonify(response_dto.model_dump()), 200

