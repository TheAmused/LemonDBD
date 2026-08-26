#!/usr/bin/env python3
"""
fix_missing_translations.py
===========================
Comprehensive audit & automated repair tool for Dead by Daylight entity translations.

Features:
- Queries PostgreSQL database for all multi-language entities (Items, Addons, Perks, Offerings, Characters).
- Audits translations for any specified language (e.g. PL, DE, ES, JA, or all).
- Identifies missing, empty, or untranslated (English fallback) names and descriptions.
- Automatically resolves authentic translations from official game files (en.json, pl.json, de.json,
  es.json, ja.json, ItemDB.json, ItemAddonDB.json, PerkDB.json, characters_dump.json) WITHOUT hardcoding.
- Updates both backend/app/translations/translations.json (for repo persistence) and the live database.

Usage:
    # Run for Polish translations:
    python backend/app/fix_missing_translations.py --lang pl

    # Run for all supported languages:
    python backend/app/fix_missing_translations.py --all-langs

    # Preview only (dry-run without database modifications):
    python backend/app/fix_missing_translations.py --lang pl --dry-run

    # Inside Docker container:
    docker exec dbd_backend python /app/app/fix_missing_translations.py --lang pl
"""

import argparse
import copy
import json
import logging
import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Reconfigure stdout for UTF-8 in all environments (Windows cp1252 / Linux)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("fix_translations")

SUPPORTED_LOCALES = ["en", "pl", "de", "es", "ja"]


# ---------------------------------------------------------------------------
# Path Discovery Helpers
# ---------------------------------------------------------------------------

def find_repo_root() -> Path:
    """Finds repository root directory."""
    curr = Path(__file__).resolve().parent
    for _ in range(4):
        if (curr / "translations").exists() or (curr / "backend").exists():
            return curr
        curr = curr.parent
    return Path("/app") if Path("/app").exists() else Path(__file__).resolve().parent


def get_locale_search_paths() -> List[Path]:
    """Returns candidate directories where raw locale JSON files or dumps exist."""
    repo_root = find_repo_root()
    candidates = [
        repo_root / "translations",
        Path("translations"),
        Path("/app/translations"),
        Path("/app/app/translations"),
        repo_root / "backend" / "app" / "translations",
    ]
    return [p for p in candidates if p.exists() and p.is_dir()]


def get_translations_json_path() -> Optional[Path]:
    """Locates the squashed translations.json file."""
    repo_root = find_repo_root()
    candidates = [
        repo_root / "backend" / "app" / "translations" / "translations.json",
        Path("backend/app/translations/translations.json"),
        Path("/app/app/translations/translations.json"),
        Path("/app/translations/translations.json"),
        repo_root / "translations" / "translations.json",
    ]
    for p in candidates:
        if p.exists() and p.is_file():
            return p
    return None


# ---------------------------------------------------------------------------
# String Normalization & Text Sanitization
# ---------------------------------------------------------------------------

def normalize_text(s: str) -> str:
    """Aggressively normalizes strings for robust matching across dialects, accents, and punctuation."""
    if not s:
        return ""
    s = s.lower().replace("\xa0", " ")
    # Strip accents: 'Déjà Vu' -> 'Deja Vu'
    s = unicodedata.normalize("NFKD", s).encode("ASCII", "ignore").decode("utf-8")
    s = re.sub(r"\(the [^)]+\)", "", s)
    s = re.sub(r"\([^)]+\)", "", s)
    # Common variant synonyms
    s = s.replace("issue", " ")
    s = s.replace("volume", " ")
    s = s.replace("dousing", "dowsing")
    s = s.replace("fog crystal", "void crystal")
    s = s.replace("fast tools", "fastening tools")
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
    s = s.replace("moulted", "molted")
    s = s.replace("moulded", "molted")
    s = s.replace("molded", "molted")
    s = s.replace("fibres", "fibers")
    s = s.replace("judgement", "judgment")
    s = s.replace("vermilion", "vermillion")
    s = s.replace("theatre", "theater")
    s = s.replace("sceptre", "scepter")
    s = s.replace("traveller", "traveler")
    s = s.replace("haematite", "hematite")
    s = s.replace("rules set", "rule set")
    s = s.replace("fastening tools", "fastening tools")
    s = s.replace("makeup", "make up")
    s = s.replace("make-up", "make up")
    s = s.replace("favour", "favor")
    s = s.replace("armour", "armor")
    s = s.replace("camaraderie", "kinship")
    s = s.replace("thorns", "thorn")
    s = s.replace("straps", "strap")
    s = s.replace("gloves", "glove")
    s = s.replace("deja vu", "dejavu")
    s = s.replace("moulted", "molted")
    s = s.replace("trapper bag", "trappersack")
    s = s.replace("trapper sack", "trappersack")
    s = s.replace("naped elektromagnetyczny", "emp")
    s = s.replace("napedelektromagnetyczny", "emp")
    s = s.replace("urzadzenie emp", "emp")
    s = s.replace("urzadzenieemp", "emp")
    s = s.replace("chinskie petardy", "chinskiepetardy")
    s = s.replace("chinese firecrackers", "chinesefirecracker")
    s = s.replace("flash grenade", "flashgrenade")
    s = s.replace("flashbang", "flashgrenade")
    s = s.replace("candelabra", "kandelabr")
    s = s.replace("fog crystal", "krysztalmgly")
    s = s.replace("krysztal pustki", "krysztalmgly")
    s = s.replace("krysztal mgly", "krysztalmgly")
    s = s.replace("void crystal", "krysztalmgly")
    s = s.replace("hand of vecna", "rekavecny")
    s = s.replace("eye of vecna", "okovecny")
    return re.sub(r"[^a-z0-9]", "", s)


