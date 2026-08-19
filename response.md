
```text
backend/app/schemas/
├── __init__.py          # Centralized export of all schemas
├── user.py              # User authentication, profiles, and ownerships
├── character.py         # Characters, Killer powers, and combat stats
├── perk.py              # Perks and perk-generation rules
├── equipment.py         # Items and Add-ons
├── map.py               # Map realms, tiles, and objectives
├── gauntlet.py          # Gauntlet runs, match logs, and exceptions
├── page_streak.py       # Page streak runs and page logs
├── minigames.py         # Draft sessions, Generator settings, Guesser stats
└── community.py         # Community builds, Custom perks, Daily quests, Bug reports

```

---

### Code Implementation

#### 1. `backend/app/schemas/user.py`

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: str = Field(default="user", max_length=20)
    avatar_url: str = Field(default="default_avatar", max_length=255)
    is_active: bool = True


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Optional[str] = "user"
    avatar_url: Optional[str] = "default_avatar"


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)


class UserResponse(UserBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserCharacterOwnershipBase(BaseModel):
    user_id: int
    character_id: int
    is_owned: bool = True


class UserCharacterOwnershipResponse(UserCharacterOwnershipBase):
    id: int
    character_name: Optional[str] = None
    character_role: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserPerkOwnershipBase(BaseModel):
    user_id: int
    perk_id: int
    is_unlocked: bool = True


class UserPerkOwnershipResponse(UserPerkOwnershipBase):
    id: int
    perk_name: Optional[str] = None
    perk_category: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

```

---

#### 2. `backend/app/schemas/character.py`

```python
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class KillerPowerSchema(BaseModel):
    name: str = ""
    description: str = ""
    icon_url: str = ""
    icon_local_path: str = ""
    movement_speed: str = "4.6 m/s (115%)"
    terror_radius: str = "32 m"
    terror_radius_meters: int = 32
    height: str = "Tall"


class CharacterBase(BaseModel):
    name: str = Field(..., max_length=100)
    role: str = Field(..., max_length=20)
    code_prefix: Optional[str] = Field(None, max_length=10)
    portrait_url: Optional[str] = Field(None, max_length=255)
    real_name: Optional[str] = Field(None, max_length=100)
    short_name: Optional[str] = Field(None, max_length=50)
    wiki_slug: Optional[str] = Field(None, max_length=100)
    avatar_local_path: Optional[str] = Field(None, max_length=255)
    release_number: Optional[int] = None
    chapter_name: Optional[str] = Field("Base Game", max_length=150)
    chapter_number: Optional[str] = Field(None, max_length=50)
    dlc_type: Optional[str] = Field("original_chapter", max_length=50)
    is_licensed: Optional[bool] = False
    release_year: Optional[int] = 2016
    release_date: Optional[str] = Field(None, max_length=50)
    dlc_counterparts: Optional[str] = None
    lore: Optional[str] = None

    # Killer specifics
    power_name: Optional[str] = Field(None, max_length=150)
    power_description: Optional[str] = None
    power_icon_url: Optional[str] = Field(None, max_length=500)
    movement_speed: Optional[str] = Field(None, max_length=100)
    terror_radius: Optional[str] = Field(None, max_length=100)
    terror_radius_meters: Optional[int] = None
    height: Optional[str] = Field(None, max_length=50)


class CharacterCreate(CharacterBase):
    pass


class CharacterResponse(BaseModel):
    id: int
    name: str
    role: str
    category: str
    code_prefix: Optional[str] = None
    portrait_url: Optional[str] = None
    real_name: str
    short_name: str
    wiki_slug: str
    avatar_url: str
    avatar_local_path: str
    release_number: Optional[int] = None
    chapter_name: str
    chapter_number: str
    dlc_type: str
    is_licensed: bool
    release_year: int
    release_date: str
    dlc_counterparts: List[str] = []
    lore: str
    power: Optional[KillerPowerSchema] = None

    model_config = ConfigDict(from_attributes=True)

```

---

#### 3. `backend/app/schemas/perk.py`

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PerkBase(BaseModel):
    name: str = Field(..., max_length=150)
    alternate_name: Optional[str] = Field(None, max_length=150)
    is_generic_counterpart: bool = False
    is_teachable: bool = True
    category: str = Field(default="Survivor", max_length=20)
    description: str = ""
    icon_url: Optional[str] = Field(None, max_length=500)
    icon_local_path: Optional[str] = Field(None, max_length=255)
    character_id: Optional[int] = None


class PerkCreate(PerkBase):
    pass


class PerkResponse(PerkBase):
    id: int
    character: Optional[str] = "General"
    character_real_name: Optional[str] = "General"
    character_avatar_path: Optional[str] = ""

    model_config = ConfigDict(from_attributes=True)


class PerkRuleBase(BaseModel):
    name: str = Field(..., max_length=150)
    is_default: bool = False
    slot1_type: str = "character_own"
    slot2_type: str = "character_own"
    slot3_type: str = "general_role"
    slot4_type: str = "any_role"


class PerkRuleResponse(PerkRuleBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

```

---

#### 4. `backend/app/schemas/equipment.py`

```python
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ItemBase(BaseModel):
    name: str = Field(..., max_length=150)
    category: str = Field(default="", max_length=50)
    role: str = Field(default="Survivor", max_length=20)
    description: str = ""
    icon_url: Optional[str] = Field(None, max_length=500)
    icon_local_path: Optional[str] = Field(None, max_length=255)
    rarity: Optional[str] = Field(None, max_length=50)


class ItemResponse(ItemBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class AddonBase(BaseModel):
    name: str = Field(..., max_length=150)
    associated_target: Optional[str] = Field(None, max_length=100)
    category: str = Field(default="", max_length=50)
    description: str = ""
    icon_url: Optional[str] = Field(None, max_length=500)
    icon_local_path: Optional[str] = Field(None, max_length=255)
    rarity: Optional[str] = Field(None, max_length=50)


class AddonResponse(AddonBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

```

---

#### 5. `backend/app/schemas/map.py`

```python
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class MapPosition(BaseModel):
    x: float
    y: float


class MapTileBase(BaseModel):
    seed_variant: str = "seed_a"
    floor: int = 1
    name: str = Field(..., max_length=100)
    type: str = Field(..., max_length=50)
    x: float
    y: float
    has_pallet: bool = False
    pallet_safety_rating: Optional[str] = Field(None, max_length=20)
    has_window: bool = False
    vault_directions: str = "[]"
    looping_tips: str = ""
    mindgame_counter: str = ""


class MapTileResponse(BaseModel):
    name: str
    type: str
    position: MapPosition
    has_pallet: bool
    pallet_safety_rating: Optional[str] = None
    has_window: bool
    vault_directions: str
    looping_tips: str
    mindgame_counter: str
    seed_variant: str
    floor: int

    model_config = ConfigDict(from_attributes=True)


class MapObjectiveBase(BaseModel):
    seed_variant: str = "seed_a"
    floor: int = 1
    type: str = Field(..., max_length=50)
    x: float
    y: float
    location_description: str = ""


class MapObjectiveResponse(BaseModel):
    type: str
    position: MapPosition
    location_description: str
    seed_variant: str
    floor: int

    model_config = ConfigDict(from_attributes=True)


class MapRealmBase(BaseModel):
    map_id: str = Field(..., max_length=100)
    name: str = Field(..., max_length=150)
    realm: str = Field(..., max_length=100)
    realm_id: Optional[str] = Field(None, max_length=100)
    source: Optional[str] = "hens333"
    source_label: Optional[str] = "Hens333 12-Clock Callouts"
    layout_type: Optional[str] = None
    jungle_gyms_count: int = 0
    totem_spawns_count: int = 5
    pallet_density: Optional[str] = None
    shack_has_basement: bool = True
    description: Optional[str] = None
    image_url: Optional[str] = None
    callout_image_url: Optional[str] = None
    callout_image_local_path: Optional[str] = None


class MapRealmResponse(BaseModel):
    id: str
    name: str
    realm: str
    realm_id: Optional[str] = ""
    source: str
    source_label: str
    callout_image_url: str
    callout_image_local_path: str
    image_url: str
    layout_type: Optional[str] = None
    jungle_gyms_count: int
    totem_spawns_count: int
    pallet_density: Optional[str] = None
    shack_has_basement: bool
    description: Optional[str] = None
    tiles: List[MapTileResponse] = []
    objectives: List[MapObjectiveResponse] = []

    model_config = ConfigDict(from_attributes=True)

```

---

#### 6. `backend/app/schemas/gauntlet.py`

```python
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class GauntletMatchLogBase(BaseModel):
    role: str
    character_id: str
    result: str
    perks: List[Any] = []
    streak_before: int
    streak_after: int


class GauntletMatchLogResponse(GauntletMatchLogBase):
    id: int
    run_id: int
    timestamp: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GauntletMatchExceptionBase(BaseModel):
    character_id: str
    reason: str


class GauntletMatchExceptionResponse(GauntletMatchExceptionBase):
    id: int
    run_id: int
    timestamp: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GauntletRunBase(BaseModel):
    role: str
    status: str = "in_progress"
    current_character_id: str
    current_streak: int = 0
    best_streak: int = 0
    last_checkpoint_streak: int = 0


class GauntletRunCreate(BaseModel):
    user_id: int
    role: str
    starting_character_id: str


class GauntletRunResponse(GauntletRunBase):
    id: int
    user_id: int
    completed_characters: List[str] = []
    checkpoint_characters: List[str] = []
    current_loadout: Dict[str, Any] = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

```

---

#### 7. `backend/app/schemas/page_streak.py`

```python
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PageStreakPageLogBase(BaseModel):
    attempt: int
    page_number: int
    perks: List[Any] = []
    result: str


class PageStreakPageLogResponse(PageStreakPageLogBase):
    id: int
    run_id: int
    timestamp: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PageStreakRunBase(BaseModel):
    killer: str
    status: str = "in_progress"
    attempt: int = 1
    current_page: int = 1
    best_page: int = 0


class PageStreakRunCreate(BaseModel):
    user_id: int
    killer: str


class PageStreakRunResponse(PageStreakRunBase):
    id: int
    user_id: int
    pages: List[Any] = []
    snapshot_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

```

---

#### 8. `backend/app/schemas/minigames.py`

```python
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class GeneratorSettingBase(BaseModel):
    role: str = "Survivor"
    gen_mode: str = "instant"
    no_repeat_perks: bool = True
    total_pages: int = 12
    perks_per_page: int = 15
    last_page_perks: int = 8
    spin_duration_sec: float = 3.0


class GeneratorSettingResponse(GeneratorSettingBase):
    id: int
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GeneratorDrawnPerkBase(BaseModel):
    role: str
    perk_name: str


class GeneratorDrawnPerkResponse(GeneratorDrawnPerkBase):
    id: int
    drawn_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DraftSessionBase(BaseModel):
    room_code: str
    phase: str = "bans"
    banned_perks: List[str] = []
    picked_survivor_perks: List[str] = []
    picked_killer_perks: List[str] = []


class DraftSessionResponse(DraftSessionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GuesserStatBase(BaseModel):
    guesser_type: str
    current_streak: int = 0
    best_streak: int = 0
    total_guesses: int = 0
    correct_guesses: int = 0


class GuesserStatResponse(GuesserStatBase):
    id: int
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

```

---

#### 9. `backend/app/schemas/community.py`

```python
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DailyQuestBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: str
    category: str = Field(..., max_length=20)
    progress: int = 0
    goal: int = 1
    xp_reward: int = 500
    is_completed: bool = False


class DailyQuestResponse(DailyQuestBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CommunityBuildBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: str
    role: str = Field(..., max_length=20)
    category: str = Field(..., max_length=50)
    character_id: str = "all"
    perks: List[str] = []
    upvotes: int = 0
    author: str = "Community"


class CommunityBuildCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str
    role: str
    category: str
    character_id: str = "all"
    perks: List[str] = Field(..., max_length=4)


class CommunityBuildResponse(CommunityBuildBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CustomPerkBase(BaseModel):
    name: str = Field(..., max_length=150)
    role: str = Field(..., max_length=20)
    character_name: str = "Teachable"
    rarity: str = "Very Rare"
    icon_preset: str = "sparkles"
    description: str
    upvotes: int = 0
    author: str = "Community"


class CustomPerkCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    role: str
    character_name: Optional[str] = "Teachable"
    rarity: Optional[str] = "Very Rare"
    icon_preset: Optional[str] = "sparkles"
    description: str = Field(..., min_length=5)


class CustomPerkResponse(CustomPerkBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BugReportBase(BaseModel):
    reporter_name: str = Field(..., max_length=100)
    reporter_email: Optional[str] = Field(None, max_length=150)
    title: str = Field(..., max_length=200)
    category: str = Field("General", max_length=50)
    message: str
    images: List[str] = []


class BugReportCreate(BugReportBase):
    user_id: Optional[int] = None


class BugReportResponse(BugReportBase):
    id: int
    user_id: Optional[int] = None
    status: str
    admin_notes: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

```

---

#### 10. `backend/app/schemas/__init__.py`

```python
"""
Schemas Package
Exports all request and response validation DTOs.
"""

from app.schemas.character import (
    CharacterBase,
    CharacterCreate,
    CharacterResponse,
    KillerPowerSchema,
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
    AddonBase,
    AddonResponse,
    ItemBase,
    ItemResponse,
)
from app.schemas.gauntlet import (
    GauntletMatchExceptionBase,
    GauntletMatchExceptionResponse,
    GauntletMatchLogBase,
    GauntletMatchLogResponse,
    GauntletRunBase,
    GauntletRunCreate,
    GauntletRunResponse,
)
from app.schemas.map import (
    MapObjectiveBase,
    MapObjectiveResponse,
    MapPosition,
    MapRealmBase,
    MapRealmResponse,
    MapTileBase,
    MapTileResponse,
)
from app.schemas.minigames import (
    DraftSessionBase,
    DraftSessionResponse,
    GeneratorDrawnPerkBase,
    GeneratorDrawnPerkResponse,
    GeneratorSettingBase,
    GeneratorSettingResponse,
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
from app.schemas.perk import (
    PerkBase,
    PerkCreate,
    PerkResponse,
    PerkRuleBase,
    PerkRuleResponse,
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
    "CharacterBase",
    "CharacterCreate",
    "CharacterResponse",
    "KillerPowerSchema",
    "PerkBase",
    "PerkCreate",
    "PerkResponse",
    "PerkRuleBase",
    "PerkRuleResponse",
    "ItemBase",
    "ItemResponse",
    "AddonBase",
    "AddonResponse",
    "MapPosition",
    "MapTileBase",
    "MapTileResponse",
    "MapObjectiveBase",
    "MapObjectiveResponse",
    "MapRealmBase",
    "MapRealmResponse",
    "GauntletRunBase",
    "GauntletRunCreate",
    "GauntletRunResponse",
    "GauntletMatchLogBase",
    "GauntletMatchLogResponse",
    "GauntletMatchExceptionBase",
    "GauntletMatchExceptionResponse",
    "PageStreakRunBase",
    "PageStreakRunCreate",
    "PageStreakRunResponse",
    "PageStreakPageLogBase",
    "PageStreakPageLogResponse",
    "GeneratorSettingBase",
    "GeneratorSettingResponse",
    "GeneratorDrawnPerkBase",
    "GeneratorDrawnPerkResponse",
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
]

```
