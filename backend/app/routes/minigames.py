import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Any

from flask import Blueprint, current_app, g, jsonify, request, send_from_directory
from sqlalchemy import select
from app.core.extensions import db
from app.core.http_cache import cache_catalog
from app.core.limiter import limiter
from app.core.security import admin_required, get_current_user
from app.models.character import Killer
from app.models.minigame import MinigameDailyChallenge, MinigameRepeatableChallenge
from pydantic import ValidationError

from app.services.minigames import (
    GENERATED_MODES,
    create_repeatable,
    evaluate_guess,
    get_catalog,
    get_or_create_daily,
    public_challenge,
    upsert_daily_challenge,
)
from app.services.minigames.chase_music import ChaseMusicUnavailable, ensure_track
from app.services.admin_control_service import log_admin_action
from app.schemas.minigames import MinigameGuessSubmissionDTO, MinigameOfficialCreateDTO
from app.utils.lang import extract_lang
from app.utils.pagination import paginate_args
from app.utils.responses import api_error

logger = logging.getLogger(__name__)

minigames_bp = Blueprint("minigames", __name__, url_prefix="/api/v1/minigames")


@minigames_bp.route("/catalog", methods=["GET"])
@cache_catalog(ttl=3600, vary=())
def get_minigames_catalog():
    """Retrieve full catalog of characters, perks, and realms for search autocomplete."""
    lang = extract_lang()
    catalog = get_catalog(lang=lang)
    return jsonify(catalog), 200


def _is_admin() -> bool:
    user = get_current_user()
    return bool(user and getattr(user, "role", None) == "admin")


def _utc_today():
    return datetime.now(timezone.utc).date()


def _requested_mode(default: str) -> str:
    return (request.args.get("mode") or request.args.get("game_mode") or default).strip()[:50]


@minigames_bp.route("/daily", methods=["GET"])
@limiter.limit("30 per minute")
def get_daily_challenge():
    """The official daily for a game_mode and date (UTC today by default).

    Only today and past days are served (an admin may preview ahead), and only
    modes that exist: an unknown mode with nothing published is a 404, so a
    request cannot make the server generate and store rows for invented
    (mode, date) pairs.
    """
    game_mode = _requested_mode("classic")
    date_str = request.args.get("date", type=str)

    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return api_error("Invalid date format, expected YYYY-MM-DD", 400)
    else:
        target_date = _utc_today()

    if target_date > _utc_today() and not _is_admin():
        return api_error("That daily challenge is not available yet", 404)

    lang = extract_lang()
    try:
        challenge = get_or_create_daily(game_mode=game_mode, target_date=target_date, lang=lang)
    except Exception as e:
        logger.error(f"Error fetching daily minigame: {e}")
        return api_error("Failed to load daily challenge", 500)
    if challenge is None:
        return api_error("Daily challenge not found", 404)
    return jsonify(public_challenge(challenge)), 200


@minigames_bp.route("/repeatable", methods=["GET"])
@limiter.limit("20 per minute")
def get_repeatable_challenge():
    """A fresh practice round set for a known game_mode (stored 24h, then purged)."""
    game_mode = _requested_mode("classic")
    if game_mode not in GENERATED_MODES:
        return api_error("Unknown game mode", 400)
    session_id = (request.headers.get("X-Session-ID") or secrets.token_hex(16))[:64]

    try:
        challenge = create_repeatable(game_mode=game_mode, session_id=session_id)
        return jsonify(public_challenge(challenge)), 200
    except Exception as e:
        logger.error(f"Error creating repeatable minigame: {e}")
        return api_error("Failed to create repeatable challenge", 500)


def _stored_round(challenge_type: str, challenge_id: Any, round_index: int) -> dict[str, Any] | None:
    """The round as the server stored it, or None if there is no such challenge/round."""
    if round_index < 0:
        return None
    rounds = None
    if challenge_type == "daily":
        try:
            daily = db.session.get(MinigameDailyChallenge, int(challenge_id))
        except (TypeError, ValueError):
            return None
        rounds = daily.rounds if daily and daily.is_active else None
    elif challenge_type == "repeatable" and challenge_id is not None:
        rep = db.session.get(MinigameRepeatableChallenge, str(challenge_id)[:36])
        rounds = rep.rounds if rep else None
    if rounds and round_index < len(rounds) and isinstance(rounds[round_index], dict):
        return rounds[round_index]
    return None


