# backend/app/seeds/smash_roster_seeder.py
import json
import logging
import os
from pathlib import Path
import uuid
from typing import Any, Dict, List, Tuple
from sqlalchemy import select
from app.core.extensions import db
from app.core.redis_cache import bump_catalog_version
from app.models.smash_or_pass import (
    Entity,
    EntityStat,
    Roster,
)

logger = logging.getLogger(__name__)

ROSTERS_DIR = Path(__file__).resolve().parent / "data" / "smash_or_pass" / "rosters"

#: The profile columns a seed entity may carry, at the top level of its dict.
#: They used to arrive as one `metadata_json` blob; they are columns now, and
#: the seed files spell them exactly as the model does.
ENTITY_TEXT_FIELDS = (
    "bio",
    "tagline",
    "quote",
    "meme",
    "turn_on",
    "dealbreaker",
    "dating_vibe",
)


def _entity_profile(e_data: Dict[str, Any]) -> Dict[str, Any]:
    """The profile columns for one seed entity, defaulted like the model.

    `normalize_smash_rosters.py` drops empty values from the files, so every
    field here has to survive being absent.
    """
    profile: Dict[str, Any] = {
        "real_name": e_data.get("real_name"),
        "watermark_left": e_data.get("watermark_left"),
        "watermark_right": e_data.get("watermark_right"),
        "archetype": e_data.get("archetype"),
        "red_flags": list(e_data.get("red_flags") or []),
        "green_flags": list(e_data.get("green_flags") or []),
        "chapter": e_data.get("chapter"),
        "danger_level": e_data.get("danger_level"),
        "chaos_score": e_data.get("chaos_score"),
        # de/es/ja/pl differences only; an "en" entry would restate a column.
        "translations": e_data.get("translations") or {},
    }
    for field in ENTITY_TEXT_FIELDS:
        profile[field] = e_data.get(field) or ""
    return profile


def load_rosters_from_json_files() -> Tuple[List[Dict[str, Any]], Dict[str, List[Dict[str, Any]]]]:
    """
    Dynamically scans and loads all roster definitions from backend/app/seeds/data/smash_or_pass/rosters/*.json
    Returns (rosters_list, entities_by_roster_map).
    """
    rosters_list: List[Dict[str, Any]] = []
    entities_by_roster: Dict[str, List[Dict[str, Any]]] = {}

    # There used to be a fallback to data/static_export/smash_or_pass/rosters
    # here. That directory does not exist anywhere in the repo, so the fallback
    # could only ever turn a missing seed directory into an empty, silent seed.
    target_dir = ROSTERS_DIR
    if not target_dir.exists():
        raise FileNotFoundError(f"Rosters directory does not exist: {ROSTERS_DIR}")

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


# `ROSTERS_SEED_DATA` / `ENTITIES_BY_ROSTER` used to be loaded here at import
# time. Nothing ever read them -- `_seed_smash_rosters_impl` calls the loader
# itself -- and now that a missing rosters directory raises instead of being
# papered over, an import-time call would take the whole app down with it.


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
                    name=r_data["name"],
                    description=r_data.get("description", ""),
                    translations=r_data.get("translations") or {},
                    cover_image_url=r_data.get("cover_image_url"),
                    theme_color=r_data.get("theme_color", "#ff0055"),
                    category=r_data.get("category", "DBD"),
                    is_nsfw=r_data.get("is_nsfw", False),
                    is_active=r_data.get("is_active", True),
                )
                db.session.add(roster)
                db.session.flush()
            else:
                roster.name = r_data["name"]
                roster.description = r_data.get("description", "")
                roster.translations = r_data.get("translations") or {}
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
                profile = _entity_profile(e_data)
                if not entity:
                    entity = Entity(
                        id=str(uuid.uuid4()),
                        roster_id=roster.id,
                        slug=e_data["slug"],
                        name=e_data["name"],
                        role=e_data.get("role", "Survivor"),
                        gender=e_data.get("gender", "female"),
                        media_url=e_data.get("media_url"),
                        media_type=e_data.get("media_type", "image"),
                        order_index=idx,
                        is_active=True,
                        **profile,
                    )
                    db.session.add(entity)
                    db.session.flush()
                else:
                    entity.name = e_data["name"]
                    entity.role = e_data.get("role", entity.role)
                    entity.gender = e_data.get("gender", entity.gender)
                    entity.media_url = e_data.get("media_url")
                    for field, value in profile.items():
                        setattr(entity, field, value)
                    entity.order_index = idx
                    entity.is_active = True
                    db.session.flush()

                # Ensure associated EntityStat exists. Only the three counts and
                # `chaos_rating` are assignable: `total_votes` and `smash_rate`
                # are generated columns the database computes, and the surrogate
                # `id` is gone -- `entity_id` is the primary key.
                stat = db.session.scalar(
                    select(EntityStat).where(EntityStat.entity_id == entity.id)
                )
                if not stat:
                    s_data = e_data.get("stat") or {}
                    stat = EntityStat(
                        entity_id=entity.id,
                        smash_count=int(s_data.get("smash_count") or 0),
                        pass_count=int(s_data.get("pass_count") or 0),
                        super_smash_count=int(s_data.get("super_smash_count") or 0),
                        chaos_rating=float(s_data.get("chaos_rating") or 50.0),
                    )
                    db.session.add(stat)


        db.session.commit()
        # Rosters and entities feed catalog responses in every worker; the seed
        # just changed what those would return.
        bump_catalog_version()
        logger.info(f"Successfully seeded all {len(rosters_list)} rosters from JSON files into the database.")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed seeding smash rosters: {e}")
        raise e
