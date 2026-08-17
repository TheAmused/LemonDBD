import json
import logging
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from flask import current_app
from sqlalchemy import func, select, or_, and_, case
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
            from app.services.scraper_service import CANONICAL_DLC_INFO

            if self.characters_path.exists():
                with open(self.characters_path, "r", encoding="utf-8") as f:
                    raw_chars = json.load(f)
                    for c in raw_chars:
                        existing = db.session.scalars(
                            select(Character).where(Character.name == c["name"])
                        ).first()
                        c_name_lower = c["name"].strip().lower()
                        dlc = CANONICAL_DLC_INFO.get(c_name_lower, {})
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
                                    release_number=c.get("release_number") or dlc.get("release_number"),
                                    code_prefix=c.get("code_prefix") or dlc.get("code_prefix"),
                                    chapter_name=c.get("chapter_name") or dlc.get("chapter_name"),
                                    chapter_number=c.get("chapter_number") or dlc.get("chapter_number"),
                                    dlc_type=c.get("dlc_type") or dlc.get("dlc_type"),
                                    is_licensed=c.get("is_licensed", dlc.get("is_licensed", False)),
                                    release_year=c.get("release_year") or dlc.get("release_year"),
                                    release_date=c.get("release_date") or dlc.get("release_date"),
                                    dlc_counterparts=c.get("dlc_counterparts") or dlc.get("dlc_counterparts"),
                                    lore=c.get("lore") or dlc.get("lore"),
                                )
                            )
                        else:
                            if not existing.chapter_name and dlc.get("chapter_name"):
                                existing.chapter_name = dlc.get("chapter_name")
                            if not existing.chapter_number and dlc.get("chapter_number"):
                                existing.chapter_number = dlc.get("chapter_number")
                            if not existing.dlc_type and dlc.get("dlc_type"):
                                existing.dlc_type = dlc.get("dlc_type")
                            if dlc.get("is_licensed") is not None:
                                existing.is_licensed = dlc.get("is_licensed", False)
                            if not existing.release_year and dlc.get("release_year"):
                                existing.release_year = dlc.get("release_year")
                            if not existing.release_date and dlc.get("release_date"):
                                existing.release_date = dlc.get("release_date")
                            if not existing.dlc_counterparts and dlc.get("dlc_counterparts"):
                                existing.dlc_counterparts = dlc.get("dlc_counterparts")
                            if not existing.lore and dlc.get("lore"):
                                existing.lore = dlc.get("lore")
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
                case(
                    (and_(Character.release_number.is_not(None), Character.release_number > 0), Character.release_number),
                    else_=9999
                ).asc(),
                Character.id.asc(),
                Character.name.asc()
            )

            characters = db.session.scalars(stmt).unique().all()
            if characters and len(characters) >= 20:
                return [c.to_dict() for c in characters]
        except Exception as e:
            logger.debug(f"Querying characters from DB skipped/fallback: {e}")

        # Comprehensive fallback from CANONICAL_DLC_INFO
        from app.services.scraper_service import CANONICAL_DLC_INFO
        canonical_results = []
        seen_names = set()

        # Deduplicate to canonical unique characters
        for name_key, dlc in CANONICAL_DLC_INFO.items():
            role = dlc.get("role", "Survivor")
            if category and category.lower() != "all" and role.lower() != category.lower():
                continue

            display_name = name_key.title() if not name_key.startswith("the ") else f"The {name_key[4:].title()}"
            if name_key == 'william "bill" overbeck' or name_key == "william 'bill' overbeck" or name_key == "bill overbeck":
                display_name = 'William "Bill" Overbeck'
            elif name_key == "detective tapp" or name_key == "david tapp":
                display_name = "Detective David Tapp"
            elif name_key == "ash williams" or name_key == "ashley j. williams":
                display_name = "Ashley J. Williams"
            elif name_key == "élodie rakoto" or name_key == "elodie rakoto":
                display_name = "Élodie Rakoto"
            elif name_key == "yun-jin lee" or name_key == "lee yun-jin":
                display_name = "Yun-Jin Lee"
            elif name_key == "leon s. kennedy" or name_key == "leon kennedy":
                display_name = "Leon S. Kennedy"
            elif name_key == "the onryo" or name_key == "the onryō":
                display_name = "The Onryō"

            if display_name.lower() in seen_names:
                continue
            seen_names.add(display_name.lower())

            sub_dir = "survivors" if role == "Survivor" else "killers"
            clean_fname = re.sub(r'[\s\-/\'"]+', "_", display_name).strip("_")

            canonical_results.append({
                "id": len(seen_names),
                "name": display_name,
                "role": role,
                "category": role,
                "real_name": display_name,
                "short_name": name_key.lower(),
                "wiki_slug": display_name.replace(" ", "_"),
                "portrait_url": "",
                "avatar_local_path": f"avatars/{sub_dir}/{clean_fname}.png",
                "release_number": dlc.get("release_number", 9999),
                "code_prefix": dlc.get("code_prefix"),
                "chapter_name": dlc.get("chapter_name"),
                "chapter_number": dlc.get("chapter_number"),
                "dlc_type": dlc.get("dlc_type"),
                "is_licensed": dlc.get("is_licensed", False),
                "release_year": dlc.get("release_year"),
                "release_date": dlc.get("release_date"),
                "dlc_counterparts": dlc.get("dlc_counterparts", "[]"),
                "lore": dlc.get("lore"),
            })

        canonical_results.sort(key=lambda c: (0 if c.get("release_number") and c.get("release_number") > 0 else 1, c.get("release_number", 9999), c.get("name", "")))
        return canonical_results

    @staticmethod
    def _slugify(text: str) -> str:
        if not text:
            return ""
        clean = text.lower().strip()
        clean = re.sub(r"[\s\-/]+", "_", clean)
        clean = re.sub(r"[^a-z0-9_]", "", clean)
        clean = re.sub(r"_+", "_", clean)
        return clean.strip("_")

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
                    or self._slugify(c.name) == target_slug
                    or (c.real_name and self._slugify(c.real_name) == target_slug)
                    or (c.wiki_slug and self._slugify(c.wiki_slug) == target_slug)
                    or (c.short_name and self._slugify(c.short_name) == target_slug)
                    or c_slug == target_slug
                    or c_short == target_clean
                    or (target_slug in ["yun_jin_lee", "yunjin_lee", "yun_jin"] and "yun" in c_name)
                    or (target_slug in ["david_tapp", "tapp", "detective_tapp", "detective_david_tapp"] and "tapp" in c_name)
                    or (target_slug in ["elodie_rakoto", "elodie", "élodie_rakoto"] and ("elodie" in c_name or "lodie" in c_name))
                    or (target_slug in ["bill_overbeck", "william_bill_overbeck", "bill"] and ("overbeck" in c_name or c_name == 'william "bill" overbeck'))
                    or (target_slug in ["ash_williams", "ashley_j_williams", "ash"] and ("williams" in c_name or c_name.startswith("ashley")))
                    or (target_slug in ["the_ghost_face", "ghost_face", "ghostface"] and "ghost" in c_name)
                    or (target_slug in ["the_onryo", "the_onryō", "onryo", "sadako"] and ("onry" in c_name or "sadako" in c_real))
                    or (target_slug in ["the_executioner", "pyramid_head"] and "executioner" in c_name)
                    or (target_slug in ["the_cannibal", "leatherface", "bubba_sawyer"] and "cannibal" in c_name)
                    or (target_slug in ["the_shape", "michael_myers", "myers"] and "shape" in c_name)
                    or (target_slug in ["the_pig", "amanda_young", "jigsaw"] and "pig" in c_name)
                    or (target_slug in ["the_nightmare", "freddy_krueger", "freddy"] and "nightmare" in c_name)
                    or (target_slug in ["the_cenobite", "pinhead", "elliot_spencer"] and "cenobite" in c_name)
                    or (target_slug in ["the_good_guy", "chucky", "charles_lee_ray"] and "good_guy" in self._slugify(c.name))
                    or (target_slug in ["the_mastermind", "albert_wesker", "wesker"] and "mastermind" in self._slugify(c.name))
                    or (target_slug in ["the_lich", "vecna"] and "lich" in self._slugify(c.name))
                    or (target_slug in ["the_dark_lord", "dracula"] and "dark_lord" in self._slugify(c.name))
                    or (target_slug in ["the_houndmaster", "portia_maye"] and "houndmaster" in self._slugify(c.name))
                ):
                    matched_char = c
                    break

            if not matched_char:
                # Resolve from canonical DLC metadata if not in DB table
                from app.services.scraper_service import CANONICAL_DLC_INFO
                matched_dlc_key = None
                for k in CANONICAL_DLC_INFO.keys():
                    if k == target_clean or self._slugify(k) == target_slug:
                        matched_dlc_key = k
                        break
                    if target_slug in ["claudette_morel", "claudette"] and "claudette" in k:
                        matched_dlc_key = k
                        break

                if not matched_dlc_key:
                    for k in CANONICAL_DLC_INFO.keys():
                        if target_slug in self._slugify(k) or self._slugify(k) in target_slug:
                            matched_dlc_key = k
                            break

                if matched_dlc_key:
                    dlc = CANONICAL_DLC_INFO[matched_dlc_key]
                    role = dlc.get("role", "Survivor")
                    display_name = matched_dlc_key.title() if not matched_dlc_key.startswith("the ") else f"The {matched_dlc_key[4:].title()}"
                    sub_dir = "survivors" if role == "Survivor" else "killers"
                    clean_fname = re.sub(r'[\s\-/\'"]+', "_", display_name).strip("_")

                    fallback_char = {
                        "name": display_name,
                        "role": role,
                        "category": role,
                        "real_name": display_name,
                        "short_name": matched_dlc_key,
                        "wiki_slug": display_name.replace(" ", "_"),
                        "portrait_url": "",
                        "avatar_local_path": f"avatars/{sub_dir}/{clean_fname}.png",
                        "release_number": dlc.get("release_number"),
                        "code_prefix": dlc.get("code_prefix"),
                        "chapter_name": dlc.get("chapter_name"),
                        "chapter_number": dlc.get("chapter_number"),
                        "dlc_type": dlc.get("dlc_type"),
                        "is_licensed": dlc.get("is_licensed", False),
                        "release_year": dlc.get("release_year"),
                        "release_date": dlc.get("release_date"),
                        "dlc_counterparts": dlc.get("dlc_counterparts", "[]"),
                        "lore": dlc.get("lore"),
                    }

                    # Find perks for this character
                    perks = []
                    try:
                        perk_stmt = select(Perk).where(func.lower(Perk.character_name) == display_name.lower())
                        db_perks = db.session.scalars(perk_stmt).all()
                        perks = [p.to_dict() for p in db_perks]
                    except Exception:
                        pass

                    return {
                        "character": fallback_char,
                        "perks": perks,
                        "addons": [],
                    }

                return None

            char_dict = matched_char.to_dict()
            char_role = matched_char.role

            # Teachable perks directly from ORM relationship
            perks_list = [p.to_dict() for p in matched_char.perks]

            addons_or_items: List[Dict[str, Any]] = []
            killer_power_info: Optional[Dict[str, Any]] = None

            if char_role == "Killer":
                from app.services.scraper_service import CANONICAL_KILLER_POWERS
                k_key = matched_char.name.lower().strip()
                power_data = CANONICAL_KILLER_POWERS.get(k_key)
                if not power_data:
                    for k, p in CANONICAL_KILLER_POWERS.items():
                        if k in k_key or k_key in k:
                            power_data = p
                            break

                target_names = [matched_char.name.lower(), (matched_char.real_name or "").lower()]
                if power_data:
                    killer_power_info = {
                        "name": power_data["name"],
                        "description": power_data["description"],
                        "icon_url": power_data.get("icon_url", ""),
                        "movement_speed": power_data.get("movement_speed", "4.6 m/s (115%)"),
                        "terror_radius": power_data.get("terror_radius", "32 m"),
                        "terror_radius_meters": power_data.get("terror_radius_meters", 32),
                        "height": power_data.get("height", "Tall"),
                    }
                    target_names.extend([t.lower() for t in power_data.get("targets", [])])

                target_filters = [func.lower(Addon.associated_target) == t for t in set(target_names) if t]
                if target_filters:
                    addons_stmt = select(Addon).where(or_(*target_filters))
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
                "power": killer_power_info,
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
