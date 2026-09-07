# backend/app/routes/generator.py
from flask import Blueprint, jsonify, request
from app.core.service_registry import make_service_getter
from app.services.generator_service import GeneratorService

generator_bp = Blueprint("generator", __name__, url_prefix="/api/v1/generator")
get_generator_service = make_service_getter("GENERATOR_SERVICE", GeneratorService)


@generator_bp.route("/config", methods=["GET", "POST"])
def handle_config():
    service = get_generator_service()
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        config = service.update_config(data)
        return jsonify({"config": config}), 200
    config = service.get_config()
    return jsonify({"config": config}), 200


@generator_bp.route("/drawn", methods=["GET"])
def get_drawn():
    service = get_generator_service()
    role = request.args.get("role", "Survivor")
    drawn = service.get_drawn_perks(role)
    return jsonify({"drawn_perks": drawn}), 200


@generator_bp.route("/draw", methods=["POST"])
def add_drawn():
    service = get_generator_service()
    data = request.get_json(silent=True) or {}
    role = data.get("role", "Survivor")
    perks = data.get("perks", [])
    drawn = service.add_drawn_perks(role, perks)
    return jsonify({"drawn_perks": drawn}), 200


@generator_bp.route("/reset", methods=["POST"])
def reset_drawn():
    service = get_generator_service()
    data = request.get_json(silent=True) or {}
    role = data.get("role")
    drawn = service.reset_drawn_perks(role)
    return jsonify({"drawn_perks": drawn}), 200
