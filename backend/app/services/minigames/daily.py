# backend/app/services/minigames/daily.py
import hashlib
import random
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.core.transaction import transaction
from app.models.character import Killer
from app.models.minigame import MinigameDailyChallenge, MinigameRepeatableChallenge, MinigameUserStat
from app.services.minigames.rounds import default_title_for_mode, generate_rounds_for_mode


def get_or_create_daily(game_mode: str, target_date: date, lang: str | None = None) -> dict[str, Any]:
    """Fetches cached daily challenge from PostgreSQL, or deterministically generates it."""
    existing = db.session.scalar(
        select(MinigameDailyChallenge).where(
            MinigameDailyChallenge.challenge_date == target_date,
            MinigameDailyChallenge.game_mode == game_mode,
            MinigameDailyChallenge.is_active.is_(True),
        )
    )

    if existing:
        return existing.to_dict()

    # Generate deterministic daily challenge using date seed
    seed_str = f"{target_date.isoformat()}:{game_mode}"
    seed_int = int(hashlib.sha256(seed_str.encode("utf-8")).hexdigest(), 16) % (2**32)
    rng = random.Random(seed_int)

    rounds = generate_rounds_for_mode(game_mode, rng)
    title = default_title_for_mode(game_mode, target_date)

    daily = MinigameDailyChallenge(
        challenge_date=target_date,
        game_mode=game_mode,
        title=title,
        description=f"Official daily {game_mode.replace('_', ' ').title()} for {target_date.isoformat()}.",
        rounds=rounds,
        is_active=True,
    )
    with transaction():
        db.session.add(daily)

    return daily.to_dict()


def create_repeatable(
    game_mode: str,
    session_id: str,
    custom_rounds: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Generates an ephemeral repeatable challenge session cached in PostgreSQL with 24h TTL."""
    rng = random.Random()
    rounds = custom_rounds if custom_rounds else generate_rounds_for_mode(game_mode, rng)

    rep = MinigameRepeatableChallenge(
        session_id=session_id,
        game_mode=game_mode,
        title=f"Repeatable {game_mode.replace('_', ' ').title()}",
        rounds=rounds,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    with transaction():
        db.session.add(rep)

    return rep.to_dict()


def upsert_daily_challenge(
    game_mode: str,
    title: str,
    description: str,
    rounds: list[dict[str, Any]],
    target_date: date,
) -> MinigameDailyChallenge:
    """Creates or updates an official daily challenge within an atomic transaction."""
    with transaction():
        existing = db.session.scalar(
            select(MinigameDailyChallenge).where(
                MinigameDailyChallenge.challenge_date == target_date,
                MinigameDailyChallenge.game_mode == game_mode,
            )
        )
        if existing:
            existing.title = title
            existing.description = description
            existing.rounds = rounds
            existing.is_active = True
            return existing
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
            return challenge


def record_minigame_round(
    user_id: int,
    game_mode: str,
    won: bool,
    attempts: int | None = None,
) -> MinigameUserStat:
    """Updates user streaks and guess distributions atomically."""
    with transaction():
        stat = db.session.scalar(
            select(MinigameUserStat).where(
                MinigameUserStat.user_id == user_id,
                MinigameUserStat.game_mode == game_mode,
            )
        )
        today = datetime.now(timezone.utc).date()
        if not stat:
            stat = MinigameUserStat(
                user_id=user_id,
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
            if attempts is not None:
                dist = dict(stat.guess_distribution or {})
                key = str(attempts)
                dist[key] = dist.get(key, 0) + 1
                stat.guess_distribution = dist
        else:
            stat.current_streak = 0

        stat.last_played_date = today
        return stat


def update_killer_chase_music(killer_id: int, local_path: str) -> None:
    """Updates the cached chase music path for a killer atomically."""
    with transaction():
        killer = db.session.get(Killer, killer_id)
        if killer:
            killer.chase_music_local_path = local_path
