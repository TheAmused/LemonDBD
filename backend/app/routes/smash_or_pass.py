# backend/app/routes/others/smash_or_pass.py
import logging
import threading
import time
from collections import defaultdict
from typing import Any
from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError
from sqlalchemy import select

from app.core.extensions import db
from app.core.limiter import get_client_ip
from app.core.security import admin_required, get_current_user
from app.models.smash_or_pass import Roster
from app.schemas.smash_or_pass import MAX_SMASH_KEY_LENGTH, SmashRosterAdminCreate, SmashSessionRequest
from app.services import site_settings
from app.services.admin_control_service import log_admin_action
from app.services.smash_or_pass_service import SmashOrPassService
from app.utils.lang import extract_lang as _extract_lang
from app.utils.pagination import paginate_args
from app.utils.responses import api_error

logger = logging.getLogger(__name__)

smash_or_pass_bp = Blueprint("smash_or_pass", __name__, url_prefix="/api/v1/smash-or-pass")
smash_service = SmashOrPassService()


from app.utils.rate_limit import SlidingWindowRateLimiter


vote_rate_limiter = SlidingWindowRateLimiter(max_requests=60, window_seconds=60)
taxonomy_rate_limiter = SlidingWindowRateLimiter(max_requests=20, window_seconds=60)
proxy_rate_limiter = SlidingWindowRateLimiter(max_requests=60, window_seconds=60)


def _resolve_vote_owner(current_user, requested_user_id: int | None):
    """The account whose votes a read may touch, or an error response.

    Votes on these rosters are personal (and the rosters can be adult-themed),
    so an explicit `user_id` is honoured only for an admin. A signed-in user
    always gets their own id; an anonymous caller gets None (their guest
    session is the only thing they can name) and a 401 if they try to name an
    account.
    """
    if current_user is None:
        if requested_user_id:
            return api_error("Authentication required to read another account's votes", 401)
        return None
    if requested_user_id and requested_user_id != current_user.id:
        if current_user.role != "admin":
            return api_error("Forbidden: Cannot view votes for another user", 403)
        return requested_user_id
    return current_user.id


@smash_or_pass_bp.route("/rosters", methods=["GET"])
def get_rosters():
    # Returns every roster, active or not (test_get_rosters locks this in); the
    # roster picker filters `is_active !== false` client-side
    # (RosterSelectModal.tsx) before a roster is selectable.
    """Retrieve all rosters (active and inactive) with real-time stats."""
    # NSFW-flagged rosters are excluded by default, matching the existing
    # optional-flag convention in this codebase (users.py's include_assets /
    # download query params: "true"/"1"/"yes" opt in). An explicit
    # ?include_nsfw=true is required to see them in this listing at all.
    include_nsfw = request.args.get("include_nsfw", "false").lower() in ("true", "1", "yes")
    lang = _extract_lang(request) or "en"
    try:
        rosters = smash_service.get_rosters(active_only=False, include_nsfw=include_nsfw, lang=lang)
        return jsonify({"data": rosters, "count": len(rosters)}), 200
    except Exception as e:
        logger.error(f"Error fetching smash-or-pass rosters: {e}")
        return api_error("Something went wrong. Please try again.", 500)


@smash_or_pass_bp.route("/taxonomies", methods=["GET"])
def get_taxonomies():
    """Retrieve all available roles and genders (cached)."""
    try:
        data = smash_service.get_taxonomies()
        return jsonify({"data": data}), 200
    except Exception as e:
        logger.error(f"Error fetching smash taxonomies: {e}")
        return api_error("Something went wrong. Please try again.", 500)


@smash_or_pass_bp.route("/taxonomies", methods=["POST"])
@admin_required
def register_taxonomy():
    """Register a role or gender in the shared list every visitor's filters show.

    Admin-only: a regular account's custom terms live in its own (local) roster
    and in its browser's term cache, so they never reach other visitors
    unmoderated."""
    client_ip = get_client_ip()
    if not taxonomy_rate_limiter.is_allowed(client_ip):
        return api_error("Too many requests. Please try again later.", 429)

    body = request.get_json(silent=True) or {}
    term_type = (body.get("type") or "").strip().lower()
    name = (body.get("name") or "").strip()
    if term_type not in ("role", "gender"):
        return api_error("Type must be 'role' or 'gender'", 400)
    if not name or len(name) > 64:
        return api_error("Name must be between 1 and 64 characters", 400)

    try:
        term = smash_service.register_taxonomy(term_type, name)
        return jsonify({"data": term}), 201
    except Exception as e:
        logger.error(f"Error registering taxonomy: {e}")
        return api_error("Something went wrong. Please try again.", 500)


