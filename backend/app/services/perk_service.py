import json
import logging
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from flask import current_app
from sqlalchemy import func, select, or_, and_
from sqlalchemy.orm import joinedload
from pydantic import BaseModel, Field

from app.extensions import db
from app.models import Character, Perk, Item, Addon, MapRealm, MapTile, MapObjective

logger = logging.getLogger(__name__)


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

DEFAULT_SURVIVORS = ["Meg Thomas", "Claudette Morel", "Dwight Fairfield", "Jake Park", "Nea Karlsson", "Laurie Strode", "Ace Visconti"]
DEFAULT_KILLERS = ["The Trapper", "The Wraith", "The Hillbilly", "The Nurse", "The Shape", "The Hag", "The Doctor", "The Huntress"]


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

        # In-memory fallback caches
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
        return re.sub(r"[\s\-/]+", "_", text.lower().strip())

    @staticmethod
    def clean_description(text: str) -> str:
        if not text or not isinstance(text, str):
            return ""
        cleaned = re.sub(r"<[^>]+>", "", text)
        cleaned = re.sub(r'\b[a-zA-Z0-9_-]+=["\'][^"\']*["\']\s*>?', "", cleaned)
        import html
        cleaned = html.unescape(cleaned)
        cleaned = cleaned.replace("\ufffd", '"')
        cleaned = re.sub(r'\?([A-Z"])', r'"\1', cleaned)
        cleaned = re.sub(r'([a-z.,!])\?\s*-', r'\1" -', cleaned)
        cleaned = re.sub(r'(\d+)(?:\s*/\s*(\d+))+', lambda m: re.sub(r'\s*/\s*', '/', m.group(0)), cleaned)
        cleaned = re.sub(r'(\d+)\s+(%)', r'\1\2', cleaned)
        cleaned = re.sub(r'(\d+)\s+(s|m)\b(?!\w)', r'\1\2', cleaned)
        return cleaned.strip()

    def reload_data(self) -> None:
        """Loads data from database into fallback cache or seeds from disk if DB is empty."""
        try:
            if current_app:
                char_count = db.session.scalar(select(func.count(Character.id))) or 0
                if char_count > 0:
                    return

                self._seed_database_from_json_files()
                return
        except Exception as e:
            logger.debug(f"SQLAlchemy query during reload_data skipped/failed: {e}")

        self._load_fallback_files()

    def _seed_database_from_json_files(self):
        """Helper to seed the PostgreSQL / SQLite database from local JSON fixtures if present."""
        try:
            if self.characters_path.exists():
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
                                    role=c.get("category", "Survivor"),
                                    real_name=c.get("real_name", c["name"]),
                                    short_name=c.get("short_name", ""),
                                    wiki_slug=c.get("wiki_slug", ""),
                                    portrait_url=c.get("avatar_url", ""),
                                    avatar_local_path=c.get("avatar_local_path", ""),
                                    release_number=c.get("release_number"),
                                )
                            )
                    db.session.commit()

            if self.data_path.exists():
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
                                    category=p.get("category", "Survivor"),
                                    is_teachable=(matched_char is not None),
                                    description=self.clean_description(p.get("description", "")),
                                    icon_url=p.get("icon_url", ""),
                                    icon_local_path=p.get("icon_local_path", ""),
                                    character_id=matched_char.id if matched_char else None,
                                )
                            )
                    db.session.commit()

            if self.items_path.exists():
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

            if self.addons_path.exists():
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

            if self.maps_path.exists():
                with open(self.maps_path, "r", encoding="utf-8") as f:
                    raw_maps = json.load(f)
                    for m in raw_maps:
                        existing = db.session.scalars(
                            select(MapRealm).where(MapRealm.map_id == m["id"])
                        ).first()
                        if not existing:
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
                                layout_type=m.get("layout_type", ""),
                                jungle_gyms_count=m.get("jungle_gyms_count", 0),
                                totem_spawns_count=m.get("totem_spawns_count", 5),
                                pallet_density=m.get("pallet_density", ""),
                                shack_has_basement=m.get("shack_has_basement", True),
                                description=m.get("description", ""),
                            )
                            db.session.add(map_realm)
                            db.session.flush()

                            for tile in m.get("tiles", []):
                                pos = tile.get("position", {})
                                db.session.add(
                                    MapTile(
                                        map_id=map_realm.map_id,
                                        name=tile.get("name", ""),
                                        type=tile.get("type", ""),
                                        x=pos.get("x", 0.0),
                                        y=pos.get("y", 0.0),
                                        seed_variant=m.get("seed_variant", "seed_a"),
                                        floor=m.get("floor", 1),
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
        search: Optional[str] = None,
        sort_by: str = "name",
        order: str = "asc",
        page: int = 1,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """SQLAlchemy 2.0 query for paginated and filtered perks."""
        try:
            stmt = select(Perk).options(joinedload(Perk.character))

            if category and category.lower() != "all":
                stmt = stmt.where(func.lower(Perk.category) == category.lower())

            if character and character.lower() != "all":
                stmt = stmt.join(Perk.character).where(
                    func.lower(Character.name) == character.lower()
                )

            if search:
                query_str = f"%{search.strip().lower()}%"
                stmt = stmt.outerjoin(Perk.character).where(
                    or_(
                        func.lower(Perk.name).like(query_str),
                        func.lower(Perk.description).like(query_str),
                        func.lower(Character.name).like(query_str),
                        func.lower(Character.real_name).like(query_str),
                    )
                )

            # Sorting
            valid_sort_field = sort_by.lower() if sort_by.lower() in self.ALLOWED_SORT_FIELDS else "name"
            if valid_sort_field == "character":
                stmt = stmt.outerjoin(Perk.character)
                sort_col = func.coalesce(Character.name, "zzz")
            elif valid_sort_field == "category":
                sort_col = Perk.category
            else:
                sort_col = Perk.name

            reverse = (order.lower() == "desc")
            if reverse:
                stmt = stmt.order_by(sort_col.desc())
            else:
                stmt = stmt.order_by(sort_col.asc())

            count_stmt = select(func.count()).select_from(stmt.subquery())
            total_count = db.session.scalar(count_stmt) or 0

            page = max(1, page)
            limit = max(1, min(limit, 10000))
            total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
            offset = (page - 1) * limit

            paginated_stmt = stmt.offset(offset).limit(limit)
            perks = db.session.scalars(paginated_stmt).unique().all()
            paginated_data = [p.to_dict() for p in perks]

            if paginated_data:
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
                        "search": search or "",
                        "sort_by": valid_sort_field,
                        "order": "desc" if reverse else "asc",
                    },
                }
        except Exception as e:
            logger.debug(f"Falling back to memory cache in get_perks: {e}")

        return self._get_perks_fallback(category, character, search, sort_by, order, page, limit)

    def _get_perks_fallback(self, category, character, search, sort_by, order, page, limit):
        results = self._cache
        if category and category.lower() != "all":
            results = [p for p in results if p.get("category", "").lower() == category.lower()]
        if character and character.lower() != "all":
            results = [p for p in results if p.get("character", "").lower() == character.lower()]
        if search:
            query = search.lower().strip()
            results = [
                p for p in results
                if query in p.get("name", "").lower()
                or query in p.get("description", "").lower()
                or query in p.get("character", "").lower()
            ]
        valid_sort_field = sort_by.lower() if sort_by.lower() in self.ALLOWED_SORT_FIELDS else "name"
        reverse = (order.lower() == "desc")
        results = sorted(results, key=lambda x: str(x.get(valid_sort_field, "")).lower(), reverse=reverse)
        total_count = len(results)
        page = max(1, page)
        limit = max(1, min(limit, 10000))
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        return {
            "data": results[start_idx:end_idx],
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
                "search": search or "",
                "sort_by": valid_sort_field,
                "order": "desc" if reverse else "asc",
            },
        }

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        """SQLAlchemy 2.0 query to retrieve a single perk by name or slug."""
        target = identifier.lower().strip()
        try:
            stmt = select(Perk).options(joinedload(Perk.character)).where(
                or_(
                    func.lower(Perk.name) == target,
                    func.lower(func.replace(func.replace(Perk.name, " ", "_"), "-", "_")) == target
                )
            )
            perk = db.session.scalars(stmt).first()
            if perk:
                return perk.to_dict()
        except Exception:
            pass

        for p in self._cache:
            p_name = p.get("name", "").lower().strip()
            if p_name == target or self._slugify(p_name) == target:
                return p
        return None

    def get_characters(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """SQLAlchemy 2.0 query to retrieve characters."""
        try:
            stmt = select(Character).options(joinedload(Character.perks))
            if category and category.lower() != "all":
                stmt = stmt.where(func.lower(Character.role) == category.lower())

            stmt = stmt.where(
                and_(
                    ~Character.name.ilike("%overall_average%"),
                    ~Character.name.ilike("%overall average%"),
                )
            )

            stmt = stmt.order_by(
                Character.release_number.nulls_last(),
                Character.name.asc()
            )

            characters = db.session.scalars(stmt).unique().all()
            if characters:
                return [c.to_dict() for c in characters]
        except Exception as e:
            logger.debug(f"Querying characters from DB skipped/fallback: {e}")

        # Fallback cache
        results = [c for c in self._characters_cache if "overall_average" not in c.get("name", "").lower()]
        if category and category.lower() != "all":
            results = [c for c in results if c.get("category", "").lower() == category.lower()]

        if not results:
            cat_clean = (category or "").lower()
            if cat_clean == "survivor":
                results = [{"name": n, "category": "Survivor", "role": "Survivor"} for n in DEFAULT_SURVIVORS]
            elif cat_clean == "killer":
                results = [{"name": n, "category": "Killer", "role": "Killer"} for n in DEFAULT_KILLERS]
            else:
                results = [{"name": n, "category": "Survivor", "role": "Survivor"} for n in DEFAULT_SURVIVORS] + \
                          [{"name": n, "category": "Killer", "role": "Killer"} for n in DEFAULT_KILLERS]

        return results

    def get_character_detail(self, character_name: str) -> Optional[Dict[str, Any]]:
        """SQLAlchemy 2.0 query to retrieve full character detail, teachable perks, and items/addons."""
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
                    or c_slug == target_slug
                    or c_short == target_clean
                    or (target_clean in ["yun-jin lee", "yunjin lee", "yun-jin"] and "yun-jin" in c_name)
                    or (target_clean in ["david tapp", "tapp", "detective tapp"] and "tapp" in c_name)
                    or (target_clean in ["elodie rakoto", "elodie", "élodie rakoto"] and "lodie" in c_name)
                ):
                    matched_char = c
                    break

            if not matched_char:
                return None

            char_dict = matched_char.to_dict()
            char_role = matched_char.role

            # Teachable perks directly from ORM relationship
            perks_list = [p.to_dict() for p in matched_char.perks]

            addons_or_items: List[Dict[str, Any]] = []
            if char_role == "Killer":
                addons_stmt = select(Addon).where(
                    or_(
                        func.lower(Addon.associated_target) == matched_char.name.lower(),
                        func.lower(Addon.associated_target) == (matched_char.real_name or "").lower()
                    )
                )
                addons = db.session.scalars(addons_stmt).all()
                addons_or_items = [a.to_dict() for a in addons]
            else:
                items_stmt = select(Item).where(
                    and_(
                        func.lower(Item.role) == "survivor",
                        ~Item.name.ilike("% items")
                    )
                )
                items = db.session.scalars(items_stmt).all()
                addons_or_items = [i.to_dict() for i in items if i.name.lower().strip() not in HEADER_EXCLUSIONS]

            return {
                "character": char_dict,
                "perks": perks_list,
                "addons": addons_or_items,
            }
        except Exception as e:
            logger.debug(f"Error getting character detail from DB: {e}")
            return None

    def get_items(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """SQLAlchemy 2.0 query for items with fallback cache support."""
        if self._items_cache:
            results = []
            for item in self._items_cache:
                d = item if isinstance(item, dict) else item.model_dump()
                if d.get("name", "").lower().strip() not in HEADER_EXCLUSIONS and not d.get("name", "").lower().strip().endswith(" items"):
                    results.append(d)
            if category and category.lower() != "all":
                results = [item for item in results if item.get("category", "").lower() == category.lower()]
            if search:
                query = search.lower().strip()
                results = [
                    item for item in results
                    if (query in item.get("name", "").lower())
                    or (query in item.get("description", "").lower())
                    or (query in item.get("category", "").lower())
                ]
            return results

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
        """SQLAlchemy 2.0 query for addons with fallback cache support."""
        if self._addons_cache:
            results = [a if isinstance(a, dict) else a.model_dump() for a in self._addons_cache]
            if category and category.lower() != "all":
                results = [addon for addon in results if addon.get("category", "").lower() == category.lower()]
            if target and target.lower() != "all":
                results = [addon for addon in results if addon.get("associated_target", "").lower() == target.lower()]
            if search:
                query = search.lower().strip()
                results = [
                    addon for addon in results
                    if (query in addon.get("name", "").lower())
                    or (query in addon.get("description", "").lower())
                    or (query in addon.get("category", "").lower())
                ]
            return results

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
        """SQLAlchemy 2.0 query for map realms."""
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
        """SQLAlchemy 2.0 query for map detail with tiles and objectives."""
        try:
            target = map_id.lower().replace("_", "").replace("-", "").strip()
            stmt = select(MapRealm).options(
                joinedload(MapRealm.tiles),
                joinedload(MapRealm.objectives)
            )
            maps = db.session.scalars(stmt).unique().all()
            for m in maps:
                m_clean = m.map_id.lower().replace("_", "").replace("-", "").strip()
                if m.map_id.lower() == map_id.lower() or m.name.lower() == map_id.lower() or target in m_clean:
                    res = m.to_dict()
                    res["seed_variant"] = seed or "seed_a"
                    res["floor"] = floor or 1
                    return res
        except Exception:
            pass
        return None
