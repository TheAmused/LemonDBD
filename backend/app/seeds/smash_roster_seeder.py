# backend/app/seeds/smash_roster_seeder.py
import json
import logging
import os
from pathlib import Path
import uuid
from typing import Any, Dict, List, Tuple
from sqlalchemy import select
from app.core.extensions import db
from app.models.smash_or_pass import (
    Entity,
    EntityStat,
    Roster,
    SmashPassStat,
    Translation,
)

logger = logging.getLogger(__name__)

ROSTERS_DIR = Path(__file__).resolve().parent / "rosters"

# Default fallback translations for UI keys
DEFAULT_GLOBAL_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "en": {
        "smashOrPass.title": "Smash or Pass",
        "smashOrPass.subtitle": "Rate Dead by Daylight candidates, discover your Trial Romance Archetype, and vote.",
        "smashOrPass.ui.smash": "Smash",
        "smashOrPass.ui.pass": "Pass",
        "smashOrPass.ui.leaderboard": "Leaderboard",
        "smashOrPass.tiers.godTier": "God Tier",
        "smashOrPass.tiers.fatalAttraction": "Fatal Attraction",
        "smashOrPass.tiers.friendzone": "Friendzone",
        "smashOrPass.tiers.eldritchVoid": "Eldritch Void",
    },
    "pl": {
        "smashOrPass.title": "Smash or Pass",
        "smashOrPass.subtitle": "Oceń kandydatów Dead by Daylight, odkryj swój Archetyp Randkowy Próby i głosuj.",
        "smashOrPass.ui.smash": "Smash",
        "smashOrPass.ui.pass": "Pass",
        "smashOrPass.ui.leaderboard": "Tabela Wyników",
        "smashOrPass.tiers.godTier": "Boski Poziom",
        "smashOrPass.tiers.fatalAttraction": "Fatalne Zauroczenie",
        "smashOrPass.tiers.friendzone": "Strefa Przyjaźni",
        "smashOrPass.tiers.eldritchVoid": "Przedwieczna Pustka",
    },
    "es": {
        "smashOrPass.title": "Smash or Pass",
        "smashOrPass.subtitle": "Califica a los candidatos de Dead by Daylight y descubre tu Arquetipo.",
        "smashOrPass.ui.smash": "Smash",
        "smashOrPass.ui.pass": "Pass",
        "smashOrPass.ui.leaderboard": "Clasificación",
        "smashOrPass.tiers.godTier": "Nivel Dios",
        "smashOrPass.tiers.fatalAttraction": "Atracción Fatal",
        "smashOrPass.tiers.friendzone": "Zona de Amigos",
        "smashOrPass.tiers.eldritchVoid": "Vacío Primigenio",
    },
    "de": {
        "smashOrPass.title": "Smash or Pass",
        "smashOrPass.subtitle": "Bewerte Dead by Daylight Charaktere und finde deinen Romanzen-Archetyp.",
        "smashOrPass.ui.smash": "Smash",
        "smashOrPass.ui.pass": "Pass",
        "smashOrPass.ui.leaderboard": "Rangliste",
        "smashOrPass.tiers.godTier": "Götter-Stufe",
        "smashOrPass.tiers.fatalAttraction": "Fatale Anziehung",
        "smashOrPass.tiers.friendzone": "Friendzone",
        "smashOrPass.tiers.eldritchVoid": "Eldritch-Leere",
    },
    "ja": {
        "smashOrPass.title": "Smash or Pass",
        "smashOrPass.subtitle": "Dead by Daylightのキャラクターを評価し、ロマンスの原型を見つけよう。",
        "smashOrPass.ui.smash": "スマッシュ",
        "smashOrPass.ui.pass": "パス",
        "smashOrPass.ui.leaderboard": "リーダーボード",
        "smashOrPass.tiers.godTier": "神ティア",
        "smashOrPass.tiers.fatalAttraction": "致命的魅力",
        "smashOrPass.tiers.friendzone": "フレンドゾーン",
        "smashOrPass.tiers.eldritchVoid": "狂気の虚無",
    },
}


def load_rosters_from_json_files() -> Tuple[List[Dict[str, Any]], Dict[str, List[Dict[str, Any]]], Dict[str, Dict[str, str]]]:
    """
    Dynamically scans and loads all roster definitions from backend/app/seeds/rosters/*.json
    Returns (rosters_list, entities_by_roster_map, translations_map).
    """
    rosters_list: List[Dict[str, Any]] = []
    entities_by_roster: Dict[str, List[Dict[str, Any]]] = {}
    translations_map: Dict[str, Dict[str, str]] = {
        lang: dict(kvs) for lang, kvs in DEFAULT_GLOBAL_TRANSLATIONS.items()
    }

    if not ROSTERS_DIR.exists():
        logger.warning(f"Rosters directory does not exist: {ROSTERS_DIR}")
        return rosters_list, entities_by_roster, translations_map

    # Sort JSON files (canon first, then alphabetically)
    json_files = sorted(
        ROSTERS_DIR.glob("*.json"),
        key=lambda p: (0 if p.stem == "canon" else 1, p.stem),
    )

    for file_path in json_files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            r_data = data.get("roster")
            if not r_data or not r_data.get("slug"):
                continue

            slug = r_data["slug"]
            rosters_list.append(r_data)
            entities_by_roster[slug] = data.get("entities", [])

            # Merge translations
            file_translations = data.get("translations", {})
            for lang, kv_pairs in file_translations.items():
                if lang not in translations_map:
                    translations_map[lang] = {}
                translations_map[lang].update(kv_pairs)

        except Exception as e:
            logger.error(f"Error loading roster JSON file {file_path}: {e}")

    return rosters_list, entities_by_roster, translations_map


