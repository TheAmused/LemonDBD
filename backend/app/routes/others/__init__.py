# backend/app/routes/others/__init__.py
from .draft import draft_bp
from .quests import quests_bp
from .killer_calc import killer_calc_bp
from .builds import builds_bp
from .custom_perks import custom_perks_bp
from .guesser import guesser_bp
from .smash_or_pass import smash_or_pass_bp

__all__ = [
    "draft_bp",
    "quests_bp",
    "killer_calc_bp",
    "builds_bp",
    "custom_perks_bp",
    "guesser_bp",
    "smash_or_pass_bp",
]
