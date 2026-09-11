# backend/app/routes/perks.py
import logging
import threading
from dataclasses import asdict
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, send_from_directory

from app.core.extensions import db
from app.core.security import admin_required, get_current_user
from app.models.minigames import ScraperSetting
from app.seeds.static_db_seeder import seed_from_static_json
from app.services.perk_service import PerkService
from app.services.translations import TranslationService
from app.utils.lang import extract_lang as _extract_lang
from sqlalchemy import select

logger = logging.getLogger(__name__)
perks_bp = Blueprint("perks", __name__)
perk_service = PerkService()


def _extract_optional_user_id() -> int | None:
    """Helper to retrieve user ID from explicit query parameter or authenticated JWT context."""
    user_id_param = request.args.get("user_id", type=int)
    if user_id_param:
        return user_id_param

    user = get_current_user()
    if user:
        return user.id

    return None


@perks_bp.route("/api/v1/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "dbd-backend-api"}), 200


@perks_bp.route("/api/v1/perks", methods=["GET"])
def list_perks():
    """Retrieve perks with filtering, sorting, pagination, and ownership status."""
    category = request.args.get("category")
    character = request.args.get("character")
    scope = request.args.get("scope")
    search = request.args.get("search")
    sort_by = request.args.get("sort_by", default="name", type=str)
    order = request.args.get("order", default="asc", type=str)
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=50, type=int)
    lang = _extract_lang()

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
        lang=lang,
    )
    return jsonify(result), 200


@perks_bp.route("/api/v1/perks/suggestions", methods=["GET"])
def get_perk_suggestions():
    q = request.args.get("q", default="", type=str)
    category = request.args.get("category")
    limit = request.args.get("limit", default=10, type=int)
    lang = _extract_lang()
    suggestions = perk_service.get_perk_suggestions(query=q, category=category, limit=limit, lang=lang)
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
    lang = _extract_lang()
    perk = perk_service.get_by_identifier(identifier, lang=lang)
    if not perk:
        return jsonify({"error": "Perk not found", "status": 404}), 404
    return jsonify({"data": perk}), 200


@perks_bp.route("/api/v1/characters", methods=["GET"])
def list_characters():
    category = request.args.get("category")
    lang = _extract_lang()
    characters = perk_service.get_characters(category, lang=lang)
    return jsonify({"count": len(characters), "data": characters}), 200


@perks_bp.route("/api/v1/chapters", methods=["GET"])
def list_chapters():
    """Retrieve all chapter/DLC banner images for client-side name matching."""
    from app.core.extensions import db
    from app.models import Chapter
    from sqlalchemy import select

    rows = db.session.scalars(select(Chapter)).all()
    return jsonify({"chapters": [r.to_dict() for r in rows]}), 200


@perks_bp.route("/api/v1/stats/summary", methods=["GET"])
def stats_summary():
    """Lightweight counts for the sidebar "vault stats" card.

    Every frontend page used to render those four numbers by fetching
    ``/api/v1/perks?limit=1000`` and counting categories in JavaScript -- the
    entire perk table, serialized and shipped to the browser on every single
    navigation, to display three integers. This does the same work as a few
    grouped COUNT(*) queries and returns a payload of about 100 bytes.
    """
    from sqlalchemy import func, select

    from app.core.extensions import db
    from app.models import Character, Perk

    perk_rows = db.session.execute(
        select(Perk.category, func.count(Perk.id)).group_by(Perk.category)
    ).all()
    character_rows = db.session.execute(
        select(Character.role, func.count(Character.id)).group_by(Character.role)
    ).all()

    def _pick(rows, wanted: str) -> int:
        for key, count in rows:
            if (key or "").lower() == wanted:
                return int(count)
        return 0

    return (
        jsonify(
            {
                "perks": {
                    "total": sum(int(count) for _, count in perk_rows),
                    "survivor": _pick(perk_rows, "survivor"),
                    "killer": _pick(perk_rows, "killer"),
                },
                "characters": {
                    "total": sum(int(count) for _, count in character_rows),
                    "survivor": _pick(character_rows, "survivor"),
                    "killer": _pick(character_rows, "killer"),
                },
            }
        ),
        200,
    )


@perks_bp.route("/api/v1/characters/<string:character_name>/detail", methods=["GET"])
def get_character_detail(character_name: str):
    lang = _extract_lang()
    detail = perk_service.get_character_detail(character_name, lang=lang)
    if not detail:
        return jsonify({"error": "Character not found", "status": 404}), 404
    return jsonify({"data": detail}), 200


@perks_bp.route("/api/v1/challenge-modes", methods=["GET"])
def list_challenge_modes_public():
    from app.services.admin_control_service import get_challenge_mode_settings
    return jsonify({"modes": get_challenge_mode_settings()}), 200


@perks_bp.route("/api/v1/survivors", methods=["GET"])
def list_survivors():
    lang = _extract_lang()
    survivors = perk_service.get_characters("Survivor", lang=lang)
    return jsonify({"count": len(survivors), "data": survivors}), 200


