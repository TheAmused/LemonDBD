# backend/app/routes/tier_lists.py
from flask import Blueprint, jsonify

from app.core.http_cache import cache_catalog
from app.services import tier_list_service
from app.utils.lang import extract_lang

tier_lists_bp = Blueprint("tier_lists", __name__, url_prefix="/api/v1/tier-lists")


@tier_lists_bp.route("", methods=["GET"])
@tier_lists_bp.route("/", methods=["GET"])
@cache_catalog(ttl=86400, vary=("lang",))
def list_tier_lists():
    """Summaries of every active official tier list, for the /tier-lists hub.

    Seed content only, so it shares the catalog generation: a re-seed bumps the
    ETag and every browser's copy goes stale at once.
    """
    data = tier_list_service.list_tier_lists(lang=extract_lang())
    return jsonify({"count": len(data), "data": data}), 200


@tier_lists_bp.route("/<string:slug>", methods=["GET"])
@cache_catalog(ttl=86400, vary=("lang",))
def get_tier_list(slug: str):
    """One official tier list template, including its items and default ranking."""
    data = tier_list_service.get_tier_list(slug, lang=extract_lang())
    if data is None:
        return jsonify({"error": "Tier list not found", "status": 404}), 404
    return jsonify({"data": data}), 200
