### backend/app/core/json_provider.py
```python
import dataclasses
from datetime import date, datetime
from typing import Any
from uuid import UUID
from flask.json.provider import DefaultJSONProvider

try:
    import orjson
    HAS_ORJSON = True
except ImportError:
    import json
    orjson = None  # type: ignore
    HAS_ORJSON = False


def safe_json_loads(val: str | bytes | None, default: Any = None) -> Any:
    """Safely deserialize JSON string or bytes using orjson with fallback."""
    if not val:
        return default
    try:
        if HAS_ORJSON:
            return orjson.loads(val)
        return json.loads(val)
    except Exception:
        return default


def safe_json_dumps(val: Any, default_val: str = "{}") -> str:
    """Safely serialize Python object to JSON string using orjson with fallback."""
    try:
        if HAS_ORJSON:
            return orjson.dumps(val).decode("utf-8")
        return json.dumps(val)
    except Exception:
        return default_val


class ORJSONProvider(DefaultJSONProvider):
    """High-performance JSON provider for Flask using Rust-backed orjson serialization."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, set):
            return list(obj)
        if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
            return dataclasses.asdict(obj)
        if hasattr(obj, "model_dump") and callable(obj.model_dump):
            return obj.model_dump()
        if hasattr(obj, "to_dict") and callable(obj.to_dict):
            return obj.to_dict()
        return super().default(obj)

    def dumps(self, obj: Any, **kwargs: Any) -> str:
        if not HAS_ORJSON:
            return super().dumps(obj, **kwargs)

        options = (
            orjson.OPT_NON_STR_KEYS
            | orjson.OPT_SERIALIZE_NUMPY
            | orjson.OPT_SERIALIZE_DATACLASS
            | orjson.OPT_PASSTHROUGH_DATETIME
        )
        return orjson.dumps(obj, default=self.default, option=options).decode("utf-8")

    def loads(self, s: str | bytes, **kwargs: Any) -> Any:
        if not HAS_ORJSON:
            return super().loads(s, **kwargs)
        return orjson.loads(s)
```

