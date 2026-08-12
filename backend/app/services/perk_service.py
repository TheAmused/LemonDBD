from app.services.scraper_service import ScraperService, TEACHABLE_PERK_OVERRIDE
import json
import logging
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class CharacterModel(BaseModel):
    name: str = Field(..., description="Canonical title e.g. 'Meg Thomas' or 'The Wraith'")
    real_name: str = Field(..., description="Real name e.g. 'Philip Ojomo'")
    wiki_slug: Optional[str] = ""
    short_name: Optional[str] = ""
    category: str
    avatar_url: Optional[str] = ""
    avatar_local_path: Optional[str] = ""
    release_number: Optional[int] = None


class ItemModel(BaseModel):
    name: str
    category: str
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
    character: str
    character_real_name: Optional[str] = "General"
    character_avatar_path: Optional[str] = ""
    category: str
    description: str
    icon_url: str
    icon_local_path: str


KILLER_POWER_MAP = {
    "The Trapper": ["Bear Trap", "The Trapper", "Trapper", "Evan MacMillan"],
    "The Wraith": ["Wailing Bell", "The Wraith", "Wraith", "Philip Ojomo"],
    "The Hillbilly": ["Chainsaw", "The Hillbilly", "Hillbilly", "Max Thompson Jr."],
    "The Nurse": ["Spencer's Last Breath", "The Nurse", "Nurse", "Sally Smithson"],
    "The Shape": ["Evil Within", "The Shape", "Michael Myers", "Shape"],
    "The Hag": ["Blackened Catalyst", "The Hag", "Hag", "Lisa Sherwood"],
    "The Doctor": ["Carter's Spark", "The Doctor", "Doctor", "Herman Carter"],
    "The Huntress": ["Hunting Hatchets", "The Huntress", "Huntress", "Anna"],
    "The Cannibal": ["Bubba's Chainsaw", "The Cannibal", "Leatherface", "Bubba Sawyer"],
    "The Nightmare": ["Dream Demon", "The Nightmare", "Freddy Krueger", "Freddy"],
    "The Pig": ["Jigsaw's Baptism", "The Pig", "Pig", "Amanda Young"],
    "The Clown": ["Afterpiece Tonic", "T.K. Soda", "The Clown", "Clown", "Kenneth Chase"],
    "The Spirit": ["Yamaoka's Haunting", "The Spirit", "Spirit", "Rin Yamaoka"],
    "The Legion": ["Feral Frenzy", "The Legion", "Legion", "Frank, Julie, Susie, Joey"],
    "The Plague": ["Vile Purge", "The Plague", "Plague", "Adiris"],
    "The Ghost Face": ["Night Shroud", "The Ghost Face", "Ghost Face", "Danny Johnson"],
    "The Demogorgon": ["Of the Abyss", "The Demogorgon", "Demogorgon"],
    "The Deathslinger": ["The Redeemer", "The Deathslinger", "Deathslinger", "Caleb Quinn"],
    "The Executioner": ["Rites of Judgement", "Summoning of Torment", "The Executioner", "Pyramid Head"],
    "The Oni": ["Yamaoka's Wrath", "The Oni", "Oni", "Kazan Yamaoka"],
    "The Blight": ["Blighted Corruption", "The Blight", "Blight", "Talbot Grimes"],
    "The Twins": ["Blood Bond", "The Twins", "Twins", "Charlotte & Victor Deshayes"],
    "The Trickster": ["Show-Stopper", "The Trickster", "Trickster", "Ji-Woon Hak"],
    "The Nemesis": ["T-Virus", "The Nemesis", "Nemesis"],
    "The Cenobite": ["Lament Configuration", "The Cenobite", "Pinhead", "Elliot Spencer"],
    "The Artist": ["Birds of Torment", "The Artist", "Artist", "Carmina Mora"],
    "The Onryō": ["Deluge of Fear", "The Onryō", "The Onryo", "Sadako", "Sadako Yamamura"],
    "The Dredge": ["Reign of Darkness", "Nightfall", "The Dredge", "Dredge"],
    "The Mastermind": ["Virulent Bound", "The Mastermind", "Wesker", "Albert Wesker"],
    "The Knight": ["Guardia Compagnia", "The Knight", "Knight", "Tarhos Kovács"],
    "The Skull Merchant": ["Eyes in the Sky", "The Skull Merchant", "Skull Merchant", "Adriana Imai"],
    "The Singularity": ["Quantum Instantiation", "The Singularity", "Singularity", "HUX-A7-13"],
    "The Xenomorph": ["Hidden Pursuit", "The Xenomorph", "Xenomorph"],
    "The Good Guy": ["Playtime's Over", "The Good Guy", "Chucky", "Charles Lee Ray"],
    "The Unknown": ["UVX", "UEX", "The Unknown", "Unknown"],
    "The Lich": ["Spell", "Spells", "The Lich", "Vecna"],
    "The Dark Lord": ["Dominion", "The Dark Lord", "Dracula"],
    "The Animatronic": ["Help Wanted", "Phantom Fear", "Haywire", "The Animatronic", "Animatronic", "Springtrap"],
}

