# backend/app/features/streaks/routes.py
from app.routes.challenge_completions import challenge_completions_bp
from app.routes.chaos_streak import chaos_streak_bp
from app.routes.gauntlet_streak import gauntlet_streak_bp
from app.routes.history_streak import history_streak_bp
from app.routes.id_please_streak import (
    id_please_killer_streak_bp,
    id_please_streak_bp,
    id_please_survivor_streak_bp,
)
from app.routes.page_streak import page_streak_bp

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