@minigames_bp.route("/guess", methods=["POST"])
@limiter.limit("60 per minute")
def submit_guess():
    """Grades a guess.

    An official round (daily/repeatable) is graded against the round the server
    stored -- whatever round the client sends alongside is ignored. Only a
    custom trial, which exists solely in the player's browser, is graded
    against the round in the request. Once the round is over (solved, out of
    attempts, or `give_up`) the response carries `answer`, which is how the
    client learns an answer it was never sent.
    """
    try:
        dto = MinigameGuessSubmissionDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors())

    if dto.challenge_type == "custom":
        custom_round = dto.custom_round_config or dto.custom_round
        round_data = custom_round if isinstance(custom_round, dict) else None
    else:
        round_data = _stored_round(dto.challenge_type, dto.challenge_id, dto.round_index)
    if not round_data:
        return api_error("Challenge or round not found", 404)

    max_attempts = round_data.get("max_attempts") or 6
    answer = {"target_type": round_data.get("target_type"), "target_id": round_data.get("target_id")}

    if dto.give_up:
        return jsonify({"is_correct": False, "attempt_number": dto.attempt_number, "details": {}, "answer": answer}), 200

    if dto.guess_id is None:
        return api_error("Missing guess_id", 400)

    try:
        result = evaluate_guess(
            round_data=round_data,
            guess_type=dto.guess_type,
            guess_id=dto.guess_id,
            attempt_number=dto.attempt_number,
        )
    except Exception as e:
        logger.warning(f"Could not evaluate minigame guess: {e}")
        return api_error("Invalid guess", 400)
    if result.get("is_correct") or dto.attempt_number >= max_attempts:
        result["answer"] = answer
    return jsonify(result), 200


@minigames_bp.route("/official", methods=["POST"])
@minigames_bp.route("/daily", methods=["POST"])
@admin_required
def create_official_challenge():
    """Admin-only endpoint to author, publish, or seed official daily and featured trials."""
    try:
        dto = MinigameOfficialCreateDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors())

    challenge_date_str = dto.challenge_date
    game_mode = dto.game_mode
    title = dto.title.strip()
    description = dto.description.strip()
    rounds = dto.rounds

    if not title or not rounds:
        return api_error("Title and rounds are required", 400)

    if challenge_date_str:
        try:
            target_date = datetime.strptime(challenge_date_str, "%Y-%m-%d").date()
        except ValueError:
            return api_error("Invalid date format, expected YYYY-MM-DD", 400)
    else:
        target_date = datetime.now(timezone.utc).date()

    challenge = upsert_daily_challenge(
        game_mode=game_mode,
        title=title,
        description=description,
        rounds=rounds,
        target_date=target_date,
    )
    return jsonify(challenge.to_dict()), 201


@minigames_bp.route("/official/<int:challenge_id>", methods=["DELETE"])
@admin_required
def delete_official_challenge(challenge_id: int):
    """Admin-only endpoint to delete an official daily challenge."""
    challenge = db.session.get(MinigameDailyChallenge, challenge_id)
    if not challenge:
        return api_error("Challenge not found", 404)

    try:
        title = challenge.title
        db.session.delete(challenge)
        db.session.commit()
        log_admin_action(
            g.current_user.id,
            "minigame_challenge.delete",
            target_type="minigame_challenge",
            target_id=challenge_id,
            details={"challenge_id": challenge_id, "title": title},
        )
        return jsonify({"status": "success", "message": f"Challenge #{challenge_id} deleted"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting challenge #{challenge_id}: {e}")
        return api_error("Failed to delete challenge", 500)




@minigames_bp.route("/official", methods=["GET"])
def list_official_challenges():
    """Lists official daily challenges, newest first: today and earlier only
    (admins see scheduled ones too), with answers withheld like /daily."""
    page, per_page = paginate_args(default_per_page=30, max_per_page=100)
    query = select(MinigameDailyChallenge).where(MinigameDailyChallenge.is_active.is_(True))
    if not _is_admin():
        query = query.where(MinigameDailyChallenge.challenge_date <= _utc_today())
    challenges = db.session.scalars(
        query.order_by(MinigameDailyChallenge.challenge_date.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()
    return jsonify([public_challenge(c.to_dict()) for c in challenges]), 200


@minigames_bp.route("/audio/terror_radius/<int:killer_id>", methods=["GET"])
@limiter.limit("120 per minute")
def stream_killer_terror_radius(killer_id: int):
    """Streams official Dead by Daylight Terror Radius / Chase music for a given killer, caching locally."""
    killer = db.session.get(Killer, killer_id)
    if not killer:
        return api_error("Killer not found", 404)

    mp3_url = killer.chase_music_url
    if not mp3_url:
        return api_error("Audio track not available for this killer", 404)

    static_folder = current_app.static_folder or os.path.join(current_app.root_path, "static")
    cache_dir = os.path.join(static_folder, "audio", "cache")
    os.makedirs(cache_dir, exist_ok=True)

    try:
        mp3_filename = ensure_track(killer, cache_dir)
    except ChaseMusicUnavailable as exc:
        return api_error(f"Failed to retrieve audio: {exc}", 502)

    return send_from_directory(cache_dir, mp3_filename, mimetype="audio/mpeg", conditional=True)