### backend/app/models/character.py
```python
from typing import TYPE_CHECKING, Any
from sqlalchemy import JSON, Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads

if TYPE_CHECKING:
    from app.models.perk import Perk


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    code_prefix: Mapped[str | None] = mapped_column(String(10), nullable=True)
    portrait_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    real_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    short_name: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    wiki_slug: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    avatar_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    release_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chapter_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    chapter_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    dlc_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_licensed: Mapped[bool | None] = mapped_column(Boolean, default=False, nullable=True)
    is_disabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    disabled_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    release_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    release_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    dlc_counterparts: Mapped[str | None] = mapped_column(Text, nullable=True)
    lore: Mapped[str | None] = mapped_column(Text, nullable=True)

    power_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    power_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    power_icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    movement_speed: Mapped[str | None] = mapped_column(String(100), nullable=True)
    terror_radius: Mapped[str | None] = mapped_column(String(100), nullable=True)
    terror_radius_meters: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[str | None] = mapped_column(String(50), nullable=True)
    translations: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )

    perks: Mapped[list["Perk"]] = relationship(
        back_populates="character", cascade="all, delete-orphan", lazy="selectin"
    )

    __mapper_args__ = {
        "polymorphic_on": "role",
        "polymorphic_identity": "Character",
    }

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        counterparts: list[str] = []
        if self.dlc_counterparts:
            try:
                stripped = self.dlc_counterparts.strip()
                if stripped.startswith("["):
                    counterparts = safe_json_loads(stripped, default=[])
                else:
                    counterparts = [x.strip() for x in stripped.split(",") if x.strip()]
            except Exception:
                counterparts = []

        name = self.name
        lore = self.lore or ""
        chapter_name = self.chapter_name or "Base Game"
        power_name = self.power_name or ""
        power_desc = self.power_description or ""

        if lang and self.translations and lang in self.translations:
            trans = self.translations.get(lang) or {}
            if isinstance(trans, dict):
                name = trans.get("name") or name
                lore = trans.get("lore") or lore
                chapter_name = trans.get("chapter_name") or chapter_name
                power_name = trans.get("power_name") or power_name
                power_desc = trans.get("power_description") or power_desc

        data: dict[str, Any] = {
            "id": self.id,
            "name": name,
            "role": self.role,
            "category": self.role,
            "code_prefix": self.code_prefix,
            "portrait_url": self.portrait_url,
            "real_name": self.real_name or self.name,
            "short_name": self.short_name or self.name.lower().replace(" ", "_"),
            "wiki_slug": self.wiki_slug or self.name.lower().replace(" ", "_"),
            "avatar_url": self.portrait_url or "",
            "avatar_local_path": self.avatar_local_path or "",
            "release_number": self.release_number,
            "chapter_name": chapter_name,
            "chapter_number": self.chapter_number or "",
            "dlc_type": self.dlc_type or "original_chapter",
            "is_licensed": bool(self.is_licensed),
            "is_disabled": bool(self.is_disabled),
            "disabled_reason": self.disabled_reason,
            "release_year": self.release_year or 2016,
            "release_date": self.release_date or "",
            "dlc_counterparts": counterparts,
            "lore": lore,
            "translations": self.translations or {},
        }

        if self.role == "Killer" or self.power_name:
            p_clean = (
                self.power_name.lower().replace(" ", "_").replace("'", "").replace("-", "_")
                if self.power_name
                else ""
            )
            data["power"] = {
                "name": power_name,
                "description": power_desc,
                "icon_url": self.power_icon_url or "",
                "icon_local_path": f"icons/powers/{p_clean}.png" if p_clean else "",
                "movement_speed": self.movement_speed or "4.6 m/s (115%)",
                "terror_radius": self.terror_radius or "32 m",
                "terror_radius_meters": self.terror_radius_meters or 32,
                "height": self.height or "Tall",
            }
        return data


class Survivor(Character):
    __mapper_args__ = {
        "polymorphic_identity": "Survivor",
    }


class Killer(Character):
    __mapper_args__ = {
        "polymorphic_identity": "Killer",
    }
```

### backend/app/models/chaos.py
```python
from datetime import datetime
from typing import Any
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow


class ChaosRun(Base):
    __tablename__ = "chaos_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "difficulty", name="uq_chaos_run_user_difficulty"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_checkpoint_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_killers_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    checkpoint_killers_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    used_perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    checkpoint_used_perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    current_perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    current_addon_rarities_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    owned_killers_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    unlocked_perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    perks_revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    match_logs: Mapped[list["ChaosMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="ChaosMatchLog.timestamp.asc()"
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "difficulty": self.difficulty,
            "status": self.status,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "last_checkpoint_streak": self.last_checkpoint_streak,
            "completed_killers_json": self.completed_killers_json,
            "completed_killers": safe_json_loads(self.completed_killers_json, default=[]),
            "checkpoint_killers_json": self.checkpoint_killers_json,
            "checkpoint_killers": safe_json_loads(self.checkpoint_killers_json, default=[]),
            "used_perks_json": self.used_perks_json,
            "used_perks": safe_json_loads(self.used_perks_json, default=[]),
            "checkpoint_used_perks_json": self.checkpoint_used_perks_json,
            "checkpoint_used_perks": safe_json_loads(self.checkpoint_used_perks_json, default=[]),
            "current_perks_json": self.current_perks_json,
            "current_perks": safe_json_loads(self.current_perks_json, default=[]),
            "current_addon_rarities_json": self.current_addon_rarities_json,
            "current_addon_rarities": safe_json_loads(self.current_addon_rarities_json, default=[]),
            "owned_killer_ids": safe_json_loads(self.owned_killers_json, default=[]),
            "unlocked_perk_ids": safe_json_loads(self.unlocked_perks_json, default=[]),
            "perks_revealed": self.perks_revealed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ChaosMatchLog(Base):
    __tablename__ = "chaos_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("chaos_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    killer_id: Mapped[str] = mapped_column(String(100), nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    addon_rarities_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    streak_before: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_after: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)

    run: Mapped["ChaosRun"] = relationship(back_populates="match_logs")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "killer_id": self.killer_id,
            "result": self.result,
            "perks_json": self.perks_json,
            "perks": safe_json_loads(self.perks_json, default=[]),
            "addon_rarities_json": self.addon_rarities_json,
            "addon_rarities": safe_json_loads(self.addon_rarities_json, default=[]),
            "streak_before": self.streak_before,
            "streak_after": self.streak_after,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "triggered_by": self.triggered_by,
        }
```

