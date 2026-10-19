# backend/app/routes/tier_lists.py
from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

from app.core.http_cache import cache_catalog
from app.core.security import admin_required, get_current_user
from app.schemas.tier_list import TierListAdminCreate, TierListAdminUpdate
from app.services import tier_list_service
from app.services.admin_control_service import log_admin_action
from app.utils.lang import extract_lang

tier_lists_bp = Blueprint("tier_lists", __name__, url_prefix="/api/v1/tier-lists")


def _cover_rejected(body: dict, cleaned: str | None) -> bool:
    """True when a non-empty cover URL was sent but failed `clean_image_url`.
    (An explicit empty string or null still means "remove the cover".)"""
    raw = body.get("cover_image_url")
    return isinstance(raw, str) and bool(raw.strip()) and cleaned is None


@tier_lists_bp.route("", methods=["GET"])
@tier_lists_bp.route("/", methods=["GET"])
@cache_catalog(ttl=86400, vary=())
def list_tier_lists():
    """Summaries of every active official tier list, for the /tier-lists hub.

    Seed content only, so it shares the catalog generation: a re-seed bumps the
    ETag and every browser's copy goes stale at once. Admins also see drafts.
    """
    user = get_current_user()
    is_admin = bool(user and getattr(user, "role", None) == "admin")
    data = tier_list_service.list_tier_lists(lang=extract_lang(), include_inactive=is_admin)
    return jsonify({"count": len(data), "data": data}), 200


@tier_lists_bp.route("/<string:slug>", methods=["GET"])
@cache_catalog(ttl=86400, vary=())
def get_tier_list(slug: str):
    """One official tier list template, including its items and default ranking."""
    user = get_current_user()
    is_admin = bool(user and getattr(user, "role", None) == "admin")
    data = tier_list_service.get_tier_list(slug, lang=extract_lang(), include_inactive=is_admin)
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
    if _cover_rejected(body, payload.cover_image_url):
        return jsonify({"error": "Invalid cover image URL", "status": 400}), 400

    try:
        row = tier_list_service.create_tier_list(
            title=payload.title,
            description=payload.description,
            cover_image_url=payload.cover_image_url,
            tiers=[t.model_dump(exclude_none=True) for t in payload.tiers],
            custom_items=[i.model_dump(exclude_none=True) for i in payload.items],
            is_nsfw=payload.is_nsfw,
            is_active=payload.is_active,
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
    return jsonify({"status": "success", "data": row.to_dict(extract_lang())}), 201


@tier_lists_bp.route("/<string:slug>", methods=["PUT", "PATCH"])
@admin_required
def update_tier_list(slug: str):
    """Admin-only update of an official tier list's tiers, default placements,
    or custom metadata in the database.
    """
    body = request.get_json(silent=True) or {}
    try:
        payload = TierListAdminUpdate(**body)
    except ValidationError as err:
        return jsonify({"error": "Invalid tier list", "details": err.errors()}), 400
    # Without this an unusable URL would be cleaned to None and, being "set",
    # silently CLEAR the list's existing cover.
    if _cover_rejected(body, payload.cover_image_url):
        return jsonify({"error": "Invalid cover image URL", "status": 400}), 400

    fields_set = payload.model_fields_set
    kwargs: dict[str, object] = {}
    if "title" in fields_set and payload.title is not None:
        kwargs["title"] = payload.title
    if "description" in fields_set and payload.description is not None:
        kwargs["description"] = payload.description
    if "cover_image_url" in fields_set:
        kwargs["cover_image_url"] = payload.cover_image_url
    if "tiers" in fields_set and payload.tiers is not None:
        kwargs["tiers"] = [t.model_dump(exclude_none=True) for t in payload.tiers]
    if "items" in fields_set and payload.items is not None:
        kwargs["custom_items"] = [i.model_dump(exclude_none=True) for i in payload.items]
    if "default_placements" in fields_set:
        kwargs["default_placements"] = payload.default_placements
    if "is_nsfw" in fields_set and payload.is_nsfw is not None:
        kwargs["is_nsfw"] = payload.is_nsfw
    if "is_active" in fields_set and payload.is_active is not None:
        kwargs["is_active"] = payload.is_active

    try:
        row = tier_list_service.update_tier_list(slug, **kwargs)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400

    if row is None:
        return jsonify({"error": "Tier list not found", "status": 404}), 404

    log_admin_action(
        g.current_user.id,
        "tier_list.update",
        target_type="tier_list",
        target_id=row.id,
        details={"slug": row.slug, "updated_fields": sorted(fields_set)},
    )
    return jsonify({"status": "success", "data": row.to_dict(extract_lang())}), 200


@tier_lists_bp.route("/<string:slug>", methods=["DELETE"])
@admin_required
def delete_tier_list(slug: str):
    """Deletes an official tier list."""
    row = tier_list_service.get_tier_list(slug, include_inactive=True)
    if row is None:
        return jsonify({"error": "Tier list not found", "status": 404}), 404

    target_id = row.get("id")
    deleted = tier_list_service.delete_tier_list(slug)
    if not deleted:
        return jsonify({"error": "Tier list not found", "status": 404}), 404

    log_admin_action(
        g.current_user.id,
        "tier_list.delete",
        target_type="tier_list",
        target_id=target_id,
        details={"slug": slug, "title": row.get("title")},
    )
    return jsonify({"status": "success", "message": "Tier list deleted"}), 200


