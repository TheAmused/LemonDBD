from flask import Blueprint, current_app, jsonify, request
from app.services.page_streak_service import PageStreakService

page_streak_bp = Blueprint("page_streak", __name__, url_prefix="/api/v1/page-streak")
_default_service = None


def get_page_streak_service() -> PageStreakService:
    if current_app and current_app.config.get("PAGE_STREAK_SERVICE"):
        return current_app.config["PAGE_STREAK_SERVICE"]
    global _default_service
    if _default_service is None:
        _default_service = PageStreakService()
    return _default_service


@page_streak_bp.route("/roster", methods=["GET"])
def get_roster():
    service = get_page_streak_service()
    roster = service.get_roster()
    return jsonify({"count": len(roster), "data": roster}), 200


@page_streak_bp.route("/excluded-perks", methods=["GET"])
def get_excluded_perks():
    service = get_page_streak_service()
    pages = service.build_pages()
    return jsonify({
        "excluded": service.get_excluded_perks(),
        "pool": [
            {"name": p["name"], "character": p.get("character"), "icon_local_path": p.get("icon_local_path")}
            for p in service.get_pool()
        ],
        "pool_size": sum(len(page) for page in pages),
        "page_count": len(pages),
        "perks_per_page": service.get_perks_per_page(),
    }), 200


@page_streak_bp.route("/excluded-perks", methods=["PUT"])
def put_excluded_perks():
    service = get_page_streak_service()
    payload = request.get_json(silent=True) or {}
    excluded = payload.get("excluded")
    if not isinstance(excluded, list):
        return jsonify({"error": "Body must contain an 'excluded' array"}), 400
    return jsonify(service.set_excluded_perks(excluded)), 200


@page_streak_bp.route("/run", methods=["GET"])
def get_run():
    service = get_page_streak_service()
    killer = request.args.get("killer")
    if not killer:
        return jsonify({"error": "Query parameter 'killer' is required"}), 400
    return jsonify({"run": service.get_run(killer)}), 200


@page_streak_bp.route("/run/start", methods=["POST"])
def start_run():
    service = get_page_streak_service()
    payload = request.get_json(silent=True) or {}
    killer = payload.get("killer")
    if not killer:
        return jsonify({"error": "Field 'killer' is required"}), 400
    try:
        run = service.start_run(killer)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    return jsonify({"run": run}), 201


@page_streak_bp.route("/run/result", methods=["POST"])
def submit_result():
    service = get_page_streak_service()
    payload = request.get_json(silent=True) or {}
    killer = payload.get("killer")
    page = payload.get("page")
    perks = payload.get("perks")
    result = payload.get("result")
    if not killer or not isinstance(page, int) or not isinstance(perks, list) or not result:
        return jsonify({"error": "Fields 'killer', 'page', 'perks' and 'result' are required"}), 400
    try:
        run = service.submit_result(killer, page, perks, result)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    return jsonify({"run": run}), 200


@page_streak_bp.route("/run/reset", methods=["POST"])
def reset_run():
    service = get_page_streak_service()
    payload = request.get_json(silent=True) or {}
    killer = payload.get("killer")
    if not killer:
        return jsonify({"error": "Field 'killer' is required"}), 400
    try:
        run = service.reset_run(killer)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    return jsonify({"run": run}), 200