HEADER_EXCLUSIONS = {
    "uncommon items", "rare items", "very rare items", "ultra rare items",
    "common items", "event items", "unused item", "limited items",
    "survivor items", "killer items", "items", "add-ons", "addons", "equipment"
}


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

        self._cache: List[PerkModel] = []
        self._characters_cache: List[CharacterModel] = []
        self._items_cache: List[ItemModel] = []
        self._addons_cache: List[AddonModel] = []
        self._maps_cache: List[MapModel] = []
        self.reload_data()

    @staticmethod
    def _sanitize_name(name: str) -> str:
        clean_str = name.lower().strip()
        clean_str = re.sub(r"[\s\-/]+", "_", clean_str)
        clean_str = re.sub(r'[\\/*?:"<>|]', "", clean_str)
        clean_str = re.sub(r"_+", "_", clean_str)
        return clean_str.strip("_")

    def reload_data(self) -> None:
        if self.characters_path.exists():
            try:
                with open(self.characters_path, "r", encoding="utf-8") as f:
                    c_raw = json.load(f)
                    self._characters_cache = [CharacterModel(**c) for c in c_raw]
                logger.info(f"Loaded {len(self._characters_cache)} character records.")
            except Exception as e:
                logger.error(f"Failed loading characters JSON: {e}")
                self._characters_cache = []

        char_avatar_lookup = {c.name.lower(): c.avatar_local_path for c in self._characters_cache if c.avatar_local_path}

        if self.items_path.exists():
            try:
                with open(self.items_path, "r", encoding="utf-8") as f:
                    raw_items = json.load(f)
                    parsed_items = []
                    for item in raw_items:
                        item_obj = ItemModel(**item)
                        if item_obj.description:
                            item_obj.description = ScraperService.clean_description_text(item_obj.description)
                        parsed_items.append(item_obj)
                    self._items_cache = parsed_items
                logger.info(f"Loaded {len(self._items_cache)} items.")
            except Exception as e:
                logger.error(f"Failed loading items JSON: {e}")
                self._items_cache = []
        else:
            self._items_cache = []

        if self.addons_path.exists():
            try:
                with open(self.addons_path, "r", encoding="utf-8") as f:
                    raw_addons = json.load(f)
                    parsed_addons = []
                    for addon in raw_addons:
                        addon_obj = AddonModel(**addon)
                        if addon_obj.description:
                            addon_obj.description = ScraperService.clean_description_text(addon_obj.description)
                        parsed_addons.append(addon_obj)
                    self._addons_cache = parsed_addons
                logger.info(f"Loaded {len(self._addons_cache)} addons.")
            except Exception as e:
                logger.error(f"Failed loading addons JSON: {e}")
                self._addons_cache = []
        else:
            self._addons_cache = []

        if self.maps_path.exists():
            try:
                with open(self.maps_path, "r", encoding="utf-8") as f:
                    raw_maps = json.load(f)
                    self._maps_cache = [MapModel(**m) for m in raw_maps]
                logger.info(f"Loaded {len(self._maps_cache)} maps.")
            except Exception as e:
                logger.error(f"Failed loading maps JSON: {e}")
                self._maps_cache = []
        else:
            self._maps_cache = []

        if self.data_path.exists():
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    parsed_perks = []
                    for item in raw_data:
                        perk = PerkModel(**item)
                        if perk.description:
                            perk.description = ScraperService.clean_description_text(perk.description)

                        # Auto-link missing teachable perk character assignments
                        override_char = TEACHABLE_PERK_OVERRIDE.get(perk.name.lower())
                        if override_char:
                            perk.character = override_char
                            perk.character_real_name = override_char
                            matched_avatar = char_avatar_lookup.get(override_char.lower())
                            if matched_avatar:
                                perk.character_avatar_path = matched_avatar
                            else:
                                sub_dir = "survivors" if perk.category == "Survivor" else "killers"
                                sanitized = self._sanitize_name(override_char)
                                perk.character_avatar_path = f"avatars/{sub_dir}/{sanitized}.png"
                        elif not perk.character_avatar_path and perk.character and perk.character != "General":
                            matched_avatar = char_avatar_lookup.get(perk.character.lower())
                            if matched_avatar:
                                perk.character_avatar_path = matched_avatar
                            else:
                                sub_dir = "survivors" if perk.category == "Survivor" else "killers"
                                sanitized = self._sanitize_name(perk.character)
                                perk.character_avatar_path = f"avatars/{sub_dir}/{sanitized}.png"

                        parsed_perks.append(perk)

                    self._cache = parsed_perks
                logger.info(f"Loaded {len(self._cache)} validated perks into memory.")
            except Exception as e:
                logger.error(f"Failed loading perks JSON dataset: {e}")
                self._cache = []

    @staticmethod
    def _slugify(text: str) -> str:
        return re.sub(r"[\s\-/]+", "_", text.lower().strip())

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
        results = self._cache

        if category and category.lower() != "all":
            results = [p for p in results if p.category.lower() == category.lower()]

        if character and character.lower() != "all":
            results = [p for p in results if p.character.lower() == character.lower()]

        if search:
            query = search.lower().strip()
            results = [
                p for p in results
                if query in p.name.lower()
                or query in p.description.lower()
                or query in p.character.lower()
                or (p.character_real_name and query in p.character_real_name.lower())
            ]

        valid_sort_field = sort_by.lower() if sort_by.lower() in self.ALLOWED_SORT_FIELDS else "name"
        reverse = (order.lower() == "desc")

        results = sorted(
            results,
            key=lambda x: getattr(x, valid_sort_field).lower(),
            reverse=reverse,
        )

        total_count = len(results)
        page = max(1, page)
        limit = max(1, min(limit, 10000))
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_data = [p.model_dump() for p in results[start_idx:end_idx]]

        return {
            "data": paginated_data,
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
        target = identifier.lower().strip()
        for perk in self._cache:
            if perk.name.lower().strip() == target or self._slugify(perk.name) == target:
                return perk.model_dump()
        return None

    def get_characters(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        results = self._characters_cache
        if not results and self._cache:
            char_map: Dict[str, Dict[str, Any]] = {}
            for perk in self._cache:
                if perk.character and perk.character.lower() not in ["none", "all", "general"]:
                    key = perk.character.lower().strip()
                    if key not in char_map:
                        char_map[key] = {
                            "name": perk.character,
                            "real_name": perk.character_real_name or perk.character,
                            "short_name": perk.character.lower().strip(),
                            "wiki_slug": self._slugify(perk.character),
                            "category": perk.category,
                            "avatar_url": "",
                            "avatar_local_path": perk.character_avatar_path or "",
                        }
            results = [CharacterModel(**c) for c in char_map.values()]

        results = [c for c in results if "overall_average" not in c.name.lower() and "overall average" not in c.name.lower()]

        if category and category.lower() != "all":
            results = [c for c in results if c.category.lower() == category.lower()]

        def sort_key(c: CharacterModel):
            if c.release_number is None:
                return (1, 0, c.name)
            return (0, c.release_number, c.name)

        return [c.model_dump() for c in sorted(results, key=sort_key)]

    def get_items(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        results = [
            item for item in self._items_cache
            if item.name.lower().strip() not in HEADER_EXCLUSIONS and not item.name.lower().strip().endswith(" items")
        ]

        if category and category.lower() != "all":
            results = [item for item in results if item.category and item.category.lower() == category.lower()]

        if search:
            query = search.lower().strip()
            results = [
                item for item in results
                if (item.name and query in item.name.lower())
                or (item.description and query in item.description.lower())
                or (item.category and query in item.category.lower())
                or (item.role and query in item.role.lower())
            ]

        return [item.model_dump() for item in results]

    def get_addons(
        self,
        category: Optional[str] = None,
        target: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        results = self._addons_cache

        if category and category.lower() != "all":
            results = [addon for addon in results if addon.category and addon.category.lower() == category.lower()]

        if target and target.lower() != "all":
            results = [
                addon for addon in results
                if addon.associated_target and addon.associated_target.lower() == target.lower()
            ]

        if search:
            query = search.lower().strip()
            results = [
                addon for addon in results
                if (addon.name and query in addon.name.lower())
                or (addon.description and query in addon.description.lower())
                or (addon.category and query in addon.category.lower())
                or (addon.associated_target and query in addon.associated_target.lower())
            ]

        return [addon.model_dump() for addon in results]


    def get_character_detail(self, character_name: str) -> Optional[Dict[str, Any]]:
        target_clean = character_name.strip().lower()
        target_slug = self._slugify(character_name)

        all_chars = self.get_characters()
        matched_char = None
        for c in all_chars:
            c_name = c.get("name", "").lower()
            c_real = c.get("real_name", "").lower()
            c_slug = c.get("wiki_slug", "").lower()
            c_short = c.get("short_name", "").lower()

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

        char_canonical_name = matched_char["name"]
        char_category = matched_char.get("category", "Survivor")

        import unicodedata
        alias_tokens = set([
            char_canonical_name.lower(),
            target_clean,
            matched_char.get("short_name", "").lower(),
            matched_char.get("real_name", "").lower(),
            matched_char.get("wiki_slug", "").lower(),
        ])
        norm_canon = unicodedata.normalize('NFKD', char_canonical_name.lower()).encode('ASCII', 'ignore').decode('utf-8')
        alias_tokens.add(norm_canon)
        
        if char_canonical_name in KILLER_POWER_MAP:
            for p_alias in KILLER_POWER_MAP[char_canonical_name]:
                alias_tokens.add(p_alias.lower())
        if char_canonical_name in ["Aestri Yazar", "Baermar Uraz"]:
            alias_tokens.update(["aestri yazar & baermar uraz", "aestri yazar", "baermar uraz", "aestri", "baermar", "bard", "the troupe"])
        alias_tokens.discard("")

        matched_perks = []
        for p in self._cache:
            p_char = (p.character or "").lower().strip()
            p_real = (p.character_real_name or "").lower().strip()
            if p_char in alias_tokens or p_real in alias_tokens:
                matched_perks.append(p.model_dump())

        matched_addons = []
        if char_category == "Killer":
            matched_addons = [
                a.model_dump()
                for a in self._addons_cache
                if a.associated_target and a.associated_target.lower() in alias_tokens
            ]

        matched_items = []
        if char_category == "Survivor":
            matched_items = [
                item.model_dump()
                for item in self._items_cache
                if item.name.lower().strip() not in HEADER_EXCLUSIONS and not item.name.lower().strip().endswith(" items")
            ]

        return {
            "character": matched_char,
            "perks": matched_perks,
            "addons": matched_addons if char_category == "Killer" else matched_items,
        }

    def get_maps(
        self, realm: Optional[str] = None, search: Optional[str] = None, source: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        maps = self._maps_cache
        if source and source.lower() != "all":
            src_clean = source.lower().strip()
            maps = [m for m in maps if (m.source or "").lower().strip() == src_clean]
        if realm and realm.lower() != "all":
            realm_clean = realm.lower().strip()
            maps = [m for m in maps if m.realm.lower().strip() == realm_clean or m.realm_id.lower().strip() == realm_clean]
        if search:
            q = search.lower().strip()
            maps = [m for m in maps if q in m.name.lower() or q in m.realm.lower()]
        return [m.model_dump() for m in maps]

    def get_map_detail(
        self, map_id: str, seed: Optional[str] = None, floor: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        target_clean = map_id.lower().replace("_", "").replace("-", "").replace("s", "").replace("hens", "").replace("samoel", "").strip()
        found_map = None
        for m in self._maps_cache:
            m_clean = m.id.lower().replace("_", "").replace("-", "").replace("s", "").replace("hens", "").replace("samoel", "").strip()
            name_clean = m.name.lower().replace("_", "").replace("-", "").replace("s", "").strip()
            if m.id.lower() == map_id.lower() or m.name.lower() == map_id.lower() or m_clean == target_clean or name_clean == target_clean or target_clean in m_clean or m_clean in target_clean:
                found_map = m
                break
        if not found_map:
            return None

        result = found_map.model_dump()
        result["seed_variant"] = seed or result.get("seed_variant") or "seed_a"
        result["floor"] = floor if floor is not None else result.get("floor") or 1
        if "tiles" not in result or not result["tiles"]:
            result["tiles"] = [
                {"name": "Killer Shack", "type": "shack", "position": {"x": 50, "y": 90}},
                {"name": "Main Building", "type": "main", "position": {"x": 50, "y": 10}},
                {"name": "Jungle Gym A", "type": "gym", "position": {"x": 20, "y": 50}},
                {"name": "TL Wall B", "type": "tl_wall", "position": {"x": 80, "y": 50}},
            ]
        if "objectives" not in result or not result["objectives"]:
            result["objectives"] = [
                {"type": "generator", "count": 7},
                {"type": "exit_gate", "count": 2},
                {"type": "hatch", "count": 1},
            ]
        if "totems" not in result or not result["totems"]:
            result["totems"] = [
                {"type": "dull", "position": "Shack Back Wall"},
                {"type": "dull", "position": "Main Building Basement"},
                {"type": "dull", "position": "Jungle Gym Pallet"},
                {"type": "dull", "position": "TL Wall Corner"},
                {"type": "hex", "position": "Hill Bush"},
            ]
        return result
