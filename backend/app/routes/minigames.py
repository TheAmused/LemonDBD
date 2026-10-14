import json
import logging
import os
import secrets
import string
import urllib.request
from datetime import date, datetime, timezone
from typing import Any

from flask import Blueprint, current_app, g, jsonify, request, send_from_directory
from sqlalchemy import select
from app.core.extensions import db
from app.core.limiter import limiter
from app.core.security import admin_required, get_current_user
from app.models.character import Killer
from app.models.minigame import (
    MinigameDailyChallenge,
    MinigameRepeatableChallenge,
    MinigameUserStat,
)
from pydantic import ValidationError

from app.services.minigame_service import MinigameService
from app.schemas.minigames import (
    MinigameGuessSubmissionDTO,
    MinigameOfficialCreateDTO,
    MinigameScoreSubmissionDTO,
)
from app.utils.lang import extract_lang
from app.utils.pagination import paginate_args
from app.utils.responses import api_error

logger = logging.getLogger(__name__)

minigames_bp = Blueprint("minigames", __name__, url_prefix="/api/v1/minigames")
minigame_service = MinigameService()


@minigames_bp.route("/catalog", methods=["GET"])
def get_minigames_catalog():
    """Retrieve full catalog of characters, perks, and realms for search autocomplete."""
    lang = extract_lang()
    catalog = minigame_service.get_catalog(lang=lang)
    return jsonify(catalog), 200


@minigames_bp.route("/daily", methods=["GET"])
def get_daily_challenge():
    """Fetches official daily challenge for a given game_mode and date (cached in PostgreSQL)."""
    game_mode = request.args.get("mode") or request.args.get("game_mode", "classic")
    date_str = request.args.get("date", type=str)

    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return api_error("Invalid date format, expected YYYY-MM-DD", 400)
    else:
        target_date = datetime.now(timezone.utc).date()

    lang = extract_lang()
    try:
        challenge = minigame_service.get_or_create_daily(game_mode=game_mode, target_date=target_date, lang=lang)
        return jsonify(challenge), 200
    except Exception as e:
        logger.error(f"Error fetching daily minigame: {e}")
        return api_error("Failed to load daily challenge", 500)


@minigames_bp.route("/repeatable", methods=["GET"])
def get_repeatable_challenge():
    """Generates an ephemeral repeatable challenge session cached in PostgreSQL."""
    game_mode = request.args.get("mode") or request.args.get("game_mode", "classic")
    session_id = request.headers.get("X-Session-ID") or secrets.token_hex(16)

    try:
        challenge = minigame_service.create_repeatable(game_mode=game_mode, session_id=session_id)
        return jsonify(challenge), 200
    except Exception as e:
        logger.error(f"Error creating repeatable minigame: {e}")
        return api_error("Failed to create repeatable challenge", 500)


@minigames_bp.route("/guess", methods=["POST"])
@limiter.limit("60 per minute")
def submit_guess():
    """Evaluates a guess against an active challenge round."""
    try:
        dto = MinigameGuessSubmissionDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors())

    challenge_id = dto.challenge_id
    challenge_type = dto.challenge_type
    round_index = dto.round_index
    guess_type = dto.guess_type
    guess_id = dto.guess_id
    attempt_number = dto.attempt_number
    custom_round = dto.custom_round_config or dto.custom_round

    if guess_id is None:
        return api_error("Missing guess_id", 400)

    # Resolve round data from PostgreSQL or custom payload
    round_data = None
    if custom_round and isinstance(custom_round, dict):
        round_data = custom_round
    elif challenge_type == "daily":
        daily = db.session.get(MinigameDailyChallenge, challenge_id)
        if daily and daily.rounds and round_index < len(daily.rounds):
            round_data = daily.rounds[round_index]
    elif challenge_type == "repeatable":
        rep = db.session.get(MinigameRepeatableChallenge, str(challenge_id))
        if rep and rep.rounds and round_index < len(rep.rounds):
            round_data = rep.rounds[round_index]

    if not round_data:
        return api_error("Challenge or round not found", 404)

    result = minigame_service.evaluate_guess(
        round_data=round_data,
        guess_type=guess_type,
        guess_id=guess_id,
        attempt_number=attempt_number,
    )
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

    challenge = minigame_service.upsert_daily_challenge(
        game_mode=game_mode,
        title=title,
        description=description,
        rounds=rounds,
        target_date=target_date,
    )
    return jsonify(challenge.to_dict()), 201



@minigames_bp.route("/official", methods=["GET"])
def list_official_challenges():
    """Lists official daily challenges."""
    page, per_page = paginate_args(default_per_page=30, max_per_page=100)
    challenges = db.session.scalars(
        select(MinigameDailyChallenge)
        .where(MinigameDailyChallenge.is_active.is_(True))
        .order_by(MinigameDailyChallenge.challenge_date.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()
    return jsonify([c.to_dict() for c in challenges]), 200


@minigames_bp.route("/stats", methods=["GET"])
def get_user_stats():
    """Fetches user minigames streak and history stats."""
    user = get_current_user()
    if not user:
        return api_error("Authentication required", 401)

    stats = db.session.scalars(
        select(MinigameUserStat).where(MinigameUserStat.user_id == user.id)
    ).all()
    stats_map = {s.game_mode: s.to_dict() for s in stats}
    return jsonify({"user_id": user.id, "stats": stats_map}), 200


@minigames_bp.route("/stats", methods=["POST"])
def update_user_stats():
    """Updates user win/streak minigame stats in PostgreSQL."""
    user = get_current_user()
    if not user:
        return api_error("Authentication required", 401)

    try:
        dto = MinigameScoreSubmissionDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors())

    stat = minigame_service.record_minigame_round(
        user_id=user.id,
        game_mode=dto.game_mode,
        won=dto.won,
        attempts=dto.attempts_taken,
    )
    return jsonify(stat.to_dict()), 200



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

    mp3_filename = f"killer_{killer.id}_{killer.name.lower().replace(' ', '_')}.mp3"
    local_path = os.path.join(cache_dir, mp3_filename)

    if not os.path.exists(local_path) or os.path.getsize(local_path) == 0:
        try:
            req = urllib.request.Request(
                mp3_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": "https://deadbydaylight.wiki.gg/wiki/Terror_Radius",
                },
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = resp.read()
                if data:
                    with open(local_path, "wb") as f:
                        f.write(data)
            # Save local path directly to Killer model
            minigame_service.update_killer_chase_music(killer.id, f"audio/cache/{mp3_filename}")
        except Exception as e:
            logger.error(f"Failed to fetch audio for {killer.name} from wiki: {e}")
            return api_error(f"Failed to retrieve audio: {str(e)}", 502)

    return send_from_directory(cache_dir, mp3_filename, mimetype="audio/mpeg", conditional=True)

