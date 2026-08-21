# backend/app/services/translations/translation_service.py
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy import select
from app.core.extensions import db
from app.models.character import Character
from app.models.equipment import Addon, Item
from app.models.perk import Perk
from app.scrapers.utils import normalize_name_key

logger = logging.getLogger(__name__)

SUPPORTED_LOCALES = ["en", "pl", "de", "es", "ja"]


def simplify_lookup_key(s: str) -> str:
    """Aggressively normalizes entity names to handle localized punctuation, spelling variants, and DLC suffixes."""
    if not s:
        return ""
    s = s.lower().replace("\xa0", " ")
    s = re.sub(r"\(the [^)]+\)", "", s)
    s = re.sub(r"\([^)]+\)", "", s)
    s = s.replace("sulphuric", "sulfuric")
    s = s.replace("pinkie", "pinky")
    s = s.replace("jewellery", "jewelry")
    s = s.replace("blonde", "blond")
    s = s.replace("chains", "chain")
    s = s.replace("colour", "color")
    s = s.replace("grey", "gray")
    s = s.replace("chilli", "chili")
    s = s.replace("carburettor", "carburetor")
    s = s.replace("mouldy", "moldy")
    s = s.replace("randomised", "randomized")
    s = s.replace("moulted", "molded")
    s = s.replace("moulded", "molded")
    s = s.replace("fibres", "fibers")
    s = s.replace("judgement", "judgment")
    s = s.replace("vermilion", "vermillion")
    s = s.replace("theatre", "theater")
    s = s.replace("sceptre", "scepter")
    s = s.replace("traveller", "traveler")
    s = s.replace("haematite", "hematite")
    s = s.replace("rules set", "rule set")
    s = s.replace("fastening tools", "fast tools")
    s = s.replace("makeup", "make up")
    s = s.replace("make-up", "make up")
    return re.sub(r"[^a-z0-9]", "", s)