### backend/app/models/community.py
```python
from datetime import datetime
from typing import TYPE_CHECKING, Any
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow

if TYPE_CHECKING:
    from app.models.user import User


class DailyQuest(Base):
    __tablename__ = "daily_quests"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    goal: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, default=500, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "progress": self.progress,
            "goal": self.goal,
            "xp_reward": self.xp_reward,
            "is_completed": self.is_completed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CommunityBuild(Base):
    __tablename__ = "community_builds"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    character_id: Mapped[str] = mapped_column(String(100), default="all", nullable=False)
    perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    upvotes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    author: Mapped[str] = mapped_column(String(100), default="Community", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "role": self.role,
            "category": self.category,
            "character_id": self.character_id,
            "perks_json": self.perks_json,
            "perks": safe_json_loads(self.perks_json, default=[]),
            "upvotes": self.upvotes,
            "author": self.author,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CustomPerk(Base):
    __tablename__ = "custom_perks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    character_name: Mapped[str] = mapped_column(String(100), default="Teachable", nullable=False)
    rarity: Mapped[str] = mapped_column(String(50), default="Very Rare", nullable=False)
    icon_preset: Mapped[str] = mapped_column(String(50), default="sparkles", nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    upvotes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    author: Mapped[str] = mapped_column(String(100), default="Community", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "character_name": self.character_name,
            "rarity": self.rarity,
            "icon_preset": self.icon_preset,
            "description": self.description,
            "upvotes": self.upvotes,
            "author": self.author,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class BugReport(Base):
    __tablename__ = "bug_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reporter_name: Mapped[str] = mapped_column(String(100), nullable=False)
    reporter_email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="General", nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    images_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User | None"] = relationship(back_populates="bug_reports")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "reporter_name": self.reporter_name,
            "reporter_email": self.reporter_email or "",
            "title": self.title,
            "category": self.category,
            "message": self.message,
            "images": safe_json_loads(self.images_json, default=[]),
            "status": self.status,
            "admin_notes": self.admin_notes or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
```

### backend/app/models/gauntlet.py
```python
from datetime import datetime
from typing import Any
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow


class GauntletRun(Base):
    __tablename__ = "gauntlet_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "role", "game_mode", name="uq_gauntlet_run_user_role_mode"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    game_mode: Mapped[str] = mapped_column(String(20), default="original", nullable=False)
    target_revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    current_character_id: Mapped[str] = mapped_column(String(100), nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_checkpoint_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_characters_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    checkpoint_characters_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    current_loadout_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    owned_characters_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    match_logs: Mapped[list["GauntletMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="GauntletMatchLog.timestamp.asc()"
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "role": self.role,
            "status": self.status,
            "game_mode": self.game_mode,
            "target_revealed": self.target_revealed,
            "current_character_id": self.current_character_id,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "last_checkpoint_streak": self.last_checkpoint_streak,
            "completed_characters_json": self.completed_characters_json,
            "checkpoint_characters_json": self.checkpoint_characters_json,
            "current_loadout_json": self.current_loadout_json,
            "completed_characters": safe_json_loads(self.completed_characters_json, default=[]),
            "checkpoint_characters": safe_json_loads(self.checkpoint_characters_json, default=[]),
            "current_loadout": safe_json_loads(self.current_loadout_json, default={}),
            "owned_character_ids": safe_json_loads(self.owned_characters_json, default=[]),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class GauntletMatchLog(Base):
    __tablename__ = "gauntlet_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("gauntlet_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    character_id: Mapped[str] = mapped_column(String(100), nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    streak_before: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_after: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)

    run: Mapped["GauntletRun"] = relationship(back_populates="match_logs")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "role": self.role,
            "character_id": self.character_id,
            "result": self.result,
            "perks_json": self.perks_json,
            "perks": safe_json_loads(self.perks_json, default=[]),
            "streak_before": self.streak_before,
            "streak_after": self.streak_after,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "triggered_by": self.triggered_by,
        }
```

