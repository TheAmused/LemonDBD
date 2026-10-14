# backend/app/services/minigames/__init__.py
"""Minigame building blocks: catalog, round generation, guess evaluation."""
import warnings
from datetime import date
from typing import Any

from app.models.minigame import MinigameDailyChallenge, MinigameUserStat
from app.services.minigames.catalog import get_catalog
from app.services.minigames.daily import (
    create_repeatable,
    get_or_create_daily,
    record_minigame_round,
    update_killer_chase_music,
    upsert_daily_challenge,
)
from app.services.minigames.evaluation import evaluate_guess
from app.services.minigames.rounds import default_title_for_mode, generate_rounds_for_mode


class MinigameService:
    """Core domain logic for Dead by Daylight minigames and guesser challenges."""

    def __init__(self) -> None:
        warnings.warn(
            "MinigameService is deprecated; call domain functions from app.services.minigames directly.",
            DeprecationWarning,
            stacklevel=2,
        )

    def get_catalog(self, lang: str | None = None) -> dict[str, Any]:
        return get_catalog(lang)

    def get_or_create_daily(self, game_mode: str, target_date: date, lang: str | None = None) -> dict[str, Any]:
        return get_or_create_daily(game_mode, target_date, lang)

    def create_repeatable(
        self,
        game_mode: str,
        session_id: str,
        custom_rounds: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        return create_repeatable(game_mode, session_id, custom_rounds)

    def evaluate_guess(
        self,
        round_data: dict[str, Any],
        guess_type: str,
        guess_id: int,
        attempt_number: int = 1,
    ) -> dict[str, Any]:
        return evaluate_guess(round_data, guess_type, guess_id, attempt_number)

    def upsert_daily_challenge(
        self,
        game_mode: str,
        title: str,
        description: str,
        rounds: list[dict[str, Any]],
        target_date: date,
    ) -> MinigameDailyChallenge:
        return upsert_daily_challenge(game_mode, title, description, rounds, target_date)

    def record_minigame_round(
        self,
        user_id: int,
        game_mode: str,
        won: bool,
        attempts: int | None = None,
    ) -> MinigameUserStat:
        return record_minigame_round(user_id, game_mode, won, attempts)

    def update_killer_chase_music(self, killer_id: int, local_path: str) -> None:
        update_killer_chase_music(killer_id, local_path)


__all__ = [
    "get_catalog",
    "get_or_create_daily",
    "create_repeatable",
    "evaluate_guess",
    "upsert_daily_challenge",
    "record_minigame_round",
    "update_killer_chase_music",
    "default_title_for_mode",
    "generate_rounds_for_mode",
    "MinigameService",
]