class TranslationService:
    """
    High-performance translation service that synchronizes official Dead by Daylight
    multi-language translations (EN, PL, DE, ES, JA) from squashed, stripped JSON files
    into PostgreSQL JSONB columns.
    """

    def __init__(self, translations_dir: Optional[Path] = None):
        if translations_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
            candidates = [
                base_dir / "translations",
                base_dir / "app" / "translations",
                Path("/app/app/translations"),
                Path("/app/translations"),
                base_dir.parent / "translations",
            ]
            for cand in candidates:
                if cand.exists() and (cand / "translations.json").exists():
                    translations_dir = cand
                    break

            if translations_dir is None:
                translations_dir = candidates[0]

        self.translations_dir = Path(translations_dir)
        self.translations_file = self.translations_dir / "translations.json"

    def load_squashed_translations(self) -> Dict[str, Any]:
        """Load the squashed translations JSON bundle."""
        if not self.translations_file.exists():
            # Try alternate candidate paths
            for alt in [
                Path("app/translations/translations.json"),
                Path("/app/app/translations/translations.json"),
                Path("/app/translations/translations.json"),
                Path("backend/app/translations/translations.json"),
            ]:
                if alt.exists():
                    self.translations_file = alt
                    break

        if not self.translations_file.exists():
            logger.error(f"translations.json not found at {self.translations_file}")
            return {}

        with open(self.translations_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def sync_all_locales_to_db(
        self, locales: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Synchronizes all entity translations (Characters, Perks, Items, Addons)
        from squashed translations bundle directly into PostgreSQL.
        """
        data = self.load_squashed_translations()
        if not data:
            logger.warning("No squashed translations found to sync")
            return {"error": "translations.json not found", "updated": 0}

        target_locales = locales or SUPPORTED_LOCALES

        db_characters = db.session.scalars(select(Character)).all()
        db_perks = db.session.scalars(select(Perk)).all()
        db_items = db.session.scalars(select(Item)).all()
        db_addons = db.session.scalars(select(Addon)).all()

        chars_data = data.get("characters", {})
        perks_data = data.get("perks", {})
        items_data = data.get("items", {})
        addons_data = data.get("addons", {})

        # 1. Sync Characters
        char_name_map = {simplify_lookup_key(c.name): c for c in db_characters}
        char_prefix_map = {c.code_prefix.upper(): c for c in db_characters if c.code_prefix}

        chapters_data = data.get("chapters", {})

        for c_key, c_val in chars_data.items():
            trans = c_val.get("translations", {})
            # Prioritize canonical name matching to prevent S18/S19 Stranger Things inversion
            matched = (
                char_name_map.get(simplify_lookup_key(c_val.get("name", "")))
                or char_name_map.get(simplify_lookup_key(c_key))
                or char_prefix_map.get(c_key.upper())
            )
            if matched and trans:
                curr = dict(matched.translations or {})
                raw_chapter = matched.chapter_name or "Base Game"
                for l in target_locales:
                    if l in trans:
                        t_item = dict(trans[l])
                        loc_ch = raw_chapter
                        raw_low = raw_chapter.strip().lower()
                        for ch_pattern, ch_locs in chapters_data.items():
                            pat_low = ch_pattern.strip().lower()
                            if pat_low == raw_low or pat_low in raw_low or raw_low in pat_low:
                                loc_ch = ch_locs.get(l, ch_locs.get("en", raw_chapter))
                                break
                        t_item["chapter_name"] = loc_ch
                        curr[l] = t_item
                matched.translations = curr

        # 2. Sync Perks
        perk_map = {simplify_lookup_key(p.name): p for p in db_perks}
        for p_name, p_val in perks_data.items():
            trans = p_val.get("translations", {})
            matched = perk_map.get(simplify_lookup_key(p_name))
            if matched and trans:
                curr = dict(matched.translations or {})
                for l in target_locales:
                    if l in trans:
                        curr[l] = trans[l]
                matched.translations = curr

        # 3. Sync Items
        item_map = {simplify_lookup_key(i.name): i for i in db_items}
        for i_name, i_val in items_data.items():
            trans = i_val.get("translations", {})
            matched = item_map.get(simplify_lookup_key(i_name))
            if not matched:
                matched = Item(
                    name=i_val.get("name", i_name),
                    category=i_val.get("category", "Item"),
                    role=i_val.get("role", "Survivor"),
                    description=i_val.get("translations", {}).get("en", {}).get("description", ""),
                    translations=i_val.get("translations", {}),
                )
                db.session.add(matched)
                item_map[simplify_lookup_key(i_name)] = matched
            elif trans:
                curr = dict(matched.translations or {})
                for l in target_locales:
                    if l in trans:
                        curr[l] = trans[l]
                matched.translations = curr

        # 4. Sync Addons
        addon_map = {simplify_lookup_key(a.name): a for a in db_addons}
        for a_name, a_val in addons_data.items():
            trans = a_val.get("translations", {})
            matched = addon_map.get(simplify_lookup_key(a_name))
            if not matched:
                matched = Addon(
                    name=a_val.get("name", a_name),
                    associated_target=a_val.get("associated_target", ""),
                    category=a_val.get("category", "Killer"),
                    description=a_val.get("translations", {}).get("en", {}).get("description", ""),
                    translations=a_val.get("translations", {}),
                )
                db.session.add(matched)
                addon_map[simplify_lookup_key(a_name)] = matched
            elif trans:
                curr = dict(matched.translations or {})
                for l in target_locales:
                    if l in trans:
                        curr[l] = trans[l]
                matched.translations = curr

        # 5. Sync Offerings
        from app.models.equipment import Offering
        db_offerings = db.session.scalars(select(Offering)).all()
        offering_map = {simplify_lookup_key(o.name): o for o in db_offerings}
        offerings_data = data.get("offerings", {})
        for o_name, o_val in offerings_data.items():
            matched = offering_map.get(simplify_lookup_key(o_name))
            if not matched:
                matched = Offering(
                    name=o_val.get("name", o_name),
                    category=o_val.get("category", "Offering"),
                    role=o_val.get("role", "All"),
                    description=o_val.get("translations", {}).get("en", {}).get("description", ""),
                    icon_url=o_val.get("icon_url", ""),
                    icon_local_path=o_val.get("icon_local_path", ""),
                    rarity=o_val.get("rarity", "Common"),
                    translations=o_val.get("translations", {}),
                )
                db.session.add(matched)
                offering_map[simplify_lookup_key(o_name)] = matched
            else:
                if o_val.get("icon_local_path"):
                    matched.icon_local_path = o_val.get("icon_local_path")
                if o_val.get("icon_url"):
                    matched.icon_url = o_val.get("icon_url")
                if o_val.get("rarity"):
                    matched.rarity = o_val.get("rarity")
                trans = o_val.get("translations", {})
                if trans:
                    curr = dict(matched.translations or {})
                    for l in target_locales:
                        if l in trans:
                            curr[l] = trans[l]
                    matched.translations = curr

        db.session.commit()

        stats = {
            "characters_updated": len(db_characters),
            "perks_updated": len(db_perks),
            "items_updated": len(db_items),
            "addons_updated": len(db_addons),
            "offerings_updated": len(db_offerings),
            "locales_processed": target_locales,
        }
        logger.info(f"Successfully synced squashed translations: {stats}")
        return stats

    def export_squashed_json(self, target_path: Optional[Path] = None) -> Path:
        """Exports currently loaded DB translations to squashed JSON."""
        out_file = target_path or self.translations_file
        db_characters = db.session.scalars(select(Character)).all()
        db_perks = db.session.scalars(select(Perk)).all()
        db_items = db.session.scalars(select(Item)).all()
        db_addons = db.session.scalars(select(Addon)).all()

        squashed_data = {
            "version": "2.0",
            "supported_locales": SUPPORTED_LOCALES,
            "characters": {},
            "perks": {},
            "items": {},
            "addons": {},
        }

        for c in db_characters:
            key = (c.code_prefix or c.name).strip()
            squashed_data["characters"][key] = {
                "name": c.name,
                "code_prefix": c.code_prefix or "",
                "wiki_slug": c.wiki_slug or "",
                "short_name": c.short_name or "",
                "translations": c.translations or {},
            }

        for p in db_perks:
            squashed_data["perks"][p.name.strip()] = {
                "name": p.name,
                "character_id": p.character_id,
                "category": p.category,
                "translations": p.translations or {},
            }

        for i in db_items:
            squashed_data["items"][i.name.strip()] = {
                "name": i.name,
                "category": i.category,
                "role": i.role,
                "translations": i.translations or {},
            }

        for a in db_addons:
            squashed_data["addons"][a.name.strip()] = {
                "name": a.name,
                "associated_target": a.associated_target or "",
                "category": a.category or "",
                "translations": a.translations or {},
            }

        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(squashed_data, f, ensure_ascii=False, indent=2)

        return out_file
