from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.extensions import Base


def utcnow():
    return datetime.now(timezone.utc)



class Character(Base):
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(20))  # e.g., "Killer" or "Survivor"
    code_prefix: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # e.g., "K01", "S24"
    portrait_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    real_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    short_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    wiki_slug: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    avatar_local_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    release_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    perks: Mapped[List["Perk"]] = relationship(
        back_populates="character", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "category": self.role,  # for backwards-compatibility with category field
            "code_prefix": self.code_prefix,
            "portrait_url": self.portrait_url,
            "real_name": self.real_name or self.name,
            "short_name": self.short_name or self.name.lower().replace(" ", "_"),
            "wiki_slug": self.wiki_slug or self.name.lower().replace(" ", "_"),
            "avatar_url": self.portrait_url or "",
            "avatar_local_path": self.avatar_local_path or "",
            "release_number": self.release_number,
        }


class Perk(Base):
    __tablename__ = "perks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    is_teachable: Mapped[bool] = mapped_column(Boolean, default=True)
    category: Mapped[str] = mapped_column(String(20), default="Survivor")  # "Survivor" or "Killer"
    description: Mapped[str] = mapped_column(Text, default="")
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    character_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("characters.id", ondelete="SET NULL"), nullable=True
    )
    character: Mapped[Optional["Character"]] = relationship(back_populates="perks")

    def to_dict(self) -> dict:
        char_name = self.character.name if self.character else "General"
        char_real = self.character.real_name if (self.character and self.character.real_name) else char_name
        char_avatar = self.character.avatar_local_path if self.character else ""
        return {
            "id": self.id,
            "name": self.name,
            "is_teachable": self.is_teachable,
            "category": self.category,
            "character": char_name,
            "character_real_name": char_real,
            "character_avatar_path": char_avatar or "",
            "character_id": self.character_id,
            "description": self.description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
        }


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(50), default="")
    role: Mapped[str] = mapped_column(String(20), default="Survivor")
    description: Mapped[str] = mapped_column(Text, default="")
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rarity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "role": self.role,
            "description": self.description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "rarity": self.rarity or "",
        }


class Addon(Base):
    __tablename__ = "addons"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    associated_target: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    icon_local_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rarity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "associated_target": self.associated_target or "",
            "category": self.category,
            "description": self.description,
            "icon_url": self.icon_url or "",
            "icon_local_path": self.icon_local_path or "",
            "rarity": self.rarity or "",
        }


class MapRealm(Base):
    __tablename__ = "map_realms"

    id: Mapped[int] = mapped_column(primary_key=True)
    map_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    realm: Mapped[str] = mapped_column(String(100))
    realm_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(50), default="hens333")
    source_label: Mapped[Optional[str]] = mapped_column(String(100), default="Hens333 12-Clock Callouts")
    layout_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    jungle_gyms_count: Mapped[int] = mapped_column(Integer, default=0)
    totem_spawns_count: Mapped[int] = mapped_column(Integer, default=5)
    pallet_density: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    shack_has_basement: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    callout_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    callout_image_local_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    tiles: Mapped[List["MapTile"]] = relationship(
        back_populates="map_realm", cascade="all, delete-orphan"
    )
    objectives: Mapped[List["MapObjective"]] = relationship(
        back_populates="map_realm", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.map_id,
            "name": self.name,
            "realm": self.realm,
            "realm_id": self.realm_id or "",
            "source": self.source or "hens333",
            "source_label": self.source_label or "Hens333 12-Clock Callouts",
            "callout_image_url": self.callout_image_url or self.image_url or "",
            "callout_image_local_path": self.callout_image_local_path or "",
            "image_url": self.image_url or self.callout_image_url or "",
            "layout_type": self.layout_type,
            "jungle_gyms_count": self.jungle_gyms_count,
            "totem_spawns_count": self.totem_spawns_count,
            "pallet_density": self.pallet_density,
            "shack_has_basement": self.shack_has_basement,
            "description": self.description,
            "tiles": [t.to_dict() for t in self.tiles],
            "objectives": [o.to_dict() for o in self.objectives],
        }


