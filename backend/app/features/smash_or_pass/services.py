# backend/app/features/smash_or_pass/services.py
from app.services.smash_or_pass import (
    cast_batch_votes,
    cast_vote,
    get_leaderboard,
    get_or_create_user_stats,
    get_personal_history,
    get_preferences,
    get_random_pair,
    record_match,
    record_streak,
    reset_user_stats,
    update_preferences,
)
from app.services.smash_or_pass_service import SmashOrPassService

__all__ = [
    "SmashOrPassService",
    "get_random_pair",
    "cast_vote",
    "cast_batch_votes",
    "record_match",
    "record_streak",
    "get_leaderboard",
    "get_personal_history",
    "get_or_create_user_stats",
    "reset_user_stats",
    "get_preferences",
    "update_preferences",
]
