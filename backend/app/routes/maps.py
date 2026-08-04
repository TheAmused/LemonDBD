from flask import Blueprint, jsonify, request
from app.services.map_service import MapService

maps_bp = Blueprint("maps", __name__, url_prefix="/api/v1/maps")
service = MapService()

@maps_bp.route("", methods=["GET"])
@maps_bp.route("/", methods=["GET"])
def get_maps():
    realm = request.args.get("realm")
    search = request.args.get("search")
    maps = service.get_maps(realm=realm, search=search)
    return jsonify({"maps": maps})

@maps_bp.route("/<map_id>", methods=["GET"])
def get_map_detail(map_id):
    seed = request.args.get("seed") or "seed_a"
    floor = request.args.get("floor", 1, type=int)
    if floor is None:
        floor = 1
    map_detail = service.get_map_by_id(map_id, seed_variant=seed, floor=floor)
    if not map_detail:
        return jsonify({"error": "Map not found"}), 404
    return jsonify({"map": map_detail})
