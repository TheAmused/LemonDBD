# backend/app/features/users/routes.py
from app.routes.avatars import avatars_bp
from app.routes.privacy import privacy_bp
from app.routes.user_preferences import user_preferences_bp
from app.routes.users import users_bp

__all__ = ["users_bp", "avatars_bp", "privacy_bp", "user_preferences_bp"]
