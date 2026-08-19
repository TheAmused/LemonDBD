import html
import json
import logging
import math
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from flask import current_app
from sqlalchemy import func, select, or_, and_, case
from sqlalchemy.orm import joinedload
from pydantic import BaseModel, Field

from app.core.extensions import db
from app.models import (
    Character,
    Perk,
    Item,
    Addon,
    MapRealm,
    MapTile,
    MapObjective,
    UserCharacterOwnership,
    UserPerkOwnership,
)

logger = logging.getLogger(__name__)


def normalize_search_key(text: str) -> str:
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    normalized = normalized.lower().strip()
    normalized = re.sub(r"[^a-z0-9]", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


class CharacterModel(BaseModel):
    name: str = Field(..., description="Canonical title e.g. 'Meg Thomas' or 'The Wraith'")
    real_name: Optional[str] = Field(default="", description="Real name e.g. 'Philip Ojomo'")
    wiki_slug: Optional[str] = ""
    short_name: Optional[str] = ""
    category: str = "Survivor"
    avatar_url: Optional[str] = ""
    avatar_local_path: Optional[str] = ""
    release_number: Optional[int] = None


class ItemModel(BaseModel):
    name: str
    category: str = ""
    role: Optional[str] = "Survivor"
    description: Optional[str] = ""
    icon_url: Optional[str] = ""
    icon_local_path: Optional[str] = ""
    rarity: Optional[str] = ""


class AddonModel(BaseModel):
    name: str
    associated_target: Optional[str] = ""
    category: Optional[str] = ""
    description: Optional[str] = ""
    icon_url: Optional[str] = ""
    icon_local_path: Optional[str] = ""
    rarity: Optional[str] = ""


class MapModel(BaseModel):
    id: str
    name: str
    realm: str
    realm_id: Optional[str] = ""
    callout_image_url: Optional[str] = ""
    callout_image_local_path: Optional[str] = ""
    source: Optional[str] = "hens333"
    source_label: Optional[str] = "Hens333 12-Clock Callouts"
    clock_system: Optional[Dict[str, Any]] = None
    tiles: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    objectives: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    totems: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    seed_variant: Optional[str] = "seed_a"
    floor: Optional[int] = 1


class PerkModel(BaseModel):
    name: str
    alternate_name: Optional[str] = ""
    is_generic_counterpart: bool = False
    character: str = "General"
    character_real_name: Optional[str] = "General"
    character_avatar_path: Optional[str] = ""
    category: str = "Survivor"
    description: str = ""
    icon_url: str = ""
    icon_local_path: str = ""


HEADER_EXCLUSIONS = {
    "uncommon items", "rare items", "very rare items", "ultra rare items",
    "common items", "event items", "unused item", "limited items",
    "survivor items", "killer items", "items", "add-ons", "addons", "equipment"
}

DEFAULT_SURVIVORS = [
    "Meg Thomas",
    "Claudette Morel",
    "Dwight Fairfield",
    "Jake Park",
    "Nea Karlsson",
    "Laurie Strode",
    "Ace Visconti",
]

DEFAULT_KILLERS = [
    "The Trapper",
    "The Wraith",
    "The Hillbilly",
    "The Nurse",
    "The Shape",
    "The Hag",
    "The Doctor",
    "The Huntress",
]


class PerkService:
    ALLOWED_SORT_FIELDS = {"name", "character", "category"}

    def __init__(self, data_path: Optional[Path] = None):
        if data_path is None:
            data_path = Path(__file__).resolve().parent.parent.parent / "data" / "perks.json"
        self.data_path = Path(data_path)
        self.characters_path = self.data_path.parent / "characters.json"
        self.items_path = self.data_path.parent / "items.json"
        self.addons_path = self.data_path.parent / "addons.json"
        self.maps_path = self.data_path.parent / "maps.json"

        self._cache: List[Dict[str, Any]] = []
        self._characters_cache: List[Dict[str, Any]] = []
        self._items_cache: List[Any] = []
        self._addons_cache: List[Any] = []
        self._maps_cache: List[Dict[str, Any]] = []

        self.reload_data()

    @staticmethod
    def _sanitize_name(name: str) -> str:
        clean_str = name.lower().strip()
        clean_str = re.sub(r"[\s\-/]+", "_", clean_str)
        clean_str = re.sub(r'[\\/*?:"<>|]', "", clean_str)
        clean_str = re.sub(r"_+", "_", clean_str)
        return clean_str.strip("_")

    @staticmethod
    def _slugify(text: str) -> str:
        if not text:
            return ""
        normalized = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
        clean = normalized.lower().strip()
        clean = re.sub(r"[\s\-/]+", "_", clean)
        clean = re.sub(r"[^a-z0-9_]", "", clean)
        clean = re.sub(r"_+", "_", clean)
        return clean.strip("_")

    @staticmethod
    def clean_description(text: str) -> str:
        if not text or not isinstance(text, str):
            return ""
        cleaned = re.sub(r"<[^>]+>", "", text)
        cleaned = re.sub(r'\b[a-zA-Z0-9_-]+=["\'][^"\']*["\']\s*>?', "", cleaned)
        cleaned = html.unescape(cleaned)
        cleaned = cleaned.replace("\ufffd", '"')
        cleaned = re.sub(r'\?([A-Z"])', r'"\1', cleaned)
        cleaned = re.sub(r'([a-z.,!])\?\s*-', r'\1" -', cleaned)
        cleaned = re.sub(r'(\d+)(?:\s*/\s*(\d+))+', lambda m: re.sub(r'\s*/\s*', '/', m.group(0)), cleaned)
        cleaned = re.sub(r'(\d+)\s+(%)', r'\1\2', cleaned)
        cleaned = re.sub(r'(\d+)\s+(s|m)\b(?!\w)', r'\1\2', cleaned)
        return cleaned.strip()

    def reload_data(self) -> None:
        try:
            if current_app:
                char_count = db.session.scalar(select(func.count(Character.id))) or 0
                perk_count = db.session.scalar(select(func.count(Perk.id))) or 0
                item_count = db.session.scalar(select(func.count(Item.id))) or 0
                addon_count = db.session.scalar(select(func.count(Addon.id))) or 0
                map_count = db.session.scalar(select(func.count(MapRealm.id))) or 0

                if char_count == 0 or perk_count == 0 or item_count == 0 or addon_count == 0 or map_count == 0:
                    self._seed_database_from_json_files()
                return
        except Exception as e:
            logger.debug(f"Database query check during reload_data: {e}")

        self._load_fallback_files()

    def _seed_database_from_json_files(self):
        try:
            char_count = db.session.scalar(select(func.count(Character.id))) or 0
            if char_count == 0 and self.characters_path.exists():
                with open(self.characters_path, "r", encoding="utf-8") as f:
                    raw_chars = json.load(f)
                    for c in raw_chars:
                        existing = db.session.scalars(
                            select(Character).where(Character.name == c["name"])
                        ).first()
                        if not existing:
                            db.session.add(
                                Character(
                                    name=c["name"],
                                    role=c.get("category") or c.get("role", "Survivor"),
                                    real_name=c.get("real_name", c["name"]),
                                    short_name=c.get("short_name", ""),
                                    wiki_slug=c.get("wiki_slug", ""),
                                    portrait_url=c.get("avatar_url", ""),
                                    avatar_local_path=c.get("avatar_local_path", ""),
                                    release_number=c.get("release_number"),
                                    code_prefix=c.get("code_prefix"),
                                    chapter_name=c.get("chapter_name"),
                                    chapter_number=c.get("chapter_number"),
                                    dlc_type=c.get("dlc_type"),
                                    is_licensed=c.get("is_licensed", False),
                                    release_year=c.get("release_year"),
                                    release_date=c.get("release_date"),
                                    dlc_counterparts=c.get("dlc_counterparts"),
                                    lore=c.get("lore"),
                                )
                            )
                    db.session.commit()

            perk_count = db.session.scalar(select(func.count(Perk.id))) or 0
            if perk_count == 0 and self.data_path.exists():
                with open(self.data_path, "r", encoding="utf-8") as f:
                    raw_perks = json.load(f)
                    for p in raw_perks:
                        existing = db.session.scalars(
                            select(Perk).where(Perk.name == p["name"])
                        ).first()
                        if not existing:
                            char_name = p.get("character")
                            matched_char = None
                            if char_name and char_name.lower() not in ["none", "all", "general"]:
                                matched_char = db.session.scalars(
                                    select(Character).where(
                                        or_(
                                            func.lower(Character.name) == char_name.lower(),
                                            func.lower(Character.real_name) == char_name.lower(),
                                        )
                                    )
                                ).first()

                            db.session.add(
                                Perk(
                                    name=p["name"],
                                    alternate_name=p.get("alternate_name"),
                                    is_generic_counterpart=p.get("is_generic_counterpart", False),
                                    category=p.get("category", "Survivor"),
                                    is_teachable=(matched_char is not None),
                                    description=self.clean_description(p.get("description", "")),
                                    icon_url=p.get("icon_url", ""),
                                    icon_local_path=p.get("icon_local_path", ""),
                                    character_id=matched_char.id if matched_char else None,
                                )
                            )
                    db.session.commit()

            item_count = db.session.scalar(select(func.count(Item.id))) or 0
            if item_count == 0 and self.items_path.exists():
                with open(self.items_path, "r", encoding="utf-8") as f:
                    raw_items = json.load(f)
                    for item in raw_items:
                        existing = db.session.scalars(
                            select(Item).where(Item.name == item["name"])
                        ).first()
                        if not existing:
                            db.session.add(
                                Item(
                                    name=item["name"],
                                    category=item.get("category", ""),
                                    role=item.get("role", "Survivor"),
                                    description=self.clean_description(item.get("description", "")),
                                    icon_url=item.get("icon_url", ""),
                                    icon_local_path=item.get("icon_local_path", ""),
                                    rarity=item.get("rarity", ""),
                                )
                            )
                    db.session.commit()

            addon_count = db.session.scalar(select(func.count(Addon.id))) or 0
            if addon_count == 0 and self.addons_path.exists():
                with open(self.addons_path, "r", encoding="utf-8") as f:
                    raw_addons = json.load(f)
                    for addon in raw_addons:
                        existing = db.session.scalars(
                            select(Addon).where(Addon.name == addon["name"])
                        ).first()
                        if not existing:
                            db.session.add(
                                Addon(
                                    name=addon["name"],
                                    associated_target=addon.get("associated_target", ""),
                                    category=addon.get("category", ""),
                                    description=self.clean_description(addon.get("description", "")),
                                    icon_url=addon.get("icon_url", ""),
                                    icon_local_path=addon.get("icon_local_path", ""),
                                    rarity=addon.get("rarity", ""),
                                )
                            )
                    db.session.commit()

            map_count = db.session.scalar(select(func.count(MapRealm.id))) or 0
            if map_count == 0 and self.maps_path.exists():
                with open(self.maps_path, "r", encoding="utf-8") as f:
                    raw_maps = json.load(f)
                    for m in raw_maps:
                        existing = db.session.scalars(
                            select(MapRealm).where(MapRealm.map_id == m["id"])
                        ).first()
                        if not existing:
                            desc = m.get("description", "")
                            clock_sys = m.get("clock_system")
                            if not desc and clock_sys and isinstance(clock_sys, dict):
                                desc = clock_sys.get("description", "")

                            map_realm = MapRealm(
                                map_id=m["id"],
                                name=m["name"],
                                realm=m["realm"],
                                realm_id=m.get("realm_id", ""),
                                source=m.get("source", "hens333"),
                                source_label=m.get("source_label", "Hens333 12-Clock Callouts"),
                                callout_image_url=m.get("callout_image_url", ""),
                                callout_image_local_path=m.get("callout_image_local_path", ""),
                                image_url=m.get("image_url", ""),
                                layout_type=m.get("layout_type", "Standard"),
                                jungle_gyms_count=m.get("jungle_gyms_count", 4),
                                totem_spawns_count=m.get("totem_spawns_count", 5),
                                pallet_density=m.get("pallet_density", "Medium"),
                                shack_has_basement=m.get("shack_has_basement", True),
                                description=desc,
                            )
                            db.session.add(map_realm)
                            db.session.flush()

                            if m.get("tiles"):
                                for tile in m.get("tiles", []):
                                    pos = tile.get("position", {})
                                    db.session.add(
                                        MapTile(
                                            map_id=map_realm.map_id,
                                            name=tile.get("name", ""),
                                            type=tile.get("type", "landmark"),
                                            x=pos.get("x", 0.0),
                                            y=pos.get("y", 0.0),
                                            seed_variant=m.get("seed_variant", "seed_a"),
                                            floor=m.get("floor", 1),
                                            has_pallet=tile.get("has_pallet", False),
                                            has_window=tile.get("has_window", False),
                                        )
                                    )
                            elif clock_sys and isinstance(clock_sys, dict):
                                landmark_positions = [
                                    ("twelve_o_clock", "12 O'Clock: " + str(clock_sys.get("twelve_o_clock", "Main Building / North Exit Gate")), 0.5, 0.1),
                                    ("three_o_clock", "3 O'Clock: " + str(clock_sys.get("three_o_clock", "East Gym / Outer Loop")), 0.9, 0.5),
                                    ("six_o_clock", "6 O'Clock: " + str(clock_sys.get("six_o_clock", "Killer Shack / South Exit Gate")), 0.5, 0.9),
                                    ("nine_o_clock", "9 O'Clock: " + str(clock_sys.get("nine_o_clock", "West Gym / L-T Wall")), 0.1, 0.5),
                                    ("center", "Center: " + str(clock_sys.get("center", "Central Landmark")), 0.5, 0.5),
                                ]
                                for key, tile_name, tx, ty in landmark_positions:
                                    db.session.add(
                                        MapTile(
                                            map_id=map_realm.map_id,
                                            name=tile_name,
                                            type="landmark",
                                            x=tx,
                                            y=ty,
                                            seed_variant="seed_a",
                                            floor=1,
                                            has_pallet=("shack" in tile_name.lower() or "gym" in tile_name.lower()),
                                            has_window=("shack" in tile_name.lower() or "gym" in tile_name.lower() or "main" in tile_name.lower()),
                                        )
                                    )
                    db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error seeding database from JSON files: {e}")

    def _load_fallback_files(self):
        if self.characters_path.exists():
            try:
                with open(self.characters_path, "r", encoding="utf-8") as f:
                    self._characters_cache = json.load(f)
            except Exception:
                self._characters_cache = []
        if self.data_path.exists():
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    for p in raw_data:
                        if "description" in p:
                            p["description"] = self.clean_description(p["description"])
                    self._cache = raw_data
            except Exception:
                self._cache = []
        if self.items_path.exists():
            try:
                with open(self.items_path, "r", encoding="utf-8") as f:
                    raw_items = json.load(f)
                    for i in raw_items:
                        if "description" in i:
                            i["description"] = self.clean_description(i["description"])
                    self._items_cache = raw_items
            except Exception:
                self._items_cache = []
        if self.addons_path.exists():
            try:
                with open(self.addons_path, "r", encoding="utf-8") as f:
                    raw_addons = json.load(f)
                    for a in raw_addons:
                        if "description" in a:
                            a["description"] = self.clean_description(a["description"])
                    self._addons_cache = raw_addons
            except Exception:
                self._addons_cache = []
        if self.maps_path.exists():
            try:
                with open(self.maps_path, "r", encoding="utf-8") as f:
                    self._maps_cache = json.load(f)
            except Exception:
                self._maps_cache = []

    def get_perks(
        self,
        category: Optional[str] = None,
        character: Optional[str] = None,
        scope: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "name",
        order: str = "asc",
        page: int = 1,
        limit: int = 50,
        user_id: Optional[int] = None,
        owned_only: bool = False,
    ) -> Dict[str, Any]:
        try:
            stmt = select(Perk).outerjoin(Perk.character).options(joinedload(Perk.character))

            if category and category.lower() != "all":
                stmt = stmt.where(func.lower(Perk.category) == category.lower())

            if character and character.lower() != "all":
                if character.lower() == "general":
                    stmt = stmt.where(
                        or_(
                            Perk.character_id.is_(None),
                            Perk.is_generic_counterpart.is_(True),
                        )
                    )
                else:
                    stmt = stmt.where(
                        or_(
                            func.lower(Character.name) == character.lower(),
                            func.lower(Character.real_name) == character.lower(),
                            func.lower(Character.short_name) == character.lower(),
                            func.lower(Character.wiki_slug) == character.lower(),
                        )
                    )

            if scope and scope.lower() == "general":
                stmt = stmt.where(
                    or_(
                        Perk.character_id.is_(None),
                        Perk.is_generic_counterpart.is_(True),
                    )
                )
            elif scope and scope.lower() == "teachable":
                stmt = stmt.where(
                    and_(
                        Perk.character_id.is_not(None),
                        Perk.is_generic_counterpart.is_(False),
                    )
                )

            if owned_only and user_id:
                locked_perks_subq = select(UserPerkOwnership.perk_id).where(
                    UserPerkOwnership.user_id == user_id,
                    UserPerkOwnership.is_unlocked.is_(False),
                )
                deactivated_chars_subq = select(UserCharacterOwnership.character_id).where(
                    UserCharacterOwnership.user_id == user_id,
                    UserCharacterOwnership.is_owned.is_(False),
                )
                unlocked_perks_subq = select(UserPerkOwnership.perk_id).where(
                    UserPerkOwnership.user_id == user_id,
                    UserPerkOwnership.is_unlocked.is_(True),
                )

                stmt = stmt.where(
                    or_(
                        Perk.character_id.is_(None),
                        Perk.is_generic_counterpart.is_(True),
                        and_(
                            Perk.id.not_in(locked_perks_subq),
                            or_(
                                Perk.id.in_(unlocked_perks_subq),
                                Perk.character_id.not_in(deactivated_chars_subq),
                            ),
                        ),
                    )
                )

            if search:
                query_str = f"%{search.strip().lower()}%"
                is_general_match = "general" in search.strip().lower()
                conditions = [
                    func.lower(Perk.name).like(query_str),
                    func.lower(Perk.alternate_name).like(query_str),
                    func.lower(Perk.description).like(query_str),
                    func.lower(Character.name).like(query_str),
                    func.lower(Character.real_name).like(query_str),
                ]
                if is_general_match:
                    conditions.append(
                        or_(
                            Perk.character_id.is_(None),
                            Perk.is_generic_counterpart.is_(True),
                        )
                    )
                stmt = stmt.where(or_(*conditions))

            valid_sort_field = sort_by.lower() if sort_by.lower() in self.ALLOWED_SORT_FIELDS else "name"
            if valid_sort_field == "character":
                sort_col = func.coalesce(Character.name, "General")
            elif valid_sort_field == "category":
                sort_col = Perk.category
            else:
                sort_col = Perk.name

            reverse = (order.lower() == "desc")
            if reverse:
                stmt = stmt.order_by(sort_col.desc(), Perk.name.desc())
            else:
                stmt = stmt.order_by(sort_col.asc(), Perk.name.asc())

            count_stmt = select(func.count()).select_from(stmt.subquery())
            total_count = db.session.scalar(count_stmt) or 0

            page = max(1, page)
            limit = max(1, min(limit, 10000))
            total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
            offset = (page - 1) * limit

            paginated_stmt = stmt.offset(offset).limit(limit)
            perks = db.session.scalars(paginated_stmt).unique().all()

            paginated_data = []
            if user_id:
                deactivated_char_ids = set(
                    db.session.scalars(
                        select(UserCharacterOwnership.character_id).where(
                            UserCharacterOwnership.user_id == user_id,
                            UserCharacterOwnership.is_owned.is_(False),
                        )
                    ).all()
                )
                perk_explicit_rows = db.session.execute(
                    select(UserPerkOwnership.perk_id, UserPerkOwnership.is_unlocked).where(
                        UserPerkOwnership.user_id == user_id
                    )
                ).all()
                perk_explicit_map = {row[0]: row[1] for row in perk_explicit_rows}

                for p in perks:
                    d = p.to_dict()
                    is_gen = p.character_id is None or p.is_generic_counterpart
                    if is_gen:
                        is_owned = True
                    elif p.id in perk_explicit_map:
                        is_owned = perk_explicit_map[p.id]
                    else:
                        is_owned = (p.character_id not in deactivated_char_ids) if p.character_id else True
                    d["is_owned"] = bool(is_owned)
                    paginated_data.append(d)
            else:
                for p in perks:
                    d = p.to_dict()
                    d["is_owned"] = True
                    paginated_data.append(d)

            return {
                "data": paginated_data,
                "pagination": {
                    "total": total_count,
                    "page": page,
                    "limit": limit,
                    "total_pages": total_pages,
                    "has_next": offset + limit < total_count,
                    "has_prev": page > 1,
                },
                "filters": {
                    "category": category or "all",
                    "character": character or "all",
                    "scope": scope or "all",
                    "search": search or "",
                    "sort_by": valid_sort_field,
                    "order": "desc" if reverse else "asc",
                    "owned_only": owned_only,
                },
            }
        except Exception as e:
            logger.debug(f"Falling back to memory cache in get_perks: {e}")

        return self._get_perks_fallback(category, character, scope, search, sort_by, order, page, limit)

    def _get_perks_fallback(self, category, character, scope, search, sort_by, order, page, limit):
        results = self._cache
        if category and category.lower() != "all":
            results = [p for p in results if p.get("category", "").lower() == category.lower()]

        if character and character.lower() != "all":
            if character.lower() == "general":
                results = [
                    p for p in results
                    if not p.get("character")
                    or p.get("character").lower() == "general"
                    or p.get("is_generic_counterpart")
                ]
            else:
                results = [
                    p for p in results
                    if p.get("character", "").lower() == character.lower()
                    or p.get("character_real_name", "").lower() == character.lower()
                ]

        if scope and scope.lower() == "general":
            results = [
                p for p in results
                if not p.get("character")
                or p.get("character").lower() == "general"
                or p.get("is_generic_counterpart")
            ]
        elif scope and scope.lower() == "teachable":
            results = [
                p for p in results
                if p.get("character")
                and p.get("character").lower() != "general"
                and not p.get("is_generic_counterpart")
            ]

        if search:
            query = search.lower().strip()
            results = [
                p for p in results
                if query in p.get("name", "").lower()
                or query in p.get("alternate_name", "").lower()
                or query in p.get("description", "").lower()
                or query in p.get("character", "").lower()
                or (query == "general" and (not p.get("character") or p.get("character").lower() == "general"))
            ]

        valid_sort_field = sort_by.lower() if sort_by.lower() in self.ALLOWED_SORT_FIELDS else "name"
        reverse = (order.lower() == "desc")
        results = sorted(
            results,
            key=lambda x: str(x.get(valid_sort_field, "") or ("General" if valid_sort_field == "character" else "")).lower(),
            reverse=reverse,
        )

        total_count = len(results)
        page = max(1, page)
        limit = max(1, min(limit, 10000))
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit

        data_slice = []
        for p in results[start_idx:end_idx]:
            p_copy = dict(p)
            p_copy["is_owned"] = True
            data_slice.append(p_copy)

        return {
            "data": data_slice,
            "pagination": {
                "total": total_count,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
                "has_next": end_idx < total_count,
                "has_prev": page > 1,
            },
            "filters": {
                "category": category or "all",
                "character": character or "all",
                "scope": scope or "all",
                "search": search or "",
                "sort_by": valid_sort_field,
                "order": "desc" if reverse else "asc",
                "owned_only": False,
            },
        }

    def get_perk_suggestions(
        self,
        query: str = "",
        category: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        try:
            stmt = select(Perk).outerjoin(Perk.character).options(joinedload(Perk.character))
            if category and category.lower() != "all":
                stmt = stmt.where(func.lower(Perk.category) == category.lower())

            if query:
                q_clean = f"%{query.strip().lower()}%"
                stmt = stmt.where(
                    or_(
                        func.lower(Perk.name).like(q_clean),
                        func.lower(Perk.alternate_name).like(q_clean),
                    )
                )

            stmt = stmt.order_by(Perk.name.asc()).limit(limit)
            perks = db.session.scalars(stmt).unique().all()
            return [
                {
                    "id": p.id,
                    "name": p.name,
                    "alternate_name": p.alternate_name or "",
                    "category": p.category,
                    "character": p.character.name if p.character else "General",
                    "icon_url": p.icon_url or "",
                    "icon_local_path": p.icon_local_path or "",
                }
                for p in perks
            ]
        except Exception:
            q_clean = query.strip().lower()
            res = []
            for p in self._cache:
                if category and category.lower() != "all" and p.get("category", "").lower() != category.lower():
                    continue
                if not q_clean or q_clean in p.get("name", "").lower() or q_clean in p.get("alternate_name", "").lower():
                    res.append({
                        "id": p.get("id"),
                        "name": p.get("name", ""),
                        "alternate_name": p.get("alternate_name", ""),
                        "category": p.get("category", "Survivor"),
                        "character": p.get("character", "General"),
                        "icon_url": p.get("icon_url", ""),
                        "icon_local_path": p.get("icon_local_path", ""),
                    })
                if len(res) >= limit:
                    break
            return res

    def get_character_suggestions(
        self,
        query: str = "",
        category: Optional[str] = None,
        limit: int = 15,
    ) -> List[Dict[str, Any]]:
        try:
            stmt = select(Character)
            if category and category.lower() != "all":
                stmt = stmt.where(func.lower(Character.role) == category.lower())

            if query:
                q_clean = f"%{query.strip().lower()}%"
                stmt = stmt.where(
                    or_(
                        func.lower(Character.name).like(q_clean),
                        func.lower(Character.real_name).like(q_clean),
                        func.lower(Character.short_name).like(q_clean),
                    )
                )

            stmt = stmt.order_by(Character.name.asc()).limit(limit)
            chars = db.session.scalars(stmt).all()
            return [
                {
                    "id": c.id,
                    "name": c.name,
                    "real_name": c.real_name or c.name,
                    "category": c.role,
                    "avatar_local_path": c.avatar_local_path or "",
                    "portrait_url": c.portrait_url or "",
                }
                for c in chars
            ]
        except Exception:
            q_clean = query.strip().lower()
            res = []
            for c in self._characters_cache:
                if category and category.lower() != "all" and (c.get("category") or c.get("role", "")).lower() != category.lower():
                    continue
                if not q_clean or q_clean in c.get("name", "").lower() or q_clean in c.get("real_name", "").lower():
                    res.append({
                        "id": c.get("id"),
                        "name": c.get("name", ""),
                        "real_name": c.get("real_name", c.get("name", "")),
                        "category": c.get("category") or c.get("role", "Survivor"),
                        "avatar_local_path": c.get("avatar_local_path", ""),
                        "portrait_url": c.get("avatar_url", ""),
                    })
                if len(res) >= limit:
                    break
            return res

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        target = identifier.lower().strip()
        target_slug = self._slugify(identifier)

        try:
            stmt = select(Perk).options(joinedload(Perk.character)).where(
                or_(
                    func.lower(Perk.name) == target,
                    func.lower(Perk.alternate_name) == target,
                    func.lower(func.replace(func.replace(Perk.name, " ", "_"), "-", "_")) == target_slug,
                    func.lower(func.replace(func.replace(Perk.alternate_name, " ", "_"), "-", "_")) == target_slug,
                )
            )
            perk = db.session.scalars(stmt).first()
            if perk:
                return perk.to_dict()
        except Exception:
            pass

        for p in self._cache:
            p_name = p.get("name", "").lower().strip()
            p_alt = p.get("alternate_name", "").lower().strip()
            if p_name == target or p_alt == target or self._slugify(p_name) == target_slug or self._slugify(p_alt) == target_slug:
                return p
        return None

    def get_characters(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            stmt = select(Character).options(joinedload(Character.perks))
            if category and category.lower() != "all":
                stmt = stmt.where(func.lower(Character.role) == category.lower())

            stmt = stmt.order_by(
                case(
                    (and_(Character.release_number.is_not(None), Character.release_number > 0), Character.release_number),
                    else_=9999
                ).asc(),
                Character.id.asc(),
                Character.name.asc()
            )

            characters = db.session.scalars(stmt).unique().all()
            if characters:
                return [c.to_dict() for c in characters]
        except Exception as e:
            logger.debug(f"Querying characters from DB: {e}")

        return self._characters_cache

    def get_character_detail(self, character_name: str) -> Optional[Dict[str, Any]]:
        target_clean = character_name.strip().lower()
        target_slug = self._slugify(character_name)

        try:
            stmt = select(Character).options(joinedload(Character.perks))
            chars = db.session.scalars(stmt).unique().all()
            matched_char: Optional[Character] = None

            for c in chars:
                c_name = c.name.lower()
                c_real = (c.real_name or "").lower()
                c_slug = (c.wiki_slug or "").lower()
                c_short = (c.short_name or "").lower()

                if (
                    c_name == target_clean
                    or c_real == target_clean
                    or self._slugify(c.name) == target_slug
                    or (c.real_name and self._slugify(c.real_name) == target_slug)
                    or (c.wiki_slug and self._slugify(c.wiki_slug) == target_slug)
                    or (c.short_name and self._slugify(c.short_name) == target_slug)
                    or c_slug == target_slug
                    or c_short == target_clean
                ):
                    matched_char = c
                    break

            if not matched_char:
                return None

            char_dict = matched_char.to_dict()
            char_role = matched_char.role or "Survivor"
            perks_list = [p.to_dict() for p in matched_char.perks]

            addons_list: List[Dict[str, Any]] = []
            items_list: List[Dict[str, Any]] = []

            if char_role.lower() == "killer":
                all_addons = db.session.scalars(
                    select(Addon).where(func.lower(Addon.category) == "killer")
                ).all()
                matched_addons = []

                # Build token set for exact killer target matching
                canonical_name = matched_char.name.strip()
                no_article_name = re.sub(r"^the\s+", "", canonical_name, flags=re.IGNORECASE).strip()

                char_tokens = {
                    normalize_search_key(canonical_name),
                    normalize_search_key(no_article_name),
                    normalize_search_key(matched_char.real_name or ""),
                    normalize_search_key(matched_char.wiki_slug or ""),
                    normalize_search_key(matched_char.short_name or ""),
                }
                if matched_char.power_name:
                    p_norm = normalize_search_key(matched_char.power_name)
                    char_tokens.add(p_norm)
                    if p_norm.endswith("s"):
                        char_tokens.add(p_norm[:-1])
                    if p_norm.endswith("es"):
                        char_tokens.add(p_norm[:-2])
                char_tokens.discard("")

                for a in all_addons:
                    raw_target = (a.associated_target or "").strip()
                    target_norm = normalize_search_key(raw_target)
                    if not target_norm:
                        continue

                    # 1. Exact normalized target match
                    if target_norm in char_tokens:
                        matched_addons.append(a)
                        continue

                    # Target without "the"
                    target_no_art = re.sub(r"^the\s+", "", target_norm).strip()
                    if target_no_art in char_tokens:
                        matched_addons.append(a)
                        continue

                    # 2. Complete word-boundary matching (prevents "oni" matching "animatronic")
                    target_words = set(target_norm.split())
                    matched_word = False
                    for tok in char_tokens:
                        tok_words = tok.split()
                        if len(tok_words) == 1:
                            if tok in target_words and tok not in {"the", "and", "for", "all"}:
                                matched_word = True
                                break
                        else:
                            if tok in target_norm:
                                matched_word = True
                                break

                    if matched_word:
                        matched_addons.append(a)

                addons_list = [a.to_dict() for a in matched_addons]
            else:
                items_stmt = select(Item).where(func.lower(Item.role) == "survivor")
                items = db.session.scalars(items_stmt).all()
                items_list = [i.to_dict() for i in items if i.name.lower().strip() not in HEADER_EXCLUSIONS]

                survivor_addons_stmt = select(Addon).where(func.lower(Addon.category) == "survivor")
                survivor_addons = db.session.scalars(survivor_addons_stmt).all()
                addons_list = [
                    a.to_dict()
                    for a in survivor_addons
                    if a.name.lower().strip() not in HEADER_EXCLUSIONS and "numbers" not in (a.associated_target or "").lower()
                ]

            return {
                "character": char_dict,
                "power": char_dict.get("power"),
                "perks": perks_list,
                "addons": addons_list,
                "items": items_list,
            }
        except Exception as e:
            logger.error(f"Error getting character detail from DB: {e}", exc_info=True)
            return None

    def get_items(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        try:
            stmt = select(Item).where(~Item.name.ilike("% items"))
            if category and category.lower() != "all":
                stmt = stmt.where(func.lower(Item.category) == category.lower())
            if search:
                q = f"%{search.strip().lower()}%"
                stmt = stmt.where(
                    or_(
                        func.lower(Item.name).like(q),
                        func.lower(Item.description).like(q),
                        func.lower(Item.category).like(q),
                        func.lower(Item.role).like(q),
                    )
                )
            items = db.session.scalars(stmt).all()
            return [i.to_dict() for i in items if i.name.lower().strip() not in HEADER_EXCLUSIONS]
        except Exception:
            return []

    def get_addons(
        self,
        category: Optional[str] = None,
        target: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        try:
            stmt = select(Addon)
            if category and category.lower() != "all":
                stmt = stmt.where(func.lower(Addon.category) == category.lower())
            if target and target.lower() != "all":
                stmt = stmt.where(func.lower(Addon.associated_target) == target.lower())
            if search:
                q = f"%{search.strip().lower()}%"
                stmt = stmt.where(
                    or_(
                        func.lower(Addon.name).like(q),
                        func.lower(Addon.description).like(q),
                        func.lower(Addon.category).like(q),
                        func.lower(Addon.associated_target).like(q),
                    )
                )
            addons = db.session.scalars(stmt).all()
            return [a.to_dict() for a in addons]
        except Exception:
            return []

    def get_maps(
        self,
        realm: Optional[str] = None,
        search: Optional[str] = None,
        source: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        try:
            stmt = select(MapRealm).options(
                joinedload(MapRealm.tiles),
                joinedload(MapRealm.objectives)
            )
            if source and source.lower() != "all":
                stmt = stmt.where(func.lower(MapRealm.source) == source.lower())
            if realm and realm.lower() != "all":
                r_clean = realm.lower().strip()
                stmt = stmt.where(
                    or_(
                        func.lower(MapRealm.realm) == r_clean,
                        func.lower(MapRealm.realm_id) == r_clean,
                    )
                )
            if search:
                q = f"%{search.strip().lower()}%"
                stmt = stmt.where(
                    or_(
                        func.lower(MapRealm.name).like(q),
                        func.lower(MapRealm.realm).like(q),
                    )
                )
            maps = db.session.scalars(stmt).unique().all()
            if maps:
                return [m.to_dict() for m in maps]
        except Exception:
            pass
        return self._maps_cache

    def get_map_detail(
        self,
        map_id: str,
        seed: Optional[str] = None,
        floor: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        try:
            target = map_id.lower().replace("_", "").replace("-", "").strip()
            stmt = select(MapRealm).options(
                joinedload(MapRealm.tiles),
                joinedload(MapRealm.objectives)
            )
            maps = db.session.scalars(stmt).unique().all()
            for m in maps:
                m_clean = m.map_id.lower().replace("_", "").replace("-", "").strip()
                if m.map_id.lower() == map_id.lower() or m.name.lower() == map_id.lower() or target in m_clean or m_clean in target:
                    res = m.to_dict()
                    res["seed_variant"] = seed or "seed_a"
                    res["floor"] = floor or 1
                    return res
        except Exception:
            pass
        return None