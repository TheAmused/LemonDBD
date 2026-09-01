# backend/app/routes/maps.py
from flask import Blueprint, jsonify, request
from app.services.map_service import MapService
from app.utils.lang import extract_lang

maps_bp = Blueprint("maps", __name__, url_prefix="/api/v1/maps")
service = MapService()


@maps_bp.route("/realms", methods=["GET"])
def get_realms():
    """Retrieve all realm banner images for client-side name matching."""
    realms = service.get_realms(lang=extract_lang())
    return jsonify({"realms": realms}), 200


@maps_bp.route("", methods=["GET"])
@maps_bp.route("/", methods=["GET"])
def get_maps():
    """Retrieve all available map realms with optional query filtering."""
    realm = request.args.get("realm")
    search = request.args.get("search")
    source = request.args.get("source")

    maps = service.get_maps(realm=realm, search=search, source=source, lang=extract_lang())
    return jsonify({"maps": maps}), 200


@maps_bp.route("/<string:map_id>", methods=["GET"])
def get_map_detail(map_id: str):
    """Retrieve structured layout and landmark coordinates for a specific map."""
    seed = request.args.get("seed") or "seed_a"
    floor = request.args.get("floor", default=1, type=int)

    if floor is None or floor < 1:
        floor = 1

    map_detail = service.get_map_by_id(map_id, seed_variant=seed, floor=floor, lang=extract_lang())
    if not map_detail:
        return jsonify({"error": f"Map '{map_id}' not found", "status": 404}), 404

    return jsonify({"map": map_detail}), 200
