# backend/app/routes/tier_lists.py
from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

from app.core.http_cache import cache_catalog
from app.core.security import admin_required
from app.schemas.tier_list import TierListAdminCreate
from app.services import tier_list_service
from app.services.admin_control_service import log_admin_action
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


@tier_lists_bp.route("", methods=["POST"])
@tier_lists_bp.route("/", methods=["POST"])
@admin_required
def create_tier_list():
    """Admin-authored official list: the "Official?" checkbox in the creator
    posts here instead of saving to this browser's localStorage. `kind` is
    always `'custom'` -- a hand-picked ladder and item set, not one of the
    five catalog-backed templates -- and the list is live for every visitor
    the moment this returns, not just this admin.
    """
    body = request.get_json(silent=True) or {}
    try:
        payload = TierListAdminCreate(**body)
    except ValidationError as err:
        return jsonify({"error": "Invalid tier list", "details": err.errors()}), 400

    try:
        row = tier_list_service.create_tier_list(
            title=payload.title,
            description=payload.description,
            cover_image_url=payload.cover_image_url,
            tiers=[t.model_dump(exclude_none=True) for t in payload.tiers],
            custom_items=[i.model_dump(exclude_none=True) for i in payload.items],
        )
    except ValueError as err:
        return jsonify({"error": str(err)}), 400

    log_admin_action(
        g.current_user.id,
        "tier_list.create",
        target_type="tier_list",
        target_id=row.id,
        details={"slug": row.slug, "title": row.title, "item_count": row.item_count()},
    )
    return jsonify({"status": "success", "data": row.to_dict()}), 201
