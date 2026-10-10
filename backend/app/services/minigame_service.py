# backend/app/services/minigame_service.py
"""Core domain logic for Dead by Daylight minigames and guesser challenges.

`MinigameService` owns the daily / repeatable challenge lifecycle; catalog lookup, round
generation and guess scoring live in `app.services.minigames`.
"""
import hashlib
import random
from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.core.extensions import db
from app.models.minigame import MinigameDailyChallenge, MinigameRepeatableChallenge
from app.services.minigames.catalog import get_catalog
from app.services.minigames.evaluation import evaluate_guess
from app.services.minigames.rounds import default_title_for_mode, generate_rounds_for_mode


class MinigameService:
    """Core domain logic for Dead by Daylight minigames and guesser challenges."""

    def get_catalog(self, lang: str | None = None) -> dict[str, Any]:
        """Returns full searchable catalog of characters, perks, realms, and powers."""
        return get_catalog(lang)

    def get_or_create_daily(self, game_mode: str, target_date: date, lang: str | None = None) -> dict[str, Any]:
        """Fetches cached daily challenge from PostgreSQL, or deterministically generates it."""
        existing = db.session.query(MinigameDailyChallenge).filter_by(
            challenge_date=target_date, game_mode=game_mode, is_active=True
        ).first()

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
        db.session.add(daily)
        db.session.commit()

        return daily.to_dict()

    def create_repeatable(self, game_mode: str, session_id: str, custom_rounds: list[dict[str, Any]] | None = None) -> dict[str, Any]:
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
        db.session.add(rep)
        db.session.commit()

        return rep.to_dict()

    def evaluate_guess(self, round_data: dict[str, Any], guess_type: str, guess_id: int, attempt_number: int = 1) -> dict[str, Any]:
        """Evaluates a guess against round_data, returning mode-specific feedback."""
        return evaluate_guess(round_data, guess_type, guess_id, attempt_number)