def _roster_entities(payload: SmashRosterAdminCreate) -> list[dict[str, Any]]:
    """The entities of a roster creation request as plain dicts, translations included."""
    return [
        {
            **e.model_dump(exclude={"translations"}, exclude_none=True),
            "translations": {loc: t.model_dump(exclude_none=True) for loc, t in e.translations.items()},
        }
        for e in payload.entities
    ]


def _created_roster_response(row: Roster) -> dict[str, Any]:
    """`Roster.to_dict()` never carries its entities -- every other read path fetches them through
    a separate Entity/EntityStat select (get_feed, get_characters_with_stats) instead of
    eager-loading the relationship on every roster row. The creator UI wants confirmation of what
    it just built, so this one response assembles both by hand rather than adding entities to the
    model's own general-purpose `to_dict()`."""
    data = row.to_dict()
    data["entity_count"] = len(row.entities)
    data["character_count"] = len(row.entities)
    data["entities"] = [e.to_dict() for e in row.entities]
    return data


@smash_or_pass_bp.route("/rosters", methods=["POST"])
@admin_required
def create_roster():
    """Admin-authored official roster: the "Official?" checkbox in the roster
    creator posts here instead of saving to this browser's localStorage. The
    roster (and every entity in it) is live for every visitor the moment this
    returns -- picked up by the data-driven roster picker on its next fetch.
    """
    body = request.get_json(silent=True) or {}
    try:
        payload = SmashRosterAdminCreate(**body)
    except ValidationError as err:
        return api_error("Invalid roster", 400, details=err.errors())

    try:
        row = smash_service.create_roster(
            name=payload.name,
            description=payload.description,
            cover_image_url=payload.cover_image_url,
            theme_color=payload.theme_color,
            category=payload.category,
            is_nsfw=payload.is_nsfw,
            is_active=payload.is_active,
            translations={k: v.model_dump(exclude_none=True) for k, v in payload.translations.items()},
            entities=_roster_entities(payload),
        )
    except ValueError as err:
        return api_error(str(err), 400)

    log_admin_action(
        g.current_user.id,
        "smash_roster.create",
        target_type="roster",
        target_id=row.id,
        details={"slug": row.slug, "name": row.name, "entity_count": len(payload.entities)},
    )
    return jsonify({"status": "success", "data": _created_roster_response(row)}), 201


@smash_or_pass_bp.route("/admin/rosters/<slug>", methods=["DELETE"])
@admin_required
def delete_roster(slug: str):
    """Deletes an official smash-or-pass roster."""
    normalized_slug = (slug or "").strip().lower()
    roster = db.session.scalar(select(Roster).where(Roster.slug == normalized_slug))
    if not roster:
        return api_error(f"Roster '{slug}' not found", 404)

    target_id = roster.id
    name = roster.name
    deleted = smash_service.delete_roster(normalized_slug)
    if not deleted:
        return api_error(f"Roster '{slug}' not found", 404)

    log_admin_action(
        g.current_user.id,
        "smash_roster.delete",
        target_type="roster",
        target_id=target_id,
        details={"slug": normalized_slug, "name": name},
    )
    return jsonify({"status": "success", "message": f"Roster '{normalized_slug}' deleted"}), 200


