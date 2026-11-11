# backend/app/routes/tier_lists.py
import logging
from pathlib import Path
from typing import Any

from flask import Blueprint, current_app, g, jsonify, request
from pydantic import ValidationError

from app.core.http_cache import cache_catalog
from app.core.security import admin_required, get_current_user
from app.schemas.tier_list import TierListAdminCreate, TierListAdminUpdate
from app.services import tier_list_service
from app.services.admin_control_service import log_admin_action
from app.services.community_media import ingest_community_image
from app.utils.lang import extract_lang
from app.utils.thumbnails import warm_all_thumbs_async

logger = logging.getLogger(__name__)

tier_lists_bp = Blueprint("tier_lists", __name__, url_prefix="/api/v1/tier-lists")


def _cover_rejected(body: dict, cleaned: str | None) -> bool:
    """True when a non-empty cover URL was sent but failed `clean_image_url`.
    (An explicit empty string or null still means "remove the cover".)"""
    raw = body.get("cover_image_url")
    return isinstance(raw, str) and bool(raw.strip()) and cleaned is None


def _is_ingested_community_url(original: str, normalized: str) -> bool:
    return original.strip().startswith("data:") and normalized.startswith("/static/uploads/community/")


def _ingest_custom_items(items: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], bool]:
    ingested = False
    for item in items:
        orig_url = item.get("image_url")
        if isinstance(orig_url, str) and orig_url.strip():
            normalized = ingest_community_image(orig_url, max_side=512)
            if normalized is None:
                item.pop("image_url", None)
            else:
                item["image_url"] = normalized
                if _is_ingested_community_url(orig_url, normalized):
                    ingested = True
    return items, ingested


def _warm_community_thumbs() -> None:
    try:
        static_root = Path(current_app.static_folder) if current_app.static_folder else None
        warm_all_thumbs_async(static_root)
    except Exception:
        logger.warning("Failed to trigger thumbnail warming after tier list ingest", exc_info=True)


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

    ingested = False
    cover_image_url = payload.cover_image_url
    if cover_image_url:
        normalized_cover = ingest_community_image(cover_image_url, max_side=800)
        if normalized_cover is None:
            return jsonify({"error": "Invalid cover image URL", "status": 400}), 400
        if _is_ingested_community_url(cover_image_url, normalized_cover):
            ingested = True
        cover_image_url = normalized_cover

    custom_items, items_ingested = _ingest_custom_items(
        [i.model_dump(exclude_none=True) for i in payload.items]
    )
    ingested = ingested or items_ingested

    try:
        row = tier_list_service.create_tier_list(
            title=payload.title,
            description=payload.description,
            cover_image_url=cover_image_url,
            tiers=[t.model_dump(exclude_none=True) for t in payload.tiers],
            custom_items=custom_items,
            is_nsfw=payload.is_nsfw,
            is_active=payload.is_active,
        )
    except ValueError as err:
        return jsonify({"error": str(err)}), 400

    if ingested:
        _warm_community_thumbs()

    log_admin_action(
        g.current_user.id,
        "tier_list.create",
        target_type="tier_list",
        target_id=row.id,
        details={"slug": row.slug, "title": row.title, "item_count": row.item_count()},
    )
    return jsonify({"status": "success", "data": row.to_dict(extract_lang())}), 201


def _update_kwargs(payload: TierListAdminUpdate) -> dict[str, object]:
    """The fields this PATCH actually sent, in the service's argument names.

    An omitted field is left alone; most fields also ignore an explicit null, but
    `cover_image_url` and `default_placements` accept null to clear them."""
    fields_set = payload.model_fields_set
    kwargs: dict[str, object] = {}
    for name in ("title", "description", "is_nsfw", "is_active"):
        value = getattr(payload, name)
        if name in fields_set and value is not None:
            kwargs[name] = value
    for name in ("cover_image_url", "default_placements"):
        if name in fields_set:
            kwargs[name] = getattr(payload, name)
    if "tiers" in fields_set and payload.tiers is not None:
        kwargs["tiers"] = [t.model_dump(exclude_none=True) for t in payload.tiers]
    if "items" in fields_set and payload.items is not None:
        kwargs["custom_items"] = [i.model_dump(exclude_none=True) for i in payload.items]
    return kwargs


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
    kwargs = _update_kwargs(payload)
    ingested = False
    if "cover_image_url" in fields_set and kwargs.get("cover_image_url"):
        orig_cover = str(kwargs["cover_image_url"])
        normalized_cover = ingest_community_image(orig_cover, max_side=800)
        if normalized_cover is None:
            return jsonify({"error": "Invalid cover image URL", "status": 400}), 400
        if _is_ingested_community_url(orig_cover, normalized_cover):
            ingested = True
        kwargs["cover_image_url"] = normalized_cover
    if "custom_items" in kwargs and isinstance(kwargs["custom_items"], list):
        kwargs["custom_items"], items_ingested = _ingest_custom_items(kwargs["custom_items"])
        ingested = ingested or items_ingested

    try:
        row = tier_list_service.update_tier_list(slug, **kwargs)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400

    if row is None:
        return jsonify({"error": "Tier list not found", "status": 404}), 404

    if ingested:
        _warm_community_thumbs()

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


