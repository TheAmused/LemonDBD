# backend/app/features/smash_or_pass/__init__.py
from app.features.smash_or_pass.routes import (
    smash_or_pass_bp,
    smash_preferences_bp,
)

__all__ = ["smash_or_pass_bp", "smash_preferences_bp"]
