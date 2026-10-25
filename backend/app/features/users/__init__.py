# backend/app/features/users/__init__.py
from app.features.users.routes import avatars_bp, privacy_bp, user_preferences_bp, users_bp

__all__ = ["users_bp", "avatars_bp", "privacy_bp", "user_preferences_bp"]
