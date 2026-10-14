# backend/app/features/auth/routes.py
from app.routes.auth import auth_bp
from app.routes.auth_google import auth_google_bp
from app.routes.auth_two_factor import auth_two_factor_bp

__all__ = ["auth_bp", "auth_google_bp", "auth_two_factor_bp"]
