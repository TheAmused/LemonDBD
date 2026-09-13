# backend/app/schemas/__init__.py
"""Request/response validation DTOs.

Only `user.py` has a reader (`app/routes/users.py`). The chapter, character,
map and perk modules were deleted: nothing imported them, and they had become a
second hand-maintained description of the models that drifted from the real
ones -- still declaring `MapTile`, `MapObjective`, a `Character` with a `role`
discriminator and a nested killer profile, and `Perk.category`.

The modules still listed below have no reader either. They are kept for now
because, unlike those four, they do not describe anything that was deleted.
"""

from app.schemas.admin import (
    AdminAuditLogResponse,
    ChallengeModeSettingBase,
    ChallengeModeSettingResponse,
)
from app.schemas.community import (
    BugReportBase,
    BugReportCreate,
    BugReportResponse,
    CommunityBuildBase,
    CommunityBuildCreate,
    CommunityBuildResponse,
    CustomPerkBase,
    CustomPerkCreate,
    CustomPerkResponse,
    DailyQuestBase,
    DailyQuestResponse,
)
from app.schemas.equipment import (
    ItemAddonBase,
    ItemAddonResponse,
    ItemBase,
    ItemCategoryBase,
    ItemCategoryResponse,
    ItemResponse,
    KillerAddonBase,
    KillerAddonResponse,
    OfferingBase,
    OfferingResponse,
)
from app.schemas.gauntlet import (
    GauntletMatchLogBase,
    GauntletMatchLogResponse,
    GauntletRunBase,
    GauntletRunCreate,
    GauntletRunResponse,
)
from app.schemas.chaos import (
    ChaosMatchLogBase,
    ChaosMatchLogResponse,
    ChaosRunBase,
    ChaosRunResponse,
)
from app.schemas.history import (
    HistoryMatchLogBase,
    HistoryMatchLogResponse,
    HistoryRunBase,
    HistoryRunResponse,
)
from app.schemas.minigames import (
    DraftSessionBase,
    DraftSessionResponse,
    GuesserStatBase,
    GuesserStatResponse,
)
from app.schemas.page_streak import (
    PageStreakPageLogBase,
    PageStreakPageLogResponse,
    PageStreakRunBase,
    PageStreakRunCreate,
    PageStreakRunResponse,
)
from app.schemas.smash_or_pass import (
    EntityResponse,
    EntityStatResponse,
    RosterResponse,
    VoteCreate,
    VoteResponse,
)
from app.schemas.user import (
    UserBase,
    UserCharacterOwnershipBase,
    UserCharacterOwnershipResponse,
    UserCreate,
    UserPerkOwnershipBase,
    UserPerkOwnershipResponse,
    UserResponse,
    UserUpdate,
)

__all__ = [
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserCharacterOwnershipBase",
    "UserCharacterOwnershipResponse",
    "UserPerkOwnershipBase",
    "UserPerkOwnershipResponse",
    "ItemBase",
    "ItemResponse",
    "ItemCategoryBase",
    "ItemCategoryResponse",
    "KillerAddonBase",
    "KillerAddonResponse",
    "ItemAddonBase",
    "ItemAddonResponse",
    "OfferingBase",
    "OfferingResponse",
    "GauntletRunBase",
    "GauntletRunCreate",
    "GauntletRunResponse",
    "GauntletMatchLogBase",
    "GauntletMatchLogResponse",
    "ChaosRunBase",
    "ChaosRunResponse",
    "ChaosMatchLogBase",
    "ChaosMatchLogResponse",
    "HistoryRunBase",
    "HistoryRunResponse",
    "HistoryMatchLogBase",
    "HistoryMatchLogResponse",
    "PageStreakRunBase",
    "PageStreakRunCreate",
    "PageStreakRunResponse",
    "PageStreakPageLogBase",
    "PageStreakPageLogResponse",
    "DraftSessionBase",
    "DraftSessionResponse",
    "GuesserStatBase",
    "GuesserStatResponse",
    "DailyQuestBase",
    "DailyQuestResponse",
    "CommunityBuildBase",
    "CommunityBuildCreate",
    "CommunityBuildResponse",
    "CustomPerkBase",
    "CustomPerkCreate",
    "CustomPerkResponse",
    "BugReportBase",
    "BugReportCreate",
    "BugReportResponse",
    "ChallengeModeSettingBase",
    "ChallengeModeSettingResponse",
    "AdminAuditLogResponse",
    "EntityResponse",
    "EntityStatResponse",
    "RosterResponse",
    "VoteCreate",
    "VoteResponse",
]
