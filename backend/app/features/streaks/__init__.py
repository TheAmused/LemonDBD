# backend/app/features/streaks/__init__.py
from app.features.streaks.routes import (
    challenge_completions_bp,
    chaos_streak_bp,
    gauntlet_streak_bp,
    history_streak_bp,
    id_please_killer_streak_bp,
    id_please_streak_bp,
    id_please_survivor_streak_bp,
    page_streak_bp,
)

__all__ = [
    "page_streak_bp",
    "challenge_completions_bp",
    "gauntlet_streak_bp",
    "chaos_streak_bp",
    "history_streak_bp",
    "id_please_streak_bp",
    "id_please_survivor_streak_bp",
    "id_please_killer_streak_bp",
]
