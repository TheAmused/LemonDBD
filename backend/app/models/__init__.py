# backend/app/models/__init__.py
"""
Models Package
Re-exports all database models so they can be imported directly from `app.models`.
Ensures SQLAlchemy registers all tables and polymorphic relationships upon package import.
"""

from app.models.base import utcnow
from app.models.admin import AdminAuditLog, ChallengeModeSetting, SeedUpdateLog
from app.models.changelog import ChangelogPost
from app.models.chapter import Chapter
from app.models.character import Character, Killer, Survivor
from app.models.chaos import ChaosMatchLog, ChaosRun
from app.models.history import HistoryMatchLog, HistoryRun
from app.models.community import (
    BugReport,
    CommunityBuild,
    CustomPerk,
    DailyQuest,
)
from app.models.equipment import Addon, Item, Offering
from app.models.gauntlet import (
    GauntletMatchLog,
    GauntletRun,
)
from app.models.map import MapObjective, MapRealm, MapTile, Realm
from app.models.minigames import (
    DraftSession,
    GuesserStat,
    ScraperSetting,
)
from app.models.page_streak import PageStreakPageLog, PageStreakRun
from app.models.perk import Perk, PerkRule
from app.models.smash_or_pass import (
    Entity,
    EntityStat,
    Roster,
    Translation,
    Vote,
)
from app.models.user import (
    User,
    UserCharacterOwnership,
    UserPerkOwnership,
    UserShowcase,
)

__all__ = [
    "utcnow",
    "Chapter",
    "Character",
    "ChaosRun",
    "ChaosMatchLog",
    "HistoryRun",
    "HistoryMatchLog",
    "Survivor",
    "Killer",
    "Perk",
    "PerkRule",
    "Item",
    "Addon",
    "Offering",
    "Realm",
    "MapRealm",
    "MapTile",
    "MapObjective",
    "GauntletRun",
    "GauntletMatchLog",
    "ScraperSetting",
    "PageStreakRun",
    "PageStreakPageLog",
    "DraftSession",
    "DailyQuest",
    "CommunityBuild",
    "CustomPerk",
    "GuesserStat",
    "Roster",
    "Entity",
    "EntityStat",
    "Vote",
    "Translation",
    "BugReport",
    "User",
    "UserCharacterOwnership",
    "UserPerkOwnership",
    "UserShowcase",
    "ChallengeModeSetting",
    "AdminAuditLog",
    "SeedUpdateLog",
    "ChangelogPost",
]
