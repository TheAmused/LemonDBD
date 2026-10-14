# backend/app/features/smash_or_pass/routes.py
from app.routes.smash_or_pass import smash_or_pass_bp
from app.routes.smash_or_pass_preferences import smash_preferences_bp

__all__ = ["smash_or_pass_bp", "smash_preferences_bp"]
