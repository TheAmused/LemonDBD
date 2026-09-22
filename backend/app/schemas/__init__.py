# backend/app/schemas/__init__.py
"""Request/response validation DTOs.

Only `user.py` has a reader (`app/routes/users.py`). The rest, `character.py`/
`map.py`/`perk.py` included, have no reader -- this layer validates nothing at
request time today. `character.py`, `map.py` and `perk.py` were deleted once
already: a `Character` with a `role` discriminator and nested killer profile,
`Perk.category`, `MapTile`/`MapObjective` and the rest had become a second
hand-maintained description of the models that drifted from the real ones.
They are re-added here rebuilt against the current `survivors`/`killers`
split, `perks.role`, and `map_realms` shapes -- see each module's docstring --
so the same drift doesn't happen silently a second time; keeping them
accurate as the models change is still on whoever changes the models next.
"""

from app.schemas.admin import (
    AdminAuditLogResponse,
    ChallengeModeSettingBase,
    ChallengeModeSettingResponse,
)
from app.schemas.character import (
    KillerBase,
    KillerPowerResponse,
    KillerResponse,
    SurvivorBase,
    SurvivorResponse,
)
from app.schemas.map import (
    MapRealmBase,
    MapRealmResponse,
    MapSourceBase,
    MapSourceResponse,
    RealmBase,
    RealmResponse,
)
from app.schemas.perk import PerkBase, PerkResponse
from app.schemas.community import (
    BugReportBase,
    BugReportCreate,
    BugReportResponse,
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
from app.schemas.smash_or_pass import (
    EntityOut,
    EntityResponse,
    EntityStatResponse,
    RosterOut,
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
    "BugReportBase",
    "BugReportCreate",
    "BugReportResponse",
    "ChallengeModeSettingBase",
    "ChallengeModeSettingResponse",
    "AdminAuditLogResponse",
    "EntityOut",
    "EntityResponse",
    "EntityStatResponse",
    "RosterOut",
    "RosterResponse",
    "VoteCreate",
    "VoteResponse",
    "SurvivorBase",
    "SurvivorResponse",
    "KillerBase",
    "KillerResponse",
    "KillerPowerResponse",
    "RealmBase",
    "RealmResponse",
    "MapSourceBase",
    "MapSourceResponse",
    "MapRealmBase",
    "MapRealmResponse",
    "PerkBase",
    "PerkResponse",
]