@smash_or_pass_bp.route("/rosters/<slug>/feed", methods=["GET"])
def get_roster_feed(slug: str):
    """Retrieve unvoted entities feed for a given roster and session/user."""
    session_id = (
        request.args.get("session_id")
        or request.headers.get("X-Session-ID")
        or request.cookies.get("session_id")
    )
    requested_user_id = request.args.get("user_id", type=int)
    role = request.args.get("role")
    gender = request.args.get("gender")
    _, limit = paginate_args(default_per_page=250, max_per_page=500, per_page_arg="limit")
    lang = _extract_lang()

    # Which cards are missing from a feed reveals what that account voted on,
    # so `?user_id=` is an admin-only override. Everyone else gets their own
    # account (signed in) or their own guest session -- never someone else's.
    current_user = get_current_user()
    user_id = _resolve_vote_owner(current_user, requested_user_id)
    if isinstance(user_id, tuple):
        return user_id
    if current_user is not None and user_id != current_user.id:
        session_id = None  # an admin looking at another account, not at their own device

    try:
        feed_data = smash_service.get_feed(
            roster_slug=slug,
            session_id=session_id,
            user_id=user_id,
            role=role,
            gender=gender,
            limit=limit,
            lang=lang,
        )
        if feed_data is None:
            return api_error(f"Roster '{slug}' not found", 404)

        return jsonify({"data": feed_data}), 200
    except Exception as e:
        logger.error(f"Error fetching feed for roster '{slug}': {e}")
        return api_error("Something went wrong. Please try again.", 500)


VOTE_TYPES = ("smash", "pass", "super_smash")
MAX_VOTE_KEY_LENGTH = MAX_SMASH_KEY_LENGTH


def _vote_request(payload: dict[str, Any]) -> dict[str, Any]:
    """The vote fields, with the legacy aliases (`slug`, `vote`, `edition`) resolved."""
    def text(*keys: str) -> str | None:
        for key in keys:
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    entity_id = payload.get("entity_id")
    return {
        "entity_id": entity_id if isinstance(entity_id, (str, int)) and not isinstance(entity_id, bool) else None,
        "character_slug": text("character_slug", "slug"),
        "vote_type": text("vote_type", "vote"),
        "roster_slug": text("roster_slug", "edition") or "canon",
        "edition": text("edition", "roster_slug") or "canon",
        "session_id": text("session_id") or request.headers.get("X-Session-ID") or request.cookies.get("session_id"),
    }


def _vote_problem(vote: dict[str, Any], user_id: int | None) -> str | None:
    """Why this vote request is invalid, or None."""
    if not vote["entity_id"] and not vote["character_slug"]:
        return "Fields 'entity_id' or 'character_slug' and 'vote_type' are required"
    if not vote["vote_type"]:
        return "Field 'vote_type' is required"
    if vote["vote_type"] not in VOTE_TYPES:
        return f"Invalid vote_type '{vote['vote_type']}'. Must be one of ('smash', 'pass', 'super_smash')"
    if not user_id and not vote["session_id"]:
        return "Field 'session_id' is required for a guest vote"
    for key in ("character_slug", "roster_slug", "edition", "session_id"):
        if vote[key] and len(str(vote[key])) > MAX_VOTE_KEY_LENGTH:
            return f"Field '{key}' is too long"
    return None


@smash_or_pass_bp.route("/vote", methods=["POST"])
def cast_vote():
    """Cast a vote (smash, pass, super_smash) for an entity or character."""
    payload = request.get_json(silent=True)
    vote = _vote_request(payload if isinstance(payload, dict) else {})
    current_user = get_current_user()
    user_id = current_user.id if current_user else None

    # Keyed on something the client cannot rotate: the account when signed in,
    # otherwise the IP. The guest `session_id` is client-chosen, so keying on
    # it let a script mint a fresh limit per request.
    client_key = f"user:{user_id}" if user_id else f"ip:{get_client_ip()}"
    if not vote_rate_limiter.is_allowed(client_key):
        return api_error("Rate limit exceeded. Maximum 60 votes per minute allowed.", 429)
    if problem := _vote_problem(vote, user_id):
        return api_error(problem, 400)

    try:
        result = smash_service.cast_vote(
            entity_id=vote["entity_id"],
            character_slug=vote["character_slug"],
            vote_type=vote["vote_type"],
            # A signed-in vote belongs to the account alone. Storing the device's
            # guest session on it too let whoever used that browser next see and
            # reset it.
            session_id=None if user_id else vote["session_id"],
            user_id=user_id,
            roster_slug=vote["roster_slug"],
            edition=vote["edition"],
            lang=_extract_lang(),
        )
        return jsonify({"data": result, "status": "success"}), 200
    except ValueError as val_err:
        return api_error(str(val_err), 400)
    except Exception as e:
        logger.error(f"Error casting smash-or-pass vote: {e}", exc_info=True)
        return api_error("Something went wrong. Please try again.", 500)