# Dynamically load data for module-level access
ROSTERS_SEED_DATA, ENTITIES_BY_ROSTER, TRANSLATIONS_DATA = load_rosters_from_json_files()


def seed_smash_rosters():
    """
    Comprehensive idempotent seeder that dynamically reads all rosters from
    backend/app/seeds/rosters/*.json and upserts rosters, characters, stats, and translations.
    """
    from flask import has_app_context
    if not has_app_context():
        from app import create_app
        app = create_app()
        with app.app_context():
            return _seed_smash_rosters_impl()
    return _seed_smash_rosters_impl()


def ensure_roster_assets(static_dir: Path | None = None) -> None:
    """Ensures roster covers and special cosmetic avatars exist in static avatars dir."""
    try:
        if static_dir is None:
            static_dir = Path(__file__).resolve().parent.parent / "static"
        from app.scrapers.roster_images import RosterImageScraperDriver
        driver = RosterImageScraperDriver(timeout=10)
        driver.sync_all_rosters(static_dir)
    except Exception as e:
        logger.debug(f"Non-critical asset sync check: {e}")


def _seed_smash_rosters_impl():
    try:
        ensure_roster_assets()
        rosters_list, entities_by_roster, translations_map = load_rosters_from_json_files()

        # 1. Seed / Upsert Rosters
        for r_data in rosters_list:
            roster = db.session.scalar(select(Roster).where(Roster.slug == r_data["slug"]))
            if not roster:
                roster = Roster(
                    id=str(uuid.uuid4()),
                    slug=r_data["slug"],
                    name_i18n_key=r_data["name_i18n_key"],
                    description_i18n_key=r_data["description_i18n_key"],
                    cover_image_url=r_data.get("cover_image_url"),
                    theme_color=r_data.get("theme_color", "#ff0055"),
                    category=r_data.get("category", "DBD"),
                    is_nsfw=r_data.get("is_nsfw", False),
                    is_active=r_data.get("is_active", True),
                )
                db.session.add(roster)
                db.session.flush()
            else:
                roster.name_i18n_key = r_data["name_i18n_key"]
                roster.description_i18n_key = r_data["description_i18n_key"]
                roster.cover_image_url = r_data.get("cover_image_url")
                roster.theme_color = r_data.get("theme_color", "#ff0055")
                roster.category = r_data.get("category", "DBD")
                roster.is_nsfw = r_data.get("is_nsfw", False)
                roster.is_active = r_data.get("is_active", True)
                db.session.flush()

            # 2. Seed / Upsert Entities for this Roster
            entities_list = entities_by_roster.get(r_data["slug"], [])
            for idx, e_data in enumerate(entities_list):
                entity = db.session.scalar(
                    select(Entity).where(
                        Entity.roster_id == roster.id,
                        Entity.slug == e_data["slug"],
                    )
                )
                if not entity:
                    entity = Entity(
                        id=str(uuid.uuid4()),
                        roster_id=roster.id,
                        slug=e_data["slug"],
                        name=e_data["name"],
                        role=e_data.get("role", "Survivor"),
                        gender=e_data.get("gender", "female"),
                        media_url=e_data.get("media_url"),
                        media_type="image",
                        metadata_json=e_data.get("metadata", {}),
                        order_index=idx,
                        is_active=True,
                    )
                    db.session.add(entity)
                    db.session.flush()
                else:
                    entity.name = e_data["name"]
                    entity.role = e_data.get("role", entity.role)
                    entity.gender = e_data.get("gender", entity.gender)
                    entity.media_url = e_data.get("media_url")
                    entity.metadata_json = e_data.get("metadata", entity.metadata_json)
                    entity.order_index = idx
                    entity.is_active = True
                    db.session.flush()

                # Ensure associated EntityStat exists
                stat = db.session.scalar(
                    select(EntityStat).where(EntityStat.entity_id == entity.id)
                )
                if not stat:
                    stat = EntityStat(
                        id=str(uuid.uuid4()),
                        entity_id=entity.id,
                        smash_count=0,
                        pass_count=0,
                        super_smash_count=0,
                        total_votes=0,
                        smash_rate=0.0,
                        chaos_rating=50.0,
                    )
                    db.session.add(stat)

                # Ensure legacy SmashPassStat exists
                leg_stat = db.session.scalar(
                    select(SmashPassStat).where(
                        SmashPassStat.character_slug == entity.slug,
                        SmashPassStat.edition == r_data["slug"],
                    )
                )
                if not leg_stat:
                    leg_stat = SmashPassStat(
                        character_slug=entity.slug,
                        character_name=entity.name,
                        role=entity.role,
                        gender=entity.gender,
                        edition=r_data["slug"],
                        smash_count=0,
                        pass_count=0,
                        super_smash_count=0,
                        total_votes=0,
                        smash_rate=0.0,
                    )
                    db.session.add(leg_stat)

        # 3. Seed / Upsert Multi-Locale Translations
        for loc, kv_map in translations_map.items():
            for key, value in kv_map.items():
                trans = db.session.scalar(
                    select(Translation).where(
                        Translation.locale == loc,
                        Translation.key == key,
                    )
                )
                if not trans:
                    trans = Translation(
                        id=str(uuid.uuid4()),
                        locale=loc,
                        key=key,
                        value=value,
                    )
                    db.session.add(trans)
                else:
                    trans.value = value

        db.session.commit()
        logger.info(f"Successfully seeded all {len(rosters_list)} rosters from JSON files into the database.")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed seeding smash rosters: {e}")
        raise e
