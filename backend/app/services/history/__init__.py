# backend/app/services/history/__init__.py
from app.services.history.stats import fetch_history_user_stats

__all__ = [
    "fetch_history_user_stats",
]
