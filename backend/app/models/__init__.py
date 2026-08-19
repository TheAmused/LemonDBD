# backend/app/models/__init__.py
"""
Models Package
Re-exports all database models so they can be imported directly from `app.models`.
This ensures SQLAlchemy registers all tables and relationships upon package import.
"""

from app.models.base import utcnow
from app.models.character import Character, Killer, Survivor
from app.models.community import (
    BugReport,
    CommunityBuild,
    CustomPerk,
    DailyQuest,
)
from app.models.equipment import Addon, Item
from app.models.gauntlet import (
    GauntletMatchException,
    GauntletMatchLog,
    GauntletRun,
)
from app.models.map import MapObjective, MapRealm, MapTile
from app.models.minigames import (
    DraftSession,
    GeneratorDrawnPerk,
    GeneratorSetting,
    GuesserStat,
)
from app.models.page_streak import PageStreakPageLog, PageStreakRun
from app.models.perk import Perk, PerkRule
from app.models.user import (
    User,
    UserCharacterOwnership,
    UserPerkOwnership,
)

__all__ = [
    "utcnow",
    "Character",
    "Survivor",
    "Killer",
    "Perk",
    "PerkRule",
    "Item",
    "Addon",
    "MapRealm",
    "MapTile",
    "MapObjective",
    "GauntletRun",
    "GauntletMatchLog",
    "GauntletMatchException",
    "GeneratorSetting",
    "GeneratorDrawnPerk",
    "PageStreakRun",
    "PageStreakPageLog",
    "DraftSession",
    "DailyQuest",
    "CommunityBuild",
    "CustomPerk",
    "GuesserStat",
    "BugReport",
    "User",
    "UserCharacterOwnership",
    "UserPerkOwnership",
]