@smash_or_pass_bp.route("/rosters/<slug>/leaderboard", methods=["GET"])
def get_roster_leaderboard(slug: str):
    """Retrieve ranked leaderboard for a given roster."""
    sort_by = request.args.get("sort_by", "smash_rate")
    role = request.args.get("role")
    gender = request.args.get("gender")
    _, limit = paginate_args(default_per_page=100, max_per_page=250, per_page_arg="limit")
    lang = _extract_lang()

    try:
        # Column-only select: this is purely an existence check, and selecting
        # the full ORM entity here would pull in the (unused) `entities`
        # relationship for no reason.
        roster_id = db.session.scalar(select(Roster.id).where(Roster.slug == slug))
        if roster_id is None:
            return api_error(f"Roster '{slug}' not found", 404)

        leaderboard = smash_service.get_leaderboard(
            roster_slug=slug,
            role=role,
            gender=gender,
            sort_by=sort_by,
            limit=limit,
            lang=lang,
        )
        return (
            jsonify(
                {
                    "data": leaderboard,
                    "count": len(leaderboard),
                    "roster": slug,
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Error fetching leaderboard for roster '{slug}': {e}")
        return api_error("Something went wrong. Please try again.", 500)


def _session_request() -> SmashSessionRequest:
    """The session / roster / user a reset or sync names, from the body, the query string, the
    `X-Session-ID` header or the `session_id` cookie (first one set wins), validated.

    `roster_slug` and `edition` are aliases of each other. Raises ValidationError.
    """
    body = request.get_json(silent=True)
    body = body if isinstance(body, dict) else {}

    def first(*values: Any) -> Any:
        return next((v for v in values if v not in (None, "")), None)

    return SmashSessionRequest.model_validate({
        "session_id": first(
            body.get("session_id"), request.args.get("session_id"),
            request.headers.get("X-Session-ID"), request.cookies.get("session_id"),
        ),
        "roster_slug": first(body.get("roster_slug"), body.get("edition"), request.args.get("roster_slug"), request.args.get("edition")),
        "edition": first(body.get("edition"), body.get("roster_slug"), request.args.get("edition"), request.args.get("roster_slug")),
        "user_id": first(body.get("user_id"), request.args.get("user_id")),
    })


def _invalid_session_request(err: ValidationError):
    return api_error("Validation failed", 400, details=err.errors(include_url=False, include_context=False))


@smash_or_pass_bp.route("/session/reset", methods=["POST"])
def reset_session():
    """Reset and unwind votes cast in a session."""
    try:
        req = _session_request()
    except ValidationError as err:
        return _invalid_session_request(err)
    if not req.session_id:
        return api_error("Field 'session_id' is required to reset session votes", 400)

    try:
        result = smash_service.reset_session_votes(session_id=req.session_id, roster_slug=req.roster_slug)
        return jsonify({"data": result, "status": "success"}), 200
    except Exception as e:
        logger.error(f"Error resetting session votes: {e}", exc_info=True)
        return api_error("Something went wrong. Please try again.", 500)


@smash_or_pass_bp.route("/sync-session", methods=["POST"])
def sync_session():
    """Synchronize and migrate guest session votes to an authenticated user account."""
    current_user = get_current_user()
    if not current_user:
        return api_error("Authentication required to sync guest session votes to an account", 401)
    try:
        req = _session_request()
    except ValidationError as err:
        return _invalid_session_request(err)
    if not req.session_id:
        return api_error("Field 'session_id' is required", 400)

    try:
        result = smash_service.sync_session_votes(
            user_id=current_user.id,
            session_id=req.session_id,
            roster_slug=req.roster_slug,
        )
        return jsonify({"data": result, "status": "success"}), 200
    except Exception as e:
        logger.error(f"Error syncing session votes: {e}", exc_info=True)
        return api_error("Something went wrong. Please try again.", 500)


@smash_or_pass_bp.route("/user-votes/reset", methods=["POST"])
def reset_user_votes():
    """Reset and wipe all votes for a specific user and recalculate stats."""
    try:
        req = _session_request()
    except ValidationError as err:
        return _invalid_session_request(err)

    current_user = get_current_user()
    if not current_user:
        if req.user_id:
            return api_error("Authentication required to reset user votes", 401)
        return api_error("Field 'user_id' is required to reset user votes", 400)
    if req.user_id and req.user_id != current_user.id and current_user.role != "admin":
        return api_error("Forbidden: Cannot reset votes for another user", 403)
    target_user_id = req.user_id if (current_user.role == "admin" and req.user_id) else current_user.id

    try:
        result = smash_service.reset_user_votes(
            user_id=target_user_id,
            roster_slug=req.roster_slug,
            edition=req.edition,
        )
        return jsonify({"data": result, "status": "success"}), 200
    except Exception as e:
        logger.error(f"Error resetting user smash-or-pass votes: {e}", exc_info=True)
        return api_error("Something went wrong. Please try again.", 500)


@smash_or_pass_bp.route("/user-votes", methods=["GET"])
def get_user_votes():
    """Retrieve all votes cast by the current user or session for no-repeat deck filtering and stats sync."""
    requested_user_id = request.args.get("user_id", type=int)
    edition = request.args.get("edition") or request.args.get("roster_slug") or "canon"
    session_id = (
        request.args.get("session_id")
        or request.headers.get("X-Session-ID")
        or request.cookies.get("session_id")
    )
    lang = _extract_lang()

    current_user = get_current_user()
    target_user_id = _resolve_vote_owner(current_user, requested_user_id)
    if isinstance(target_user_id, tuple):
        return target_user_id
    if current_user is not None and target_user_id != current_user.id:
        session_id = None  # an admin looking at another account, not at their own device

    if not target_user_id and not session_id:
        return jsonify({"data": [], "count": 0, "message": "No user_id or session_id provided"}), 200

    try:
        votes = smash_service.get_user_votes(
            user_id=target_user_id,
            session_id=session_id,
            edition=edition,
            lang=lang,
        )
        return jsonify({"data": votes, "count": len(votes), "edition": edition}), 200
    except Exception as e:
        logger.error(f"Error fetching user/session smash-or-pass votes: {e}")
        return api_error("Something went wrong. Please try again.", 500)


from app.utils.safe_fetch import FetchRefused, fetch_public_image

#: Sent with every proxied image. The body is never a document: nosniff stops a
#: browser second-guessing the type, and the sandboxing CSP means that even if
#: something slipped through, opening the URL directly runs nothing on our origin.
_PROXY_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    "Content-Disposition": "inline; filename=\"image\"",
    "Cross-Origin-Resource-Policy": "same-site",
}


@smash_or_pass_bp.route("/proxy-image", methods=["GET"])
def proxy_image():
    """Proxies a third-party raster image so the cover cropper can draw it on a
    canvas without tainting it. Raster only (PNG/JPEG/GIF/WebP/AVIF, checked by
    content, not label), public hosts only, no redirects."""
    from flask import Response

    client_ip = get_client_ip()
    if not proxy_rate_limiter.is_allowed(client_ip):
        return api_error("Too many requests. Please try again later.", 429)

    target_url = request.args.get("url")
    if not target_url or len(target_url) > 2048:
        return api_error("Missing url parameter", 400)

    max_bytes = site_settings.smash_image_max_bytes()  # at most 5MB (admin setting)
    try:
        image = fetch_public_image(target_url, max_bytes=max_bytes)
    except FetchRefused as refused:
        return api_error(str(refused), refused.status)
    except Exception as e:
        logger.error(f"Image proxy error: {e}")
        return api_error("Could not fetch the image", 502)

    response = Response(image.body, status=200, mimetype=image.mimetype)
    response.headers.update(_PROXY_SECURITY_HEADERS)
    response.headers["Cache-Control"] = "public, max-age=86400"
    return response
