import logging
import threading
from dataclasses import asdict
from pathlib import Path
from typing import Optional
from flask import Blueprint, current_app, jsonify, request, send_from_directory, g
from app.services.perk_service import PerkService
from app.services.scraper_service import ScraperService

logger = logging.getLogger(__name__)
perks_bp = Blueprint("perks", __name__)
perk_service = PerkService()


def _extract_optional_user_id() -> Optional[int]:
    user_id_param = request.args.get("user_id", type=int)
    if user_id_param:
        return user_id_param

    curr = getattr(g, "current_user", None)
    if curr and hasattr(curr, "id"):
        return curr.id

    return None


@perks_bp.route("/api/v1/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "dbd-backend-api"}), 200


@perks_bp.route("/api/v1/perks", methods=["GET"])
def list_perks():
    category = request.args.get("category")
    character = request.args.get("character")
    scope = request.args.get("scope")
    search = request.args.get("search")
    sort_by = request.args.get("sort_by", default="name", type=str)
    order = request.args.get("order", default="asc", type=str)
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=50, type=int)

    owned_only_param = request.args.get("owned_only", "false").lower()
    owned_only = owned_only_param in ["true", "1", "yes"]

    user_id = _extract_optional_user_id()

    result = perk_service.get_perks(
        category=category,
        character=character,
        scope=scope,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit,
        user_id=user_id,
        owned_only=owned_only,
    )
    return jsonify(result), 200


@perks_bp.route("/api/v1/perks/suggestions", methods=["GET"])
def get_perk_suggestions():
    q = request.args.get("q", default="", type=str)
    category = request.args.get("category")
    limit = request.args.get("limit", default=10, type=int)
    suggestions = perk_service.get_perk_suggestions(query=q, category=category, limit=limit)
    return jsonify({"data": suggestions, "count": len(suggestions)}), 200


@perks_bp.route("/api/v1/characters/suggestions", methods=["GET"])
def get_character_suggestions():
    q = request.args.get("q", default="", type=str)
    category = request.args.get("category")
    limit = request.args.get("limit", default=15, type=int)
    suggestions = perk_service.get_character_suggestions(query=q, category=category, limit=limit)
    return jsonify({"data": suggestions, "count": len(suggestions)}), 200


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


@perks_bp.route("/api/v1/characters/<string:character_name>/detail", methods=["GET"])
def get_character_detail(character_name: str):
    detail = perk_service.get_character_detail(character_name)
    if not detail:
        return jsonify({"error": "Character not found", "status": 404}), 404
    return jsonify({"data": detail}), 200


@perks_bp.route("/api/v1/survivors", methods=["GET"])
def list_survivors():
    survivors = perk_service.get_characters("Survivor")
    return jsonify({"count": len(survivors), "data": survivors}), 200


@perks_bp.route("/api/v1/killers", methods=["GET"])
def list_killers():
    killers = perk_service.get_characters("Killer")
    return jsonify({"count": len(killers), "data": killers}), 200


@perks_bp.route("/api/v1/items", methods=["GET"])
def list_items():
    category = request.args.get("category")
    search = request.args.get("search")
    items = perk_service.get_items(category=category, search=search)
    return jsonify({"count": len(items), "data": items}), 200


@perks_bp.route("/api/v1/addons", methods=["GET"])
def list_addons():
    category = request.args.get("category")
    target = request.args.get("target") or request.args.get("associated_target")
    search = request.args.get("search")
    addons = perk_service.get_addons(category=category, target=target, search=search)
    return jsonify({"count": len(addons), "data": addons}), 200


def _run_background_scrape(app, override_source=None, override_fallback=None):
    with app.app_context():
        scraper = ScraperService()
        scraper.run_sync_pipeline(override_source=override_source, override_fallback=override_fallback)
        perk_service.reload_data()


@perks_bp.route("/api/scrape-and-seed", methods=["POST"])
@perks_bp.route("/api/v1/scrape-and-seed", methods=["POST"])
def scrape_and_seed():
    data = request.get_json(silent=True) or {}
    source = data.get("source")
    fallback = data.get("fallback")
    if fallback is None:
        fallback = data.get("fallback_to_wiki")

    scraper = ScraperService()
    try:
        stats = scraper.run_sync_pipeline(override_source=source, override_fallback=fallback)
        perk_service.reload_data()
        return jsonify({
            "status": "success",
            "characters_synced": stats.get("characters_synced", stats.get("total_characters", 0)),
            "perks_synced": stats.get("perks_synced", stats.get("total_perks", 0)),
            "items_synced": stats.get("items_synced", stats.get("total_items", 0)),
            "addons_synced": stats.get("addons_synced", stats.get("total_addons", 0)),
            "metrics": stats,
        }), 200
    except Exception as e:
        logger.error(f"Scrape-and-seed pipeline error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@perks_bp.route("/api/v1/scrape", methods=["POST"])
def trigger_scrape():
    status = ScraperService.get_status()
    if status["is_running"]:
        return jsonify({"message": "Scrape task in progress", "status": status}), 409

    data = request.get_json(silent=True) or {}
    source = data.get("source")
    fallback = data.get("fallback")
    if fallback is None:
        fallback = data.get("fallback_to_wiki")

    thread = threading.Thread(
        target=_run_background_scrape,
        args=(current_app._get_current_object(),),
        kwargs={"override_source": source, "override_fallback": fallback},
        daemon=True,
    )
    thread.start()
    return jsonify({"message": "Scrape task initiated in background"}), 202


@perks_bp.route("/api/v1/scrape/status", methods=["GET"])
def get_scrape_status():
    return jsonify(ScraperService.get_status()), 200


@perks_bp.route("/api/v1/scrape/config", methods=["GET"])
def get_scrape_config():
    scraper = ScraperService()
    return jsonify(asdict(scraper.load_config())), 200


@perks_bp.route("/api/v1/scrape/config", methods=["POST"])
def update_scrape_config():
    data = request.get_json(silent=True) or {}
    scraper = ScraperService()
    updated = scraper.save_config(data)
    return jsonify({"message": "Configuration updated", "config": asdict(updated)}), 200


@perks_bp.route("/static/<path:filename>", methods=["GET"])
def serve_static_asset(filename: str):
    static_folder = Path(current_app.root_path) / "static"
    response = send_from_directory(static_folder, filename)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Cache-Control"] = "public, max-age=86400"
    return response