# backend/app/services/minigames/__init__.py
"""Minigame building blocks: catalog, round generation, guess evaluation."""
from app.services.minigames.catalog import get_catalog
from app.services.minigames.daily import (
    GENERATED_MODES,
    create_repeatable,
    get_or_create_daily,
    public_challenge,
    public_rounds,
    purge_expired_repeatables,
    update_killer_chase_music,
    upsert_daily_challenge,
)
from app.services.minigames.evaluation import evaluate_guess
from app.services.minigames.rounds import default_title_for_mode, generate_rounds_for_mode

__all__ = [
    "GENERATED_MODES",
    "get_catalog",
    "get_or_create_daily",
    "create_repeatable",
    "evaluate_guess",
    "public_challenge",
    "public_rounds",
    "purge_expired_repeatables",
    "upsert_daily_challenge",
    "update_killer_chase_music",
    "default_title_for_mode",
    "generate_rounds_for_mode",
]
