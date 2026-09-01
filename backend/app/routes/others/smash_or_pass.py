# backend/app/routes/others/smash_or_pass.py
import logging
import threading
import time
from collections import defaultdict
from flask import Blueprint, jsonify, request
from sqlalchemy import select

from app.core.extensions import db
from app.core.limiter import get_client_ip
from app.core.security import get_current_user
from app.models.smash_or_pass import Roster
from app.services.others.smash_or_pass_service import SmashOrPassService

logger = logging.getLogger(__name__)

smash_or_pass_bp = Blueprint("smash_or_pass", __name__, url_prefix="/api/v1/smash-or-pass")
smash_service = SmashOrPassService()


class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter per client identifier with auto-pruning."""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60, prune_interval: int = 50):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.prune_interval = prune_interval
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()
        self._call_count = 0

    def is_allowed(self, client_key: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        with self._lock:
            self._call_count += 1
            if self._call_count >= self.prune_interval:
                self._prune_stale_keys(cutoff)
                self._call_count = 0

            timestamps = self._requests[client_key]
            filtered = [t for t in timestamps if t > cutoff]
            if len(filtered) >= self.max_requests:
                self._requests[client_key] = filtered
                return False
            filtered.append(now)
            self._requests[client_key] = filtered
            return True

    def _prune_stale_keys(self, cutoff: float) -> None:
        stale_keys = [k for k, v in self._requests.items() if not v or max(v) <= cutoff]
        for k in stale_keys:
            del self._requests[k]

    def reset(self) -> None:
        with self._lock:
            self._requests.clear()
            self._call_count = 0


vote_rate_limiter = SlidingWindowRateLimiter(max_requests=60, window_seconds=60)


@smash_or_pass_bp.route("/rosters", methods=["GET"])
def get_rosters():
    """Retrieve all active rosters with real-time stats."""
    try:
        rosters = smash_service.get_rosters(active_only=False)
        return jsonify({"data": rosters, "count": len(rosters)}), 200
    except Exception as e:
        logger.error(f"Error fetching smash-or-pass rosters: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/rosters/<slug>/feed", methods=["GET"])
def get_roster_feed(slug: str):
    """Retrieve unvoted entities feed for a given roster and session/user."""
    session_id = (
        request.args.get("session_id")
        or request.headers.get("X-Session-ID")
        or request.cookies.get("session_id")
    )
    user_id = request.args.get("user_id", type=int)
    role = request.args.get("role")
    gender = request.args.get("gender")
    limit = request.args.get("limit", default=250, type=int)

    current_user = get_current_user()
    if current_user:
        user_id = current_user.id

    try:
        feed_data = smash_service.get_feed(
            roster_slug=slug,
            session_id=session_id,
            user_id=user_id,
            role=role,
            gender=gender,
            limit=limit,
        )
        if feed_data is None:
            return jsonify({"error": f"Roster '{slug}' not found"}), 404

        return jsonify({"data": feed_data}), 200
    except Exception as e:
        logger.error(f"Error fetching feed for roster '{slug}': {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/vote", methods=["POST"])
def cast_vote():
    """Cast a vote (smash, pass, super_smash) for an entity or character."""
    payload = request.get_json(silent=True) or {}
    entity_id = payload.get("entity_id")
    character_slug = payload.get("character_slug") or payload.get("slug")
    vote_type = payload.get("vote_type") or payload.get("vote")
    roster_slug = payload.get("roster_slug") or payload.get("edition") or "canon"
    edition = payload.get("edition") or payload.get("roster_slug") or "canon"
    session_id = (
        payload.get("session_id")
        or request.headers.get("X-Session-ID")
        or request.cookies.get("session_id")
    )

    current_user = get_current_user()
    user_id = current_user.id if current_user else None

    remote_ip = get_client_ip()
    sub_key = session_id or (f"user:{user_id}" if user_id else "anon")
    client_key = f"{remote_ip}:{sub_key}"

    if not vote_rate_limiter.is_allowed(client_key):
        return (
            jsonify(
                {
                    "error": "Rate limit exceeded. Maximum 60 votes per minute allowed.",
                    "status": 429,
                }
            ),
            429,
        )

    if not entity_id and not character_slug:
        return (
            jsonify(
                {"error": "Fields 'entity_id' or 'character_slug' and 'vote_type' are required"}
            ),
            400,
        )

    if not vote_type:
        return jsonify({"error": "Field 'vote_type' is required"}), 400

    if vote_type not in {"smash", "pass", "super_smash"}:
        return (
            jsonify(
                {
                    "error": f"Invalid vote_type '{vote_type}'. Must be one of ('smash', 'pass', 'super_smash')"
                }
            ),
            400,
        )

    try:
        result = smash_service.cast_vote(
            entity_id=entity_id,
            character_slug=character_slug,
            vote_type=vote_type,
            session_id=session_id,
            user_id=user_id,
            roster_slug=roster_slug,
            edition=edition,
        )
        return jsonify({"data": result, "status": "success"}), 200
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 400
    except Exception as e:
        logger.error(f"Error casting smash-or-pass vote: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/rosters/<slug>/leaderboard", methods=["GET"])
def get_roster_leaderboard(slug: str):
    """Retrieve ranked leaderboard for a given roster."""
    sort_by = request.args.get("sort_by", "smash_rate")
    role = request.args.get("role")
    gender = request.args.get("gender")
    limit = request.args.get("limit", default=100, type=int)

    try:
        roster_obj = db.session.scalar(select(Roster).where(Roster.slug == slug))
        if not roster_obj:
            return jsonify({"error": f"Roster '{slug}' not found"}), 404

        leaderboard = smash_service.get_leaderboard(
            roster_slug=slug,
            role=role,
            gender=gender,
            sort_by=sort_by,
            limit=limit,
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
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/session/reset", methods=["POST"])
def reset_session():
    """Reset and unwind votes cast in a session."""
    payload = request.get_json(silent=True) or {}
    session_id = (
        payload.get("session_id")
        or request.args.get("session_id")
        or request.headers.get("X-Session-ID")
        or request.cookies.get("session_id")
    )
    roster_slug = (
        payload.get("roster_slug")
        or payload.get("edition")
        or request.args.get("roster_slug")
        or request.args.get("edition")
    )

    if not session_id:
        return jsonify({"error": "Field 'session_id' is required to reset session votes"}), 400

    try:
        result = smash_service.reset_session_votes(
            session_id=session_id, roster_slug=roster_slug
        )
        return jsonify({"data": result, "status": "success"}), 200
    except Exception as e:
        logger.error(f"Error resetting session votes: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/sync-session", methods=["POST"])
def sync_session():
    """Synchronize and migrate guest session votes to an authenticated user account."""
    payload = request.get_json(silent=True) or {}
    session_id = (
        payload.get("session_id")
        or request.headers.get("X-Session-ID")
        or request.cookies.get("session_id")
    )
    roster_slug = (
        payload.get("roster_slug")
        or payload.get("edition")
        or request.args.get("roster_slug")
        or request.args.get("edition")
    )

    current_user = get_current_user()
    if not current_user:
        return (
            jsonify({"error": "Authentication required to sync guest session votes to an account"}),
            401,
        )

    if not session_id:
        return jsonify({"error": "Field 'session_id' is required"}), 400

    try:
        result = smash_service.sync_session_votes(
            user_id=current_user.id,
            session_id=session_id,
            roster_slug=roster_slug,
        )
        return jsonify({"data": result, "status": "success"}), 200
    except Exception as e:
        logger.error(f"Error syncing session votes: {e}")
        return jsonify({"error": str(e)}), 500



@smash_or_pass_bp.route("/user-votes/reset", methods=["POST"])
def reset_user_votes():
    """Reset and wipe all votes for a specific user and recalculate stats."""
    payload = request.get_json(silent=True) or {}
    requested_user_id = payload.get("user_id") or request.args.get("user_id", type=int)
    session_id = (
        payload.get("session_id")
        or request.headers.get("X-Session-ID")
        or request.cookies.get("session_id")
    )
    roster_slug = (
        payload.get("roster_slug")
        or payload.get("edition")
        or request.args.get("roster_slug")
        or request.args.get("edition")
    )
    edition = (
        payload.get("edition")
        or payload.get("roster_slug")
        or request.args.get("edition")
        or request.args.get("roster_slug")
    )

    current_user = get_current_user()
    if current_user:
        if requested_user_id and requested_user_id != current_user.id and current_user.role != "admin":
            return jsonify({"error": "Forbidden: Cannot reset votes for another user"}), 403
        target_user_id = requested_user_id if (current_user.role == "admin" and requested_user_id) else current_user.id
    else:
        if requested_user_id:
            return jsonify({"error": "Authentication required to reset user votes"}), 401
        return jsonify({"error": "Field 'user_id' is required to reset user votes"}), 400

    try:
        result = smash_service.reset_user_votes(
            user_id=target_user_id,
            roster_slug=roster_slug,
            edition=edition,
            session_id=session_id,
        )
        return jsonify({"data": result, "status": "success"}), 200
    except Exception as e:
        logger.error(f"Error resetting user smash-or-pass votes: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/translations", methods=["GET"])
def get_translations():
    """Retrieve dynamic translations dictionary for a given locale."""
    locale = request.args.get("locale", "en")
    try:
        translations = smash_service.get_translations(locale=locale)
        return jsonify({"data": translations, "locale": locale}), 200
    except Exception as e:
        logger.error(f"Error fetching translations for locale '{locale}': {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/editions", methods=["GET"])
def get_editions():
    """Retrieve available smash or pass editions (legacy)."""
    try:
        editions = smash_service.get_editions()
        return jsonify({"data": editions, "count": len(editions)}), 200
    except Exception as e:
        logger.error(f"Error fetching smash-or-pass editions: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/characters", methods=["GET"])
def get_characters():
    """Retrieve character list with stats filtered by edition, role, gender, or search query (legacy)."""
    edition = request.args.get("edition", "canon")
    role = request.args.get("role")
    gender = request.args.get("gender")
    search = request.args.get("q") or request.args.get("search")

    try:
        data = smash_service.get_characters_with_stats(
            edition=edition, role=role, gender=gender, search=search
        )
        return jsonify({"count": len(data), "data": data, "edition": edition}), 200
    except Exception as e:
        logger.error(f"Error fetching smash-or-pass characters: {e}")
        return jsonify({"error": str(e)}), 500


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

    current_user = get_current_user()
    if current_user:
        if requested_user_id and requested_user_id != current_user.id and current_user.role != "admin":
            return jsonify({"error": "Forbidden: Cannot view votes for another user"}), 403
        target_user_id = requested_user_id if (current_user.role == "admin" and requested_user_id) else current_user.id
    else:
        target_user_id = requested_user_id

    if not target_user_id and not session_id:
        return jsonify({"data": [], "count": 0, "message": "No user_id or session_id provided"}), 200

    try:
        votes = smash_service.get_user_votes(
            user_id=target_user_id,
            session_id=session_id,
            edition=edition,
        )
        return jsonify({"data": votes, "count": len(votes), "edition": edition}), 200
    except Exception as e:
        logger.error(f"Error fetching user/session smash-or-pass votes: {e}")
        return jsonify({"error": str(e)}), 500