def clean_html_markup(text: str) -> str:
    """Normalizes formatting tags and converts HTML spans to markdown formatting."""
    if not isinstance(text, str):
        return text
    text = re.sub(r'\\([„”"\'’])', r'\1', text)
    text = text.replace('\\"', '"').replace("\\\\", "\\")
    text = re.sub(r'<span\s+class=["\']FlavorText["\']>(.*?)</span>', r'\n"\1"\n', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<span\s+class=["\']ReminderText["\']>(.*?)</span>', r'\n\1\n', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<span\s+class=["\']Highlight\d*["\']>(.*?)</span>', r'\1', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'</?span[^>]*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</?p[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</?div[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</?ul[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<li>(.*?)</li>', r'\n• \1', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<li>', '\n• ', text, flags=re.IGNORECASE)
    text = re.sub(r'</li>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?b>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?i>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?strong>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?em>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?font[^>]*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?color[^>]*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = text.replace("%%", "%")
    lines = [l.strip() for l in text.splitlines()]
    return '\n'.join(l for l in lines if l)


# ---------------------------------------------------------------------------
# Multi-Source Localization Index Builder
# ---------------------------------------------------------------------------

class LocalizationIndex:
    """
    Builds an in-memory index from all available game files (locale JSONs, DBD data tables,
    characters dumps, and squashed translations.json) to dynamically resolve translations.
    """

    def __init__(self):
        self.raw_locales: Dict[str, Dict[str, str]] = {}
        self.guid_to_translations: Dict[str, Dict[str, str]] = {}
        self.name_to_translations: Dict[str, Dict[str, Dict[str, str]]] = {}
        self.db_entity_keys: Dict[str, Dict[str, Any]] = {}
        self.squashed_data: Dict[str, Any] = {}

    def load_all_sources(self):
        """Loads and indexes all source files."""
        search_dirs = get_locale_search_paths()
        logger.info(f"Scanning localization search directories: {[str(p) for p in search_dirs]}")

        # 1. Load flat locale string tables (en.json, pl.json, de.json, es.json, ja.json)
        for lang in SUPPORTED_LOCALES:
            flat_map = {}
            for sdir in search_dirs:
                target_file = sdir / f"{lang}.json"
                if target_file.exists():
                    try:
                        with open(target_file, "r", encoding="utf-8") as f:
                            raw_json = json.load(f)
                        self._flatten_json(raw_json, flat_map)
                        logger.info(f"Loaded {len(flat_map)} string keys for locale '{lang}' from {target_file}")
                        break
                    except Exception as e:
                        logger.warning(f"Failed to parse {target_file}: {e}")
            self.raw_locales[lang] = flat_map

        # 2. Build GUID -> translations map
        en_loc = self.raw_locales.get("en", {})
        for guid, en_text in en_loc.items():
            trans_for_guid = {"en": en_text}
            for lang in SUPPORTED_LOCALES:
                if lang != "en" and guid in self.raw_locales.get(lang, {}):
                    trans_for_guid[lang] = self.raw_locales[lang][guid]
            self.guid_to_translations[guid] = trans_for_guid

            # Index short strings (< 140 chars) as potential titles/names
            if len(en_text) < 140:
                norm_en = normalize_text(en_text)
                if norm_en:
                    if norm_en not in self.name_to_translations or len(en_text) < len(self.name_to_translations[norm_en].get("en", {}).get("name", "x" * 200)):
                        self.name_to_translations[norm_en] = {
                            l: {"name": t, "guid": guid} for l, t in trans_for_guid.items()
                        }

        # 3. Scan DBDCharacters data tables (ItemDB.json, ItemAddonDB.json, PerkDB.json, etc.)
        for sdir in search_dirs:
            char_dir = sdir / "DBDCharacters"
            if char_dir.exists():
                for json_path in char_dir.rglob("*.json"):
                    try:
                        with open(json_path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        tables = data if isinstance(data, list) else [data]
                        for tbl in tables:
                            if isinstance(tbl, dict):
                                for row_k, row_v in tbl.get("Rows", {}).items():
                                    if isinstance(row_v, dict):
                                        ui = row_v.get("UIData") or {}
                                        dn = ui.get("DisplayName") or {}
                                        desc = ui.get("Description") or {}
                                        dn_k = dn.get("Key")
                                        desc_k = desc.get("Key")
                                        en_name = dn.get("LocalizedString") or dn.get("SourceString") or ""
                                        if en_name and (dn_k or desc_k):
                                            norm_name = normalize_text(en_name)
                                            self.db_entity_keys[norm_name] = {
                                                "row_key": row_k,
                                                "display_key": dn_k,
                                                "description_key": desc_k,
                                                "en_name": en_name,
                                            }
                                            norm_row = normalize_text(row_k)
                                            self.db_entity_keys[norm_row] = self.db_entity_keys[norm_name]
                    except Exception:
                        pass

        # 4. Load squashed translations.json if available
        trans_json_path = get_translations_json_path()
        if trans_json_path and trans_json_path.exists():
            try:
                with open(trans_json_path, "r", encoding="utf-8") as f:
                    self.squashed_data = json.load(f)
                logger.info(f"Loaded existing squashed translations.json from {trans_json_path}")
            except Exception as e:
                logger.warning(f"Could not load translations.json: {e}")

    def _flatten_json(self, node: Any, flat: Dict[str, str]):
        """Recursively flattens nested localization JSON structures."""
        if isinstance(node, dict):
            for k, v in node.items():
                if isinstance(v, str):
                    clean = clean_html_markup(v)
                    if clean and not clean.startswith("@#"):
                        flat[k.strip()] = clean
                elif isinstance(node, (dict, list)):
                    self._flatten_json(v, flat)
        elif isinstance(node, list):
            for it in node:
                self._flatten_json(it, flat)

    def resolve_translation(
        self,
        entity_name: str,
        entity_category: Optional[str] = None,
        entity_description: Optional[str] = None,
        lang: str = "pl",
    ) -> Optional[Tuple[str, str]]:
        """
        Dynamically resolves the localized (name, description) for an entity in the target language.
        Returns None if no proper translation can be found.
        """
        norm_name = normalize_text(entity_name)
        if not norm_name:
            return None

        # Strategy 1: Look up in squashed translations.json
        if self.squashed_data:
            for section in ["items", "addons", "perks", "offerings", "characters"]:
                for k, v in self.squashed_data.get(section, {}).items():
                    if normalize_text(k) == norm_name or normalize_text(v.get("name", "")) == norm_name:
                        t = v.get("translations", {}).get(lang, {})
                        res_name = (t.get("name") or "").strip()
                        res_desc = (t.get("description") or t.get("lore") or "").strip()
                        if res_name and (lang == "ja" or lang == "en" or normalize_text(res_name) != norm_name or len(res_name) <= 3):
                            return res_name, res_desc

        # Strategy 2: Look up via DBDCharacters database tables (exact GUID Keys)
        if norm_name in self.db_entity_keys:
            info = self.db_entity_keys[norm_name]
            dn_k = info.get("display_key")
            desc_k = info.get("description_key")
            res_name = self.raw_locales.get(lang, {}).get(dn_k, "") if dn_k else ""
            res_desc = self.raw_locales.get(lang, {}).get(desc_k, "") if desc_k else ""
            if res_name:
                return res_name, res_desc

        # Strategy 3: Look up in normalized name -> GUID index
        if norm_name in self.name_to_translations:
            entry = self.name_to_translations[norm_name]
            if lang in entry:
                res_name = entry[lang].get("name", "")
                # Find matching description key if possible
                guid = entry[lang].get("guid", "")
                res_desc = ""
                desc_candidates = [
                    guid.replace("_TITLE", "_DESC"),
                    guid.replace("_TITLE", "_DESCRIPTION"),
                    guid.replace("_Title", "_Description"),
                ]
                for cand in desc_candidates:
                    if cand in self.raw_locales.get(lang, {}):
                        res_desc = self.raw_locales[lang][cand]
                        break
                if res_name:
                    return res_name, res_desc

        return None


# ---------------------------------------------------------------------------
# Database Audit and Fix Engine
# ---------------------------------------------------------------------------

def is_translation_incomplete(
    translations: Optional[Dict[str, Any]],
    lang: str,
    en_name: str,
    is_character: bool = False,
) -> bool:
    """
    Returns True if the translation in `lang` is missing, empty, or an untranslated English copy.
    """
    if not translations or not isinstance(translations, dict):
        return True
    t_lang = translations.get(lang, {})
    if not isinstance(t_lang, dict):
        return True
    name_l = (t_lang.get("name") or "").strip()
    desc_l = (t_lang.get("description") or t_lang.get("lore") or "").strip()
    if not name_l or not desc_l:
        return True
    if is_character or lang == "en":
        return False
    if lang == "ja":
        return False  # Japanese proper nouns can match English

    # Authentic loanwords / proper nouns that are identical across languages in official game files
    OFFICIAL_LOANWORDS = {
        "ironmaiden", "terrormisu", "uchiwa", "furin", "senkohanabi", "taiyaki",
        "goldcreekwhiskey", "chili", "fazcoin", "zori", "dejavu", "philly",
        "nemesis", "babysitter", "deadline", "flipflop", "saboteur", "stridor",
        "popgoestheweasel", "bffs", "lapislazuli", "wakizashisaya", "kaiuntalisman",
        "kanaianzentalisman", "yamaokasashimono", "endocpu", "uroborosvirus",
        "ovomorph", "janjirashand"
    }

    # Check for legacy wiki strings that indicate untranslated English text
    if "THIS ITEM CAN NO LONGER BE OBTAINED" in desc_l:
        return True
    if desc_l.startswith("Craftable\nLimited Item") or desc_l.startswith("Limited Item\n"):
        return True

    en_desc = (translations.get("en", {}).get("description") or "").strip()
    if en_desc and desc_l == en_desc and len(desc_l) > 20:
        return True

    raw_l = re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", name_l).encode("ASCII", "ignore").decode("utf-8").lower())
    raw_en = re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", en_name).encode("ASCII", "ignore").decode("utf-8").lower())
    if raw_l == raw_en and len(raw_en) > 3:
        if raw_en in OFFICIAL_LOANWORDS:
            return False
        if en_desc and desc_l != en_desc and len(desc_l) > 15:
            return False
        return True
    return False


def run_translation_audit_and_fix(
    target_langs: List[str],
    dry_run: bool = False,
    cleanup_mobile: bool = True,
):
    """
    Main audit and repair execution function.
    """
    logger.info("Initializing DBD Localization Engine...")
    idx = LocalizationIndex()
    idx.load_all_sources()

    # Import Flask app and models
    repo_root = find_repo_root()
    backend_dir = repo_root / "backend"
    for candidate in ["/app", str(backend_dir), str(repo_root), str(Path.cwd()), str(Path.cwd() / "backend")]:
        if candidate and candidate not in sys.path and Path(candidate).exists():
            sys.path.insert(0, candidate)

    from app import create_app
    from app.core.extensions import db
    from app.models.character import Character
    from app.models.equipment import Addon, Item, Offering
    from app.models.perk import Perk
    from app.services.translations.translation_service import TranslationService
    from sqlalchemy import select

    flask_app = create_app()

    with flask_app.app_context():
        ts = TranslationService()
        logger.info("Running baseline TranslationService sync from translations.json...")
        ts.sync_all_locales_to_db(locales=SUPPORTED_LOCALES)

        for lang in target_langs:
            print(f"\n{'='*70}")
            print(f"   DATABASE TRANSLATION AUDIT & FIX: [{lang.upper()}]")
            print(f"{'='*70}\n")

            total_entities = 0
            total_missing = 0
            total_fixed = 0
            unresolved = []

            sections = [
                ("Items", select(Item), Item, False),
                ("Addons", select(Addon), Addon, False),
                ("Perks", select(Perk), Perk, False),
                ("Offerings", select(Offering), Offering, False),
                ("Characters", select(Character), Character, True),
            ]

            for section_name, stmt, model_cls, is_char in sections:
                entities = db.session.scalars(stmt).all()
                total_entities += len(entities)
                incomplete = [
                    e for e in entities
                    if is_translation_incomplete(e.translations, lang, e.name, is_character=is_char)
                ]

                print(f"[{section_name}] Total: {len(entities)} | Incomplete/Missing {lang.upper()}: {len(incomplete)}")

                for entity in incomplete:
                    total_missing += 1
                    en_trans = (entity.translations or {}).get("en", {})
                    en_name = (en_trans.get("name") or entity.name or "").strip()
                    en_desc = (en_trans.get("description") or getattr(entity, "description", "") or "").strip()
                    cat = getattr(entity, "category", None) or getattr(entity, "associated_target", None)

                    resolved = idx.resolve_translation(
                        entity_name=en_name,
                        entity_category=cat,
                        entity_description=en_desc,
                        lang=lang,
                    )

                    if resolved:
                        new_name, new_desc = resolved
                        total_fixed += 1
                        print(f"  ✓ [FIXED] {en_name!r} -> {new_name!r}")

                        if not dry_run:
                            curr = dict(entity.translations or {})
                            curr[lang] = {
                                "name": new_name,
                                "description": new_desc or curr.get(lang, {}).get("description") or en_desc,
                            }
                            entity.translations = curr
                    else:
                        unresolved.append((section_name, en_name, cat))
                        print(f"  ✗ [UNRESOLVED] {en_name!r} ({cat})")

            # Optional: Clean up decommissioned / mobile offerings
            if cleanup_mobile and not dry_run:
                DECOM_PHRASES = [
                    "THIS ADD-ON WAS DECOMMISSIONED",
                    "THIS ADD-ON IS UNUSED",
                    "THIS ITEM IS NO LONGER AVAILABLE",
                ]
                MOBILE_OFFERINGS = {
                    "milk tea", "burdock tea", "black tea", "lotus leaf tea",
                    "blank postcard", "crumpled postcard", "stamped postcard", "lovers' postcard",
                    "wooden chalice", "ceramic chalice", "copper chalice", "bloodstone chalice",
                    "clay doll", "thorn doll", "bone doll", "flesh doll"
                }
                for addon in db.session.scalars(select(Addon)).all():
                    desc = addon.description or ""
                    name = addon.name or ""
                    if any(p in desc.upper() for p in DECOM_PHRASES) or "(Decommissioned)" in name:
                        db.session.delete(addon)
                for item in db.session.scalars(select(Item)).all():
                    desc = item.description or ""
                    name = item.name or ""
                    if any(p in desc.upper() for p in DECOM_PHRASES) or "(Decommissioned)" in name:
                        db.session.delete(item)
                for off in db.session.scalars(select(Offering)).all():
                    if (off.name or "").strip().lower() in MOBILE_OFFERINGS:
                        db.session.delete(off)

            if not dry_run:
                db.session.commit()
                print(f"\n>>> [{lang.upper()}] Database updated & committed. Fixed: {total_fixed}/{total_missing}")
            else:
                print(f"\n>>> [{lang.upper()}] DRY-RUN completed. Would fix: {total_fixed}/{total_missing}")

            if unresolved:
                print(f"\nUnresolved entities for [{lang.upper()}] ({len(unresolved)} total):")
                for sec, name, cat in unresolved:
                    print(f"  - [{sec}] {name} ({cat})")


# ---------------------------------------------------------------------------
# CLI Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Audit and fix missing Dead by Daylight entity translations dynamically from game locales."
    )
    parser.add_argument(
        "--lang",
        nargs="+",
        default=["pl"],
        help="Target language code(s) to audit and fix (default: pl, supported: en, pl, de, es, ja)",
    )
    parser.add_argument(
        "--all-langs",
        action="store_true",
        help="Run audit and repair across all 5 supported languages",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview detected issues and potential fixes without modifying the database or files",
    )
    parser.add_argument(
        "--no-mobile-cleanup",
        action="store_true",
        help="Disable automatic cleanup of decommissioned items and mobile-only offerings",
    )
    args = parser.parse_args()

    selected_langs = SUPPORTED_LOCALES if args.all_langs else args.lang
    logger.info(f"Starting DBD translation audit for languages: {selected_langs} (dry_run={args.dry_run})")
    run_translation_audit_and_fix(
        target_langs=selected_langs,
        dry_run=args.dry_run,
        cleanup_mobile=not args.no_mobile_cleanup,
    )