### backend/app/models/history.py
```python
from datetime import datetime
from typing import Any
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow


class HistoryRun(Base):
    __tablename__ = "history_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "mode", name="uq_history_run_user_mode"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    current_row_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_killers_beaten: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_killers_beaten: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_killers_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    unlocked_perk_names_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    checkpoint_row_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checkpoint_total_killers_beaten: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checkpoint_completed_killers_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    checkpoint_unlocked_perk_names_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    owned_killers_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    match_logs: Mapped[list["HistoryMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="HistoryMatchLog.timestamp.asc()"
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "mode": self.mode,
            "status": self.status,
            "current_row_index": self.current_row_index,
            "total_killers_beaten": self.total_killers_beaten,
            "best_killers_beaten": self.best_killers_beaten,
            "completed_killers": safe_json_loads(self.completed_killers_json, default=[]),
            "unlocked_perk_names": safe_json_loads(self.unlocked_perk_names_json, default=[]),
            "owned_killer_ids": safe_json_loads(self.owned_killers_json, default=[]),
            "checkpoint_row_index": self.checkpoint_row_index,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class HistoryMatchLog(Base):
    __tablename__ = "history_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("history_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    killer_id: Mapped[str] = mapped_column(String(100), nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_before: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_after: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)

    run: Mapped["HistoryRun"] = relationship(back_populates="match_logs")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "killer_id": self.killer_id,
            "result": self.result,
            "row_index": self.row_index,
            "streak_before": self.streak_before,
            "streak_after": self.streak_after,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "triggered_by": self.triggered_by,
        }
```

### backend/app/models/minigames.py
```python
from datetime import datetime
from typing import Any
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow


class GeneratorSetting(Base):
    __tablename__ = "generator_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(20), default="Survivor", nullable=False)
    gen_mode: Mapped[str] = mapped_column(String(20), default="instant", nullable=False)
    no_repeat_perks: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    total_pages: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    perks_per_page: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    last_page_perks: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    spin_duration_sec: Mapped[float] = mapped_column(Float, default=3.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "role": self.role,
            "gen_mode": self.gen_mode,
            "no_repeat_perks": 1 if self.no_repeat_perks else 0,
            "total_pages": self.total_pages,
            "perks_per_page": self.perks_per_page,
            "last_page_perks": self.last_page_perks,
            "spin_duration_sec": self.spin_duration_sec,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class GeneratorDrawnPerk(Base):
    __tablename__ = "generator_drawn_perks"
    __table_args__ = (
        UniqueConstraint("role", "perk_name", name="uq_drawn_role_perk"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    perk_name: Mapped[str] = mapped_column(String(150), nullable=False)
    drawn_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "role": self.role,
            "perk_name": self.perk_name,
            "drawn_at": self.drawn_at.isoformat() if self.drawn_at else None,
        }


class DraftSession(Base):
    __tablename__ = "draft_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    phase: Mapped[str] = mapped_column(String(20), default="bans", nullable=False)
    banned_perks: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    picked_survivor_perks: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    picked_killer_perks: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "room_code": self.room_code,
            "phase": self.phase,
            "banned_perks": safe_json_loads(self.banned_perks, default=[]),
            "picked_survivor_perks": safe_json_loads(self.picked_survivor_perks, default=[]),
            "picked_killer_perks": safe_json_loads(self.picked_killer_perks, default=[]),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class GuesserStat(Base):
    __tablename__ = "guesser_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    guesser_type: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_guesses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_guesses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "guesser_type": self.guesser_type,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "total_guesses": self.total_guesses,
            "correct_guesses": self.correct_guesses,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ScraperSetting(Base):
    __tablename__ = "scraper_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(50), default="wikigg", nullable=False)
    fallback_to_wiki: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_used_source: Mapped[str] = mapped_column(String(50), default="wikigg", nullable=False)
    last_run_timestamp: Mapped[str | None] = mapped_column(String(100), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "fallback_to_wiki": self.fallback_to_wiki,
            "last_used_source": self.last_used_source,
            "last_run_timestamp": self.last_run_timestamp,
        }
```