class MapTile(Base):
    __tablename__ = "map_tiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    map_id: Mapped[str] = mapped_column(
        ForeignKey("map_realms.map_id", ondelete="CASCADE"), index=True
    )
    seed_variant: Mapped[str] = mapped_column(String(50), default="seed_a")
    floor: Mapped[int] = mapped_column(Integer, default=1)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(50))
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)
    has_pallet: Mapped[bool] = mapped_column(Boolean, default=False)
    pallet_safety_rating: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    has_window: Mapped[bool] = mapped_column(Boolean, default=False)
    vault_directions: Mapped[str] = mapped_column(Text, default="[]")
    looping_tips: Mapped[str] = mapped_column(Text, default="")
    mindgame_counter: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    map_realm: Mapped["MapRealm"] = relationship(back_populates="tiles")

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "type": self.type,
            "position": {"x": self.x, "y": self.y},
            "has_pallet": self.has_pallet,
            "pallet_safety_rating": self.pallet_safety_rating,
            "has_window": self.has_window,
            "vault_directions": self.vault_directions,
            "looping_tips": self.looping_tips,
            "mindgame_counter": self.mindgame_counter,
            "seed_variant": self.seed_variant,
            "floor": self.floor,
        }


class MapObjective(Base):
    __tablename__ = "map_objectives"

    id: Mapped[int] = mapped_column(primary_key=True)
    map_id: Mapped[str] = mapped_column(
        ForeignKey("map_realms.map_id", ondelete="CASCADE"), index=True
    )
    seed_variant: Mapped[str] = mapped_column(String(50), default="seed_a")
    floor: Mapped[int] = mapped_column(Integer, default=1)
    type: Mapped[str] = mapped_column(String(50))
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)
    location_description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    map_realm: Mapped["MapRealm"] = relationship(back_populates="objectives")

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "position": {"x": self.x, "y": self.y},
            "location_description": self.location_description,
            "seed_variant": self.seed_variant,
            "floor": self.floor,
        }


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    active_role: Mapped[str] = mapped_column(String(20), default="survivor")
    checkpoint_interval: Mapped[int] = mapped_column(Integer, default=3)
    win_condition_survivor: Mapped[str] = mapped_column(String(50), default="escape")
    win_condition_killer: Mapped[str] = mapped_column(String(50), default="3k_plus")
    active_perk_rule_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "active_role": self.active_role,
            "checkpoint_interval": self.checkpoint_interval,
            "win_condition_survivor": self.win_condition_survivor,
            "win_condition_killer": self.win_condition_killer,
            "active_perk_rule_id": self.active_perk_rule_id,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PerkRule(Base):
    __tablename__ = "perk_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    slot1_type: Mapped[str] = mapped_column(String(50), default="character_own")
    slot2_type: Mapped[str] = mapped_column(String(50), default="character_own")
    slot3_type: Mapped[str] = mapped_column(String(50), default="general_role")
    slot4_type: Mapped[str] = mapped_column(String(50), default="any_role")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "is_default": self.is_default,
            "slot1_type": self.slot1_type,
            "slot2_type": self.slot2_type,
            "slot3_type": self.slot3_type,
            "slot4_type": self.slot4_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ChallengeRun(Base):
    __tablename__ = "challenge_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(20))  # "survivor" or "killer"
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    current_character_id: Mapped[str] = mapped_column(String(100))
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_checkpoint_streak: Mapped[int] = mapped_column(Integer, default=0)
    completed_characters_json: Mapped[str] = mapped_column(Text, default="[]")
    checkpoint_characters_json: Mapped[str] = mapped_column(Text, default="[]")
    current_loadout_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    match_logs: Mapped[List["MatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    match_exceptions: Mapped[List["MatchException"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        import json
        return {
            "id": self.id,
            "role": self.role,
            "status": self.status,
            "current_character_id": self.current_character_id,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "last_checkpoint_streak": self.last_checkpoint_streak,
            "completed_characters_json": self.completed_characters_json,
            "checkpoint_characters_json": self.checkpoint_characters_json,
            "current_loadout_json": self.current_loadout_json,
            "completed_characters": json.loads(self.completed_characters_json or "[]"),
            "checkpoint_characters": json.loads(self.checkpoint_characters_json or "[]"),
            "current_loadout": json.loads(self.current_loadout_json or "{}"),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class MatchLog(Base):
    __tablename__ = "match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("challenge_runs.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))
    character_id: Mapped[str] = mapped_column(String(100))
    result: Mapped[str] = mapped_column(String(20))  # "win" or "loss"
    perks_json: Mapped[str] = mapped_column(Text)
    map_offering: Mapped[str] = mapped_column(String(100))
    streak_before: Mapped[int] = mapped_column(Integer)
    streak_after: Mapped[int] = mapped_column(Integer)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    run: Mapped["ChallengeRun"] = relationship(back_populates="match_logs")

    def to_dict(self) -> dict:
        import json
        return {
            "id": self.id,
            "run_id": self.run_id,
            "role": self.role,
            "character_id": self.character_id,
            "result": self.result,
            "perks_json": self.perks_json,
            "perks": json.loads(self.perks_json or "[]"),
            "map_offering": self.map_offering,
            "streak_before": self.streak_before,
            "streak_after": self.streak_after,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class MatchException(Base):
    __tablename__ = "match_exceptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("challenge_runs.id", ondelete="CASCADE"), index=True
    )
    character_id: Mapped[str] = mapped_column(String(100))
    reason: Mapped[str] = mapped_column(String(50))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    run: Mapped["ChallengeRun"] = relationship(back_populates="match_exceptions")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "character_id": self.character_id,
            "reason": self.reason,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class CharacterPoolSetting(Base):
    __tablename__ = "character_pool_settings"
    __table_args__ = (
        UniqueConstraint("role", "character_name", name="uq_pool_role_char"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(20))
    character_name: Mapped[str] = mapped_column(String(100))
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "character_name": self.character_name,
            "is_enabled": self.is_enabled,
        }


class GeneratorSetting(Base):
    __tablename__ = "generator_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(20), default="Survivor")
    gen_mode: Mapped[str] = mapped_column(String(20), default="instant")
    no_repeat_perks: Mapped[bool] = mapped_column(Boolean, default=True)
    total_pages: Mapped[int] = mapped_column(Integer, default=12)
    perks_per_page: Mapped[int] = mapped_column(Integer, default=15)
    last_page_perks: Mapped[int] = mapped_column(Integer, default=8)
    spin_duration_sec: Mapped[float] = mapped_column(Float, default=3.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    def to_dict(self) -> dict:
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
    role: Mapped[str] = mapped_column(String(20))
    perk_name: Mapped[str] = mapped_column(String(150))
    drawn_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "perk_name": self.perk_name,
            "drawn_at": self.drawn_at.isoformat() if self.drawn_at else None,
        }


class PageStreakRun(Base):
    __tablename__ = "page_streak_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "killer", name="uq_page_streak_run_user_killer"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    killer: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    attempt: Mapped[int] = mapped_column(Integer, default=1)
    current_page: Mapped[int] = mapped_column(Integer, default=1)
    best_page: Mapped[int] = mapped_column(Integer, default=0)
    pages_json: Mapped[str] = mapped_column(Text, default="[]")
    snapshot_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    page_logs: Mapped[List["PageStreakPageLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        import json
        return {
            "id": self.id,
            "user_id": self.user_id,
            "killer": self.killer,
            "status": self.status,
            "attempt": self.attempt,
            "current_page": self.current_page,
            "best_page": self.best_page,
            "pages_json": self.pages_json,
            "pages": json.loads(self.pages_json or "[]"),
            "snapshot_at": self.snapshot_at.isoformat() if self.snapshot_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PageStreakPageLog(Base):
    __tablename__ = "page_streak_page_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("page_streak_runs.id", ondelete="CASCADE"), index=True
    )
    attempt: Mapped[int] = mapped_column(Integer)
    page_number: Mapped[int] = mapped_column(Integer)
    perks_json: Mapped[str] = mapped_column(Text)
    result: Mapped[str] = mapped_column(String(20))  # "win" or "loss"
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    run: Mapped["PageStreakRun"] = relationship(back_populates="page_logs")

    def to_dict(self) -> dict:
        import json
        return {
            "id": self.id,
            "run_id": self.run_id,
            "attempt": self.attempt,
            "page_number": self.page_number,
            "perks_json": self.perks_json,
            "perks": json.loads(self.perks_json or "[]"),
            "result": self.result,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class DraftSession(Base):
    __tablename__ = "draft_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    phase: Mapped[str] = mapped_column(String(20), default="bans")
    banned_perks: Mapped[str] = mapped_column(Text, default="[]")
    picked_survivor_perks: Mapped[str] = mapped_column(Text, default="[]")
    picked_killer_perks: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    def to_dict(self) -> dict:
        import json
        return {
            "id": self.id,
            "room_code": self.room_code,
            "phase": self.phase,
            "banned_perks": json.loads(self.banned_perks or "[]"),
            "picked_survivor_perks": json.loads(self.picked_survivor_perks or "[]"),
            "picked_killer_perks": json.loads(self.picked_killer_perks or "[]"),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DailyQuest(Base):
    __tablename__ = "daily_quests"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(20))  # "daily" or "weekly"
    progress: Mapped[int] = mapped_column(Integer, default=0)
    goal: Mapped[int] = mapped_column(Integer, default=1)
    xp_reward: Mapped[int] = mapped_column(Integer, default=500)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    def to_dict(self) -> dict:
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
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20))  # "survivor" or "killer"
    category: Mapped[str] = mapped_column(String(50))  # "otzdarva", "meta", "meme", etc.
    character_id: Mapped[str] = mapped_column(String(100), default="all")
    perks_json: Mapped[str] = mapped_column(Text, default="[]")
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    author: Mapped[str] = mapped_column(String(100), default="Community")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    def to_dict(self) -> dict:
        import json
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "role": self.role,
            "category": self.category,
            "character_id": self.character_id,
            "perks_json": self.perks_json,
            "perks": json.loads(self.perks_json or "[]"),
            "upvotes": self.upvotes,
            "author": self.author,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CustomPerk(Base):
    __tablename__ = "custom_perks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    role: Mapped[str] = mapped_column(String(20))
    character_name: Mapped[str] = mapped_column(String(100), default="Teachable")
    rarity: Mapped[str] = mapped_column(String(50))
    icon_preset: Mapped[str] = mapped_column(String(50), default="sparkles")
    description: Mapped[str] = mapped_column(Text)
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    author: Mapped[str] = mapped_column(String(100), default="Community")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    def to_dict(self) -> dict:
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


class GuesserStat(Base):
    __tablename__ = "guesser_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    guesser_type: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    total_guesses: Mapped[int] = mapped_column(Integer, default=0)
    correct_guesses: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "guesser_type": self.guesser_type,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "total_guesses": self.total_guesses,
            "correct_guesses": self.correct_guesses,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)  # "user" | "admin"
    avatar_url: Mapped[str] = mapped_column(String(255), default="default_avatar")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    character_ownerships: Mapped[List["UserCharacterOwnership"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    perk_ownerships: Mapped[List["UserPerkOwnership"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def to_dict(self, include_sensitive: bool = False) -> dict:
        d = {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "avatar_url": self.avatar_url,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_sensitive:
            d["password_hash"] = self.password_hash
        return d


class UserCharacterOwnership(Base):
    __tablename__ = "user_character_ownerships"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    character_id: Mapped[int] = mapped_column(ForeignKey("characters.id", ondelete="CASCADE"), nullable=False, index=True)
    is_owned: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    user: Mapped["User"] = relationship(back_populates="character_ownerships")
    character: Mapped["Character"] = relationship()

    __table_args__ = (
        UniqueConstraint("user_id", "character_id", name="uq_user_character_ownership"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "character_id": self.character_id,
            "character_name": self.character.name if self.character else None,
            "character_role": self.character.role if self.character else None,
            "is_owned": self.is_owned,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class UserPerkOwnership(Base):
    __tablename__ = "user_perk_ownerships"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    perk_id: Mapped[int] = mapped_column(ForeignKey("perks.id", ondelete="CASCADE"), nullable=False, index=True)
    is_unlocked: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    user: Mapped["User"] = relationship(back_populates="perk_ownerships")
    perk: Mapped["Perk"] = relationship()

    __table_args__ = (
        UniqueConstraint("user_id", "perk_id", name="uq_user_perk_ownership"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "perk_id": self.perk_id,
            "perk_name": self.perk.name if self.perk else None,
            "perk_category": self.perk.category if self.perk else None,
            "is_unlocked": self.is_unlocked,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
