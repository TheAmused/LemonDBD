import threading
from pathlib import Path
from flask import Blueprint, current_app, jsonify, request, send_from_directory
from app.services.perk_service import PerkService
from app.services.scraper_service import ScraperService

perks_bp = Blueprint("perks", __name__)
perk_service = PerkService()


@perks_bp.route("/api/v1/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "dbd-backend-api"}), 200


@perks_bp.route("/api/v1/perks", methods=["GET"])
def list_perks():
    category = request.args.get("category")
    character = request.args.get("character")
    search = request.args.get("search")
    sort_by = request.args.get("sort_by", default="name", type=str)
    order = request.args.get("order", default="asc", type=str)
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=50, type=int)

    result = perk_service.get_perks(
        category=category,
        character=character,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit,
    )
    return jsonify(result), 200


@perks_bp.route("/api/v1/perks/<string:identifier>", methods=["GET"])
def get_perk(identifier: str):
    perk = perk_service.get_by_identifier(identifier)
    if not perk:
        return jsonify({"error": "Perk not found", "status": 404}), 404
    return jsonify({"data": perk}), 200


@perks_bp.route("/api/v1/characters", methods=["GET"])
def list_characters():
    category = request.args.get("category")
    characters = perk_service.get_characters(category)
    return jsonify({"count": len(characters), "data": characters}), 200


@perks_bp.route("/api/v1/survivors", methods=["GET"])
def list_survivors():
    survivors = perk_service.get_characters("Survivor")
    return jsonify({"count": len(survivors), "data": survivors}), 200


@perks_bp.route("/api/v1/killers", methods=["GET"])
def list_killers():
    killers = perk_service.get_characters("Killer")
    return jsonify({"count": len(killers), "data": killers}), 200


def _run_background_scrape():
    scraper = ScraperService()
    scraper.run_sync_pipeline()
    perk_service.reload_data()


@perks_bp.route("/api/v1/scrape", methods=["POST"])
def trigger_scrape():
    status = ScraperService.get_status()
    if status["is_running"]:
        return jsonify({"message": "Scrape task in progress", "status": status}), 409

    thread = threading.Thread(target=_run_background_scrape, daemon=True)
    thread.start()
    return jsonify({"message": "Scrape task initiated in background"}), 202


@perks_bp.route("/api/v1/scrape/status", methods=["GET"])
def get_scrape_status():
    return jsonify(ScraperService.get_status()), 200


@perks_bp.route("/static/<path:filename>", methods=["GET"])
def serve_static_asset(filename: str):
    static_folder = Path(current_app.root_path) / "static"
    response = send_from_directory(static_folder, filename)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Cache-Control"] = "public, max-age=86400"
    return response