### backend/app/models/page_streak.py
```python
from datetime import datetime
from typing import Any
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow


class PageStreakRun(Base):
    __tablename__ = "page_streak_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "killer", name="uq_page_streak_run_user_killer"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    killer: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    attempt: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_page: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    best_page: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pages_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    snapshot_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    page_logs: Mapped[list["PageStreakPageLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="PageStreakPageLog.timestamp.asc()"
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "killer": self.killer,
            "status": self.status,
            "attempt": self.attempt,
            "current_page": self.current_page,
            "best_page": self.best_page,
            "pages_json": self.pages_json,
            "pages": safe_json_loads(self.pages_json, default=[]),
            "snapshot_at": self.snapshot_at.isoformat() if self.snapshot_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PageStreakPageLog(Base):
    __tablename__ = "page_streak_page_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("page_streak_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attempt: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)

    run: Mapped["PageStreakRun"] = relationship(back_populates="page_logs")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "attempt": self.attempt,
            "page_number": self.page_number,
            "perks_json": self.perks_json,
            "perks": safe_json_loads(self.perks_json, default=[]),
            "result": self.result,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "triggered_by": self.triggered_by,
        }
```

### backend/app/models/smash_or_pass.py
```python
import uuid
from datetime import datetime
from typing import Any
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow


class Roster(Base):
    __tablename__ = "rosters"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name_i18n_key: Mapped[str] = mapped_column(String(128), nullable=False)
    description_i18n_key: Mapped[str] = mapped_column(String(256), nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    theme_color: Mapped[str] = mapped_column(String(32), default="#ff0055", nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="DBD", nullable=False)
    is_nsfw: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    entities: Mapped[list["Entity"]] = relationship(
        "Entity",
        back_populates="roster",
        cascade="all, delete-orphan",
        order_by="Entity.order_index",
        lazy="selectin",
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "slug": self.slug,
            "name_i18n_key": self.name_i18n_key,
            "description_i18n_key": self.description_i18n_key,
            "cover_image_url": self.cover_image_url,
            "theme_color": self.theme_color,
            "category": self.category,
            "is_nsfw": self.is_nsfw,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    roster_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rosters.id", ondelete="CASCADE"), index=True, nullable=False
    )
    slug: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="Survivor", nullable=False)
    gender: Mapped[str] = mapped_column(String(32), default="female", nullable=False)
    media_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    media_type: Mapped[str] = mapped_column(String(16), default="image", nullable=False)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    roster: Mapped["Roster"] = relationship("Roster", back_populates="entities")
    stat: Mapped["EntityStat | None"] = relationship(
        "EntityStat", back_populates="entity", uselist=False, cascade="all, delete-orphan", lazy="selectin"
    )
    votes: Mapped[list["Vote"]] = relationship(
        "Vote", back_populates="entity", cascade="all, delete-orphan"
    )

    def get_metadata(self) -> dict[str, Any]:
        if isinstance(self.metadata_json, dict):
            return self.metadata_json
        if isinstance(self.metadata_json, str):
            return safe_json_loads(self.metadata_json, default={})
        return {}

    def set_metadata(self, value: Any) -> None:
        self.metadata_json = value

    def to_dict(self) -> dict[str, Any]:
        meta = self.get_metadata()
        return {
            "id": self.id,
            "roster_id": self.roster_id,
            "slug": self.slug,
            "name": self.name,
            "role": self.role,
            "gender": self.gender,
            "media_url": self.media_url,
            "media_type": self.media_type,
            "metadata": meta,
            "metadata_json": meta,
            "order_index": self.order_index,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "stat": self.stat.to_dict() if self.stat else None,
        }


class EntityStat(Base):
    __tablename__ = "entity_stats"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    entity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("entities.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    smash_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pass_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    super_smash_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_votes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    smash_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    chaos_rating: Mapped[float] = mapped_column(Float, default=50.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    entity: Mapped["Entity"] = relationship("Entity", back_populates="stat")

    def calculate_rate(self) -> float:
        smash = self.smash_count if self.smash_count is not None else 0
        p = self.pass_count if self.pass_count is not None else 0
        super_smash = self.super_smash_count if self.super_smash_count is not None else 0
        total = smash + p + super_smash
        self.total_votes = total
        if total == 0:
            self.smash_rate = 0.0
        else:
            positive_votes = smash + super_smash
            self.smash_rate = round((positive_votes / total) * 100.0, 1)
        return self.smash_rate

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "entity_id": self.entity_id,
            "smash_count": self.smash_count,
            "pass_count": self.pass_count,
            "super_smash_count": self.super_smash_count,
            "total_votes": self.total_votes,
            "smash_rate": self.smash_rate,
            "chaos_rating": self.chaos_rating,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Vote(Base):
    __tablename__ = "votes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    entity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("entities.id", ondelete="CASCADE"), index=True, nullable=False
    )
    session_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    vote_type: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    entity: Mapped["Entity"] = relationship("Entity", back_populates="votes")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "entity_id": self.entity_id,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "vote_type": self.vote_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Translation(Base):
    __tablename__ = "translations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    locale: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    key: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, str | None]:
        return {
            "id": self.id,
            "locale": self.locale,
            "key": self.key,
            "value": self.value,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class SmashPassStat(Base):
    __tablename__ = "smash_pass_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    character_slug: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    character_name: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="Survivor", nullable=False)
    gender: Mapped[str] = mapped_column(String(20), default="female", nullable=False)
    edition: Mapped[str] = mapped_column(String(50), default="canon", index=True, nullable=False)
    smash_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pass_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    super_smash_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_votes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    smash_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def calculate_rate(self) -> float:
        smash = self.smash_count if self.smash_count is not None else 0
        p = self.pass_count if self.pass_count is not None else 0
        super_smash = self.super_smash_count if self.super_smash_count is not None else 0
        total = smash + p + super_smash
        self.total_votes = total
        if total == 0:
            self.smash_rate = 0.0
        else:
            positive_votes = smash + super_smash
            self.smash_rate = round((positive_votes / total) * 100.0, 1)
        return self.smash_rate

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "character_slug": self.character_slug,
            "character_name": self.character_name,
            "role": self.role,
            "gender": self.gender,
            "edition": self.edition,
            "smash_count": self.smash_count,
            "pass_count": self.pass_count,
            "super_smash_count": self.super_smash_count,
            "total_votes": self.total_votes,
            "smash_rate": self.smash_rate,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class SmashPassVote(Base):
    __tablename__ = "smash_pass_votes"

    id: Mapped[int] = mapped_column(primary_key=True)
    character_slug: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    vote_type: Mapped[str] = mapped_column(String(20), nullable=False)
    edition: Mapped[str] = mapped_column(String(50), default="canon", index=True, nullable=False)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "character_slug": self.character_slug,
            "vote_type": self.vote_type,
            "edition": self.edition,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
```