@perks_bp.route("/api/v1/killers", methods=["GET"])
def list_killers():
    lang = _extract_lang()
    killers = perk_service.get_characters("Killer", lang=lang)
    return jsonify({"count": len(killers), "data": killers}), 200


@perks_bp.route("/api/v1/items", methods=["GET"])
def list_items():
    category = request.args.get("category")
    search = request.args.get("search")
    lang = _extract_lang()
    items = perk_service.get_items(category=category, search=search, lang=lang)
    return jsonify({"count": len(items), "data": items}), 200


@perks_bp.route("/api/v1/addons", methods=["GET"])
def list_addons():
    category = request.args.get("category")
    target = request.args.get("target") or request.args.get("associated_target")
    search = request.args.get("search")
    lang = _extract_lang()
    addons = perk_service.get_addons(category=category, target=target, search=search, lang=lang)
    return jsonify({"count": len(addons), "data": addons}), 200


def _run_background_scrape(app, override_source=None, override_fallback=None):
    with app.app_context():
        seed_from_static_json(force=True)
        perk_service.reload_data()


@perks_bp.route("/api/scrape-and-seed", methods=["POST"])
@perks_bp.route("/api/v1/scrape-and-seed", methods=["POST"])
@admin_required
def scrape_and_seed():
    """Trigger synchronous database seed/update from offline static JSON (Admin only)."""
    try:
        res = seed_from_static_json(force=True)
        perk_service.reload_data()
        summary = res.get("initial_seed") or {}
        return jsonify({
            "status": "success",
            "characters_synced": summary.get("characters", {}).get("created", 0) + summary.get("characters", {}).get("updated", 0),
            "perks_synced": summary.get("perks", {}).get("created", 0) + summary.get("perks", {}).get("updated", 0),
            "items_synced": summary.get("items", {}).get("created", 0) + summary.get("items", {}).get("updated", 0),
            "addons_synced": summary.get("addons", {}).get("created", 0) + summary.get("addons", {}).get("updated", 0),
            "metrics": summary,
        }), 200
    except Exception as e:
        logger.error(f"Seeder execution error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@perks_bp.route("/api/v1/scrape", methods=["POST"])
@admin_required
def trigger_scrape():
    """Trigger asynchronous background seeding task from static JSON (Admin only)."""
    thread = threading.Thread(
        target=_run_background_scrape,
        args=(current_app._get_current_object(),),
        daemon=True,
    )
    thread.start()
    return jsonify({"message": "Seed task initiated in background"}), 202


@perks_bp.route("/api/v1/scrape/status", methods=["GET"])
def get_scrape_status():
    return jsonify({
        "is_running": False,
        "current_step": "idle",
        "progress": 100,
        "total": 100,
        "status": "completed",
        "last_used_source": "offline_static_json",
    }), 200


@perks_bp.route("/api/v1/scrape/config", methods=["GET"])
@admin_required
def get_scrape_config():
    setting = db.session.scalar(select(ScraperSetting).order_by(ScraperSetting.id.desc()))
    if not setting:
        return jsonify({"source": "offline_static_json", "fallback_to_wiki": False}), 200
    return jsonify(setting.to_dict()), 200


@perks_bp.route("/api/v1/scrape/config", methods=["POST"])
@admin_required
def update_scrape_config():
    data = request.get_json(silent=True) or {}
    setting = db.session.scalar(select(ScraperSetting).order_by(ScraperSetting.id.desc()))
    if not setting:
        setting = ScraperSetting(
            source=data.get("source", "offline_static_json"),
            fallback_to_wiki=bool(data.get("fallback_to_wiki", False)),
        )
        db.session.add(setting)
    else:
        if "source" in data:
            setting.source = data["source"]
        if "fallback_to_wiki" in data:
            setting.fallback_to_wiki = bool(data["fallback_to_wiki"])
    db.session.commit()
    return jsonify({"message": "Configuration updated successfully", "config": setting.to_dict()}), 200


@perks_bp.route("/api/v1/scrape/translations/game-dumps", methods=["POST"])
@admin_required
def sync_game_dump_translations_route():
    """Synchronize official translations (EN, PL, DE, ES, JA) to the database (Admin only)."""
    try:
        data = request.get_json(silent=True) or {}
        locales = data.get("locales") or ["en", "pl", "de", "es", "ja"]
        trans_service = TranslationService()
        result = trans_service.sync_all_locales_to_db(locales=locales)
        return jsonify({
            "status": "success",
            "message": "Game dump translations successfully synchronized to database",
            "result": result,
        }), 200
    except Exception as e:
        logger.error(f"Error syncing game dump translations: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@perks_bp.route("/static/<path:filename>", methods=["GET"])
def serve_static_asset(filename: str):
    """Serve cached static game assets."""
    static_folder = Path(current_app.root_path) / "static"
    response = send_from_directory(static_folder, filename)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Cache-Control"] = "public, max-age=86400"
    return response
