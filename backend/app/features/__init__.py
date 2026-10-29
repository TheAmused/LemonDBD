# backend/app/features/__init__.py
"""Vertical slice feature module registration."""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from flask import Flask


def register_feature_blueprints(app: "Flask") -> None:
    """Register all vertical slice blueprints with the Flask application."""
    from app.features.admin import admin_control_bp, admin_tools_bp, bug_reports_bp, changelog_bp
    from app.features.auth import auth_bp, auth_google_bp, auth_two_factor_bp
    from app.features.maps import maps_bp
    from app.features.minigames import minigames_bp, scoreboard_bp
    from app.features.perks import perks_bp, synergy_bp
    from app.features.smash_or_pass import smash_or_pass_bp, smash_preferences_bp
    from app.features.streaks import (
        challenge_completions_bp,
        chaos_streak_bp,
        gauntlet_streak_bp,
        history_streak_bp,
        id_please_killer_streak_bp,
        id_please_streak_bp,
        id_please_survivor_streak_bp,
        page_streak_bp,
    )
    from app.features.tier_lists import tier_lists_bp
    from app.features.users import avatars_bp, privacy_bp, user_preferences_bp, users_bp
    from app.routes.content_moderation import content_moderation_bp
    from app.routes.site_config import site_config_bp

    blueprints = [
        # Auth & Users
        auth_bp,
        auth_two_factor_bp,
        auth_google_bp,
        users_bp,
        avatars_bp,
        privacy_bp,
        user_preferences_bp,
        # Core Catalogs
        perks_bp,
        synergy_bp,
        maps_bp,
        # Streaks & Challenges
        page_streak_bp,
        challenge_completions_bp,
        gauntlet_streak_bp,
        chaos_streak_bp,
        history_streak_bp,
        id_please_streak_bp,
        id_please_survivor_streak_bp,
        id_please_killer_streak_bp,
        # Community & Minigames
        smash_or_pass_bp,
        smash_preferences_bp,
        tier_lists_bp,
        minigames_bp,
        scoreboard_bp,
        # Governance & System
        bug_reports_bp,
        admin_control_bp,
        admin_tools_bp,
        changelog_bp,
        content_moderation_bp,
        site_config_bp,
    ]

    for bp in blueprints:
        app.register_blueprint(bp)
