import json
import logging
import os
import secrets
import string
import urllib.request
from datetime import date, datetime, timezone
from typing import Any

from flask import Blueprint, current_app, g, jsonify, request, send_from_directory
from app.core.extensions import db
from app.core.limiter import limiter
from app.core.security import admin_required, get_current_user
from app.models.character import Killer
from app.models.minigame import (
    MinigameDailyChallenge,
    MinigameRepeatableChallenge,
    MinigameSharedLink,
    MinigameUserStat,
)
from app.services.minigame_service import MinigameService
from app.utils.lang import extract_lang

logger = logging.getLogger(__name__)

minigames_bp = Blueprint("minigames", __name__, url_prefix="/api/v1/minigames")
minigame_service = MinigameService()


def _generate_short_code(length: int = 7) -> str:
    """Generates a URL-safe random alphanumeric short code."""
    chars = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


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
            return jsonify({"error": "Invalid date format, expected YYYY-MM-DD"}), 400
    else:
        target_date = datetime.now(timezone.utc).date()

    lang = extract_lang()
    try:
        challenge = minigame_service.get_or_create_daily(game_mode=game_mode, target_date=target_date, lang=lang)
        return jsonify(challenge), 200
    except Exception as e:
        logger.error(f"Error fetching daily minigame: {e}")
        return jsonify({"error": "Failed to load daily challenge"}), 500


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
        return jsonify({"error": "Failed to create repeatable challenge"}), 500


@minigames_bp.route("/guess", methods=["POST"])
@limiter.limit("60 per minute")
def submit_guess():
    """Evaluates a guess against an active challenge round."""
    data = request.get_json(silent=True) or {}
    challenge_id = data.get("challenge_id")
    challenge_type = data.get("challenge_type", "daily")
    round_index = data.get("round_index", 0)
    guess_type = data.get("guess_type", "killer")
    guess_id = data.get("guess_id")
    attempt_number = data.get("attempt_number", 1)
    custom_round = data.get("custom_round_config") or data.get("custom_round")

    if guess_id is None:
        return jsonify({"error": "Missing guess_id"}), 400

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
        return jsonify({"error": "Challenge or round not found"}), 404

    result = minigame_service.evaluate_guess(
        round_data=round_data,
        guess_type=guess_type,
        guess_id=guess_id,
        attempt_number=attempt_number,
    )
    return jsonify(result), 200


@minigames_bp.route("/share", methods=["POST"])
@limiter.limit("15 per minute")
def share_custom_challenge():
    """Generates a shareable short-link and caches the challenge payload in PostgreSQL."""
    data = request.get_json(silent=True) or {}
    payload = (
        data.get("payload")
        or data.get("challenge_payload")
        or (data if "rounds" in data else {})
    )
    title = (payload.get("title", "") or "").strip() or "Custom DBD Trial"
    if len(title) > 100:
        title = title[:100]
    payload["title"] = title
    rounds = payload.get("rounds", [])

    if not rounds or not isinstance(rounds, list) or len(rounds) > 20:
        return jsonify({"error": "A custom challenge must have between 1 and 20 rounds"}), 400

    user = get_current_user()
    creator_id = user.id if user else None

    # Generate unique short code
    code = _generate_short_code()
    while db.session.query(MinigameSharedLink).filter_by(short_code=code).first():
        code = _generate_short_code()

    link = MinigameSharedLink(
        short_code=code,
        creator_user_id=creator_id,
        payload=payload,
        views_count=0,
    )

    db.session.add(link)
    db.session.commit()

    return jsonify({
        "short_code": code,
        "share_url": f"/minigames/play?c={code}",
        "created_at": link.created_at.isoformat(),
    }), 201


@minigames_bp.route("/share/<short_code>", methods=["GET"])
@minigames_bp.route("/shared/<short_code>", methods=["GET"])
def get_shared_challenge(short_code: str):
    """Retrieves a cached custom challenge by its short code."""
    link = db.session.query(MinigameSharedLink).filter_by(short_code=short_code).first()
    if not link:
        return jsonify({"error": "Challenge link not found or expired"}), 404

    link.views_count += 1
    db.session.commit()

    challenge_data = dict(link.payload) if isinstance(link.payload, dict) else {}
    challenge_data["id"] = f"shared_{link.short_code}"
    challenge_data["short_code"] = link.short_code
    return jsonify(challenge_data), 200


