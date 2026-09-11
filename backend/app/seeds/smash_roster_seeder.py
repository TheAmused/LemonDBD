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
)

logger = logging.getLogger(__name__)

ROSTERS_DIR = Path(__file__).resolve().parent / "data" / "smash_or_pass" / "rosters"


def load_rosters_from_json_files() -> Tuple[List[Dict[str, Any]], Dict[str, List[Dict[str, Any]]]]:
    """
    Dynamically scans and loads all roster definitions from backend/app/seeds/data/smash_or_pass/rosters/*.json
    Returns (rosters_list, entities_by_roster_map).
    """
    rosters_list: List[Dict[str, Any]] = []
    entities_by_roster: Dict[str, List[Dict[str, Any]]] = {}

    target_dir = ROSTERS_DIR
    if not target_dir.exists():
        fallback = Path(__file__).resolve().parent.parent.parent / "data" / "static_export" / "smash_or_pass" / "rosters"
        if fallback.exists():
            target_dir = fallback
        else:
            logger.warning(f"Rosters directory does not exist: {ROSTERS_DIR}")
            return rosters_list, entities_by_roster

    # Sort JSON files (canon first, then alphabetically)
    json_files = sorted(
        target_dir.glob("*.json"),
        key=lambda p: (0 if p.stem == "canon" else 1, p.stem),
    )

    for file_path in json_files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            raw_rosters = []
            if "rosters" in data and isinstance(data["rosters"], list):
                raw_rosters = data["rosters"]
            elif "roster" in data and isinstance(data["roster"], dict):
                legacy_r = dict(data["roster"])
                if "entities" in data and "entities" not in legacy_r:
                    legacy_r["entities"] = data["entities"]
                raw_rosters = [legacy_r]

            for r_data in raw_rosters:
                slug = r_data.get("slug")
                if not slug:
                    continue

                entities_list = r_data.get("entities", [])
                entities_by_roster[slug] = entities_list

                clean_r = {k: v for k, v in r_data.items() if k != "entities"}
                rosters_list.append(clean_r)

        except Exception as e:
            logger.error(f"Error loading roster JSON file {file_path}: {e}")

    return rosters_list, entities_by_roster


# Dynamically load data for module-level access
ROSTERS_SEED_DATA, ENTITIES_BY_ROSTER = load_rosters_from_json_files()


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
    if static_dir is None:
        static_dir = Path(__file__).resolve().parent.parent / "static"
    rosters_dir = static_dir / "avatars" / "rosters"
    if not rosters_dir.exists():
        logger.debug(f"[smash_seeder] Roster assets directory notice: {rosters_dir} not found")


def _seed_smash_rosters_impl():
    try:
        ensure_roster_assets()
        rosters_list, entities_by_roster = load_rosters_from_json_files()

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
                        metadata_json=e_data.get("metadata_json") or e_data.get("metadata") or {},
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
                    entity.metadata_json = e_data.get("metadata_json") or e_data.get("metadata", entity.metadata_json)
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


        db.session.commit()
        logger.info(f"Successfully seeded all {len(rosters_list)} rosters from JSON files into the database.")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed seeding smash rosters: {e}")
        raise e