@minigames_bp.route("/official", methods=["POST"])
@minigames_bp.route("/daily", methods=["POST"])
@admin_required
def create_official_challenge():
    """Admin-only endpoint to author, publish, or seed official daily and featured trials."""
    data = request.get_json(silent=True) or {}
    challenge_date_str = data.get("challenge_date")
    game_mode = data.get("game_mode", "daily_trial")
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    rounds = data.get("rounds", [])

    if not title or not rounds:
        return jsonify({"error": "Title and rounds are required"}), 400

    if challenge_date_str:
        try:
            target_date = datetime.strptime(challenge_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid date format, expected YYYY-MM-DD"}), 400
    else:
        target_date = datetime.now().date()

    # Upsert daily challenge for date and mode
    existing = db.session.query(MinigameDailyChallenge).filter_by(
        challenge_date=target_date, game_mode=game_mode
    ).first()

    if existing:
        existing.title = title
        existing.description = description
        existing.rounds = rounds
        existing.is_active = True
        challenge = existing
    else:
        challenge = MinigameDailyChallenge(
            challenge_date=target_date,
            game_mode=game_mode,
            title=title,
            description=description,
            rounds=rounds,
            is_active=True,
        )
        db.session.add(challenge)

    db.session.commit()
    return jsonify(challenge.to_dict()), 201


@minigames_bp.route("/official", methods=["GET"])
def list_official_challenges():
    """Lists official daily challenges."""
    challenges = db.session.query(MinigameDailyChallenge).filter_by(is_active=True).order_by(
        MinigameDailyChallenge.challenge_date.desc()
    ).limit(30).all()
    return jsonify([c.to_dict() for c in challenges]), 200


@minigames_bp.route("/stats", methods=["GET"])
def get_user_stats():
    """Fetches user minigames streak and history stats."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    stats = db.session.query(MinigameUserStat).filter_by(user_id=user.id).all()
    stats_map = {s.game_mode: s.to_dict() for s in stats}
    return jsonify({"user_id": user.id, "stats": stats_map}), 200


@minigames_bp.route("/stats", methods=["POST"])
def update_user_stats():
    """Updates user win/streak minigame stats in PostgreSQL."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json(silent=True) or {}
    game_mode = data.get("game_mode", "classic")
    won = bool(data.get("won", False))
    attempts_taken = data.get("attempts_taken")
    today = datetime.now().date()

    stat = db.session.query(MinigameUserStat).filter_by(user_id=user.id, game_mode=game_mode).first()
    if not stat:
        stat = MinigameUserStat(
            user_id=user.id,
            game_mode=game_mode,
            current_streak=0,
            max_streak=0,
            total_played=0,
            total_won=0,
            guess_distribution={},
            last_played_date=today,
        )
        db.session.add(stat)

    stat.total_played += 1
    if won:
        stat.total_won += 1
        stat.current_streak += 1
        if stat.current_streak > stat.max_streak:
            stat.max_streak = stat.current_streak
        if attempts_taken is not None:
            dist = dict(stat.guess_distribution or {})
            key = str(attempts_taken)
            dist[key] = dist.get(key, 0) + 1
            stat.guess_distribution = dist
    else:
        stat.current_streak = 0

    stat.last_played_date = today
    db.session.commit()
    return jsonify(stat.to_dict()), 200


@minigames_bp.route("/audio/terror_radius/<int:killer_id>", methods=["GET"])
@limiter.limit("120 per minute")
def stream_killer_terror_radius(killer_id: int):
    """Streams official Dead by Daylight Terror Radius / Chase music for a given killer, caching locally."""
    killer = db.session.get(Killer, killer_id)
    if not killer:
        return jsonify({"error": "Killer not found"}), 404

    mp3_url = killer.chase_music_url
    if not mp3_url:
        return jsonify({"error": "Audio track not available for this killer"}), 404

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
            killer.chase_music_local_path = f"audio/cache/{mp3_filename}"
            db.session.commit()
        except Exception as e:
            logger.error(f"Failed to fetch audio for {killer.name} from wiki: {e}")
            return jsonify({"error": f"Failed to retrieve audio: {str(e)}"}), 502

    return send_from_directory(cache_dir, mp3_filename, mimetype="audio/mpeg", conditional=True)

