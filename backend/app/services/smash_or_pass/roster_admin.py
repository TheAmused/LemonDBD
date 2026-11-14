# backend/app/services/smash_or_pass/roster_admin.py
"""Roster authoring."""
import logging
import uuid
from typing import Any

from sqlalchemy import delete, select

from app.core.extensions import db
from app.core.redis_cache import bump_catalog_version
from app.models.slug import slugify, unique_slug
from app.models.smash_or_pass import Entity, EntityStat, Roster, Vote, clean_media_display

logger = logging.getLogger(__name__)

#: Not enforced by the model (unlike `TierList.slug`'s own reserved set --
#: there is no per-roster frontend route to collide with, since smash-or-pass
#: is a single page with a modal roster picker), but reserved anyway as cheap
#: insurance against a future route reusing one of these words.
RESERVED_ROSTER_SLUGS = frozenset({"new", "create", "custom", "import", "shared"})


def admin_entity_dict(entity: Entity) -> dict[str, Any]:
    """Admin representation of an entity, exposing all profile and translation columns at root."""
    return {
        "id": entity.id,
        "roster_id": entity.roster_id,
        "slug": entity.slug,
        "name": entity.name,
        "real_name": entity.real_name,
        "role": entity.role,
        "gender": entity.gender,
        "media_url": entity.media_url,
        "media_display": entity.media_display,
        "watermark_left": entity.watermark_left,
        "watermark_right": entity.watermark_right,
        "archetype": entity.archetype,
        "bio": entity.bio or "",
        "tagline": entity.tagline or "",
        "quote": entity.quote or "",
        "meme": entity.meme or "",
        "turn_on": entity.turn_on or "",
        "dealbreaker": entity.dealbreaker or "",
        "dating_vibe": entity.dating_vibe or "",
        "red_flags": list(entity.red_flags or []),
        "green_flags": list(entity.green_flags or []),
        "chapter": entity.chapter,
        "danger_level": entity.danger_level,
        "chaos_score": entity.chaos_score,
        "translations": entity.translations or {},
        "order_index": entity.order_index,
        "metadata": entity.metadata_dict("en"),
    }


def admin_roster_response(row: Roster) -> dict[str, Any]:
    """`Roster.to_dict()` never carries its entities. Admin creator/editor endpoints use this to
    receive all raw entity columns, romance archetypes, and translation dictionaries."""
    data = row.to_dict()
    data["entity_count"] = len(row.entities)
    data["character_count"] = len(row.entities)
    data["entities"] = [admin_entity_dict(e) for e in row.entities]
    data["romance_archetypes"] = row.romance_archetypes or []
    return data


class SmashRosterAdminMixin:
    """Roster-authoring half of `SmashOrPassService`; `create_roster` hands the new roster's seed
    file to the service's `_write_roster_seed_file`."""

    def create_roster(
        self,
        *,
        name: str,
        description: str,
        cover_image_url: str | None,
        theme_color: str,
        category: str,
        is_nsfw: bool,
        is_active: bool = True,
        translations: dict[str, Any],
        entities: list[dict[str, Any]],
        romance_archetypes: list[dict[str, Any]] | None = None,
    ) -> Roster:
        """An admin-authored official roster: the "Official?" checkbox in the
        roster creator posts here instead of saving to this browser's
        localStorage. Live for every visitor the moment this returns --
        `is_active=True` from the start, picked up by the data-driven roster
        picker on its next fetch (catalog version just bumped below).

        Every entity gets a zeroed `EntityStat` row here, the same guarantee
        `seed_smash_rosters()` makes for every seeded entity: `cast_vote` and
        the leaderboard both assume that row exists rather than creating it
        lazily.

        Raises `ValueError` for anything the route should turn into a 400;
        there is currently nothing at this layer that raises one (Pydantic
        already rejected a malformed payload before this is called), but the
        signature mirrors `create_tier_list` in case a future cross-field rule
        needs one.
        """
        self.ensure_seeded()

        roster_id = str(uuid.uuid4())
        slug = self._unique_roster_slug(self._slugify(name, max_len=64, fallback="roster"))

        roster = Roster(
            id=roster_id,
            slug=slug,
            name=name.strip(),
            description=description.strip(),
            translations=translations or {},
            cover_image_url=cover_image_url,
            theme_color=theme_color,
            category=category,
            is_nsfw=is_nsfw,
            is_active=bool(is_active),
            romance_archetypes=romance_archetypes or [],
        )

        entity_rows: list[Entity] = []
        taken_slugs: set[str] = set()
        for idx, e in enumerate(entities):
            # Entity.slug is unique only WITHIN a roster (see
            # smash_roster_seeder.py's upsert lookup), never globally, and
            # this roster has no rows yet -- so de-duplication only needs to
            # look at the entities in THIS submission, not the database.
            base_slug = self._slugify(e["name"], max_len=100, fallback=f"entity-{idx + 1}")
            entity_slug = base_slug
            n = 2
            while entity_slug in taken_slugs:
                entity_slug = f"{base_slug}-{n}"
                n += 1
            taken_slugs.add(entity_slug)

            entity_rows.append(
                Entity(
                    id=str(uuid.uuid4()),
                    roster_id=roster_id,
                    slug=entity_slug,
                    name=e["name"].strip(),
                    real_name=e.get("real_name"),
                    role=(e.get("role") or "Survivor").strip() or "Survivor",
                    gender=(e.get("gender") or "female").strip() or "female",
                    media_url=e.get("media_url"),
                    media_display=clean_media_display(e.get("media_display")),
                    watermark_left=e.get("watermark_left"),
                    watermark_right=e.get("watermark_right"),
                    archetype=e.get("archetype"),
                    bio=e.get("bio") or "",
                    tagline=e.get("tagline") or "",
                    quote=e.get("quote") or "",
                    meme=e.get("meme") or "",
                    turn_on=e.get("turn_on") or "",
                    dealbreaker=e.get("dealbreaker") or "",
                    dating_vibe=e.get("dating_vibe") or "",
                    red_flags=list(e.get("red_flags") or []),
                    green_flags=list(e.get("green_flags") or []),
                    chapter=e.get("chapter"),
                    danger_level=e.get("danger_level"),
                    chaos_score=e.get("chaos_score"),
                    translations=e.get("translations") or {},
                    order_index=idx,
                )
            )

        try:
            db.session.add(roster)
            for entity in entity_rows:
                db.session.add(entity)
            db.session.flush()

            for entity in entity_rows:
                db.session.add(
                    EntityStat(
                        entity_id=entity.id,
                        smash_count=0,
                        pass_count=0,
                        super_smash_count=0,
                        chaos_rating=50.0,
                    )
                )

            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating admin roster '{name}': {e}")
            raise

        # Everything below is best-effort follow-up to a write that already
        # succeeded: the roster is live and served either way, so neither
        # step rolls it back or fails the request if it stumbles.
        bump_catalog_version()
        self._write_roster_seed_file(roster, entity_rows)
        return roster

    def update_roster(
        self,
        slug: str,
        *,
        name: str,
        description: str,
        cover_image_url: str | None,
        theme_color: str,
        category: str,
        is_nsfw: bool,
        is_active: bool,
        translations: dict[str, Any],
        entities: list[dict[str, Any]],
        romance_archetypes: list[dict[str, Any]] | None = None,
    ) -> Roster | None:
        """Updates an official roster, its entities, translations, and seed file."""
        self.ensure_seeded()
        normalized = (slug or "").strip().lower()
        roster = db.session.scalar(select(Roster).where(Roster.slug == normalized))
        if not roster:
            return None

        roster.name = name.strip()
        roster.description = description.strip()
        roster.cover_image_url = cover_image_url
        roster.theme_color = theme_color
        roster.category = category
        roster.is_nsfw = is_nsfw
        roster.is_active = bool(is_active)
        roster.translations = translations or {}
        if romance_archetypes is not None:
            roster.romance_archetypes = romance_archetypes

        existing_entities = db.session.scalars(select(Entity).where(Entity.roster_id == roster.id)).all()
        existing_by_slug = {e.slug: e for e in existing_entities}
        existing_by_name = {e.name.strip().lower(): e for e in existing_entities}

        taken_slugs: set[str] = set()
        retained_entity_ids: set[str] = set()
        updated_entities: list[Entity] = []

        for idx, e in enumerate(entities):
            name_clean = e["name"].strip()
            slug_candidate = e.get("slug")
            existing_match = None
            if slug_candidate and slug_candidate in existing_by_slug:
                existing_match = existing_by_slug[slug_candidate]
            elif name_clean.lower() in existing_by_name:
                existing_match = existing_by_name[name_clean.lower()]

            if existing_match:
                entity_slug = existing_match.slug
                taken_slugs.add(entity_slug)
                retained_entity_ids.add(existing_match.id)
                existing_match.name = name_clean
                existing_match.real_name = e.get("real_name")
                existing_match.role = (e.get("role") or "Survivor").strip() or "Survivor"
                existing_match.gender = (e.get("gender") or "female").strip() or "female"
                existing_match.media_url = e.get("media_url")
                existing_match.media_display = clean_media_display(e.get("media_display"))
                existing_match.watermark_left = e.get("watermark_left")
                existing_match.watermark_right = e.get("watermark_right")
                existing_match.archetype = e.get("archetype")
                existing_match.bio = e.get("bio") or ""
                existing_match.tagline = e.get("tagline") or ""
                existing_match.quote = e.get("quote") or ""
                existing_match.meme = e.get("meme") or ""
                existing_match.turn_on = e.get("turn_on") or ""
                existing_match.dealbreaker = e.get("dealbreaker") or ""
                existing_match.dating_vibe = e.get("dating_vibe") or ""
                existing_match.red_flags = list(e.get("red_flags") or [])
                existing_match.green_flags = list(e.get("green_flags") or [])
                existing_match.chapter = e.get("chapter")
                existing_match.danger_level = e.get("danger_level")
                existing_match.chaos_score = e.get("chaos_score")
                existing_match.translations = e.get("translations") or {}
                existing_match.order_index = idx
                updated_entities.append(existing_match)
            else:
                base_slug = self._slugify(name_clean, max_len=100, fallback=f"entity-{idx + 1}")
                entity_slug = base_slug
                n = 2
                while entity_slug in taken_slugs or entity_slug in existing_by_slug:
                    entity_slug = f"{base_slug}-{n}"
                    n += 1
                taken_slugs.add(entity_slug)

                new_entity_id = str(uuid.uuid4())
                new_entity = Entity(
                    id=new_entity_id,
                    roster_id=roster.id,
                    slug=entity_slug,
                    name=name_clean,
                    real_name=e.get("real_name"),
                    role=(e.get("role") or "Survivor").strip() or "Survivor",
                    gender=(e.get("gender") or "female").strip() or "female",
                    media_url=e.get("media_url"),
                    media_display=clean_media_display(e.get("media_display")),
                    watermark_left=e.get("watermark_left"),
                    watermark_right=e.get("watermark_right"),
                    archetype=e.get("archetype"),
                    bio=e.get("bio") or "",
                    tagline=e.get("tagline") or "",
                    quote=e.get("quote") or "",
                    meme=e.get("meme") or "",
                    turn_on=e.get("turn_on") or "",
                    dealbreaker=e.get("dealbreaker") or "",
                    dating_vibe=e.get("dating_vibe") or "",
                    red_flags=list(e.get("red_flags") or []),
                    green_flags=list(e.get("green_flags") or []),
                    chapter=e.get("chapter"),
                    danger_level=e.get("danger_level"),
                    chaos_score=e.get("chaos_score"),
                    translations=e.get("translations") or {},
                    order_index=idx,
                )
                db.session.add(new_entity)
                db.session.flush()
                db.session.add(
                    EntityStat(
                        entity_id=new_entity_id,
                        smash_count=0,
                        pass_count=0,
                        super_smash_count=0,
                        chaos_rating=50.0,
                    )
                )
                retained_entity_ids.add(new_entity_id)
                updated_entities.append(new_entity)

        removed_entity_ids = [e.id for e in existing_entities if e.id not in retained_entity_ids]
        if removed_entity_ids:
            db.session.execute(delete(Vote).where(Vote.entity_id.in_(removed_entity_ids)))
            db.session.execute(delete(EntityStat).where(EntityStat.entity_id.in_(removed_entity_ids)))
            db.session.execute(delete(Entity).where(Entity.id.in_(removed_entity_ids)))

        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating admin roster '{slug}': {e}")
            raise

        bump_catalog_version()
        self._write_roster_seed_file(roster, updated_entities)
        return roster

    def delete_roster(self, slug: str) -> bool:
        """Deletes an official roster by slug, its entities, entity stats, and its seed file."""
        normalized = (slug or "").strip().lower()
        if not normalized:
            return False
        if normalized == "canon":
            raise ValueError("Cannot delete canonical roster")
        roster = db.session.scalar(select(Roster).where(Roster.slug == normalized))
        if not roster:
            return False

        roster_slug = roster.slug
        try:
            entity_ids = db.session.scalars(select(Entity.id).where(Entity.roster_id == roster.id)).all()
            if entity_ids:
                db.session.execute(delete(Vote).where(Vote.entity_id.in_(entity_ids)))
                db.session.execute(delete(EntityStat).where(EntityStat.entity_id.in_(entity_ids)))
                db.session.execute(delete(Entity).where(Entity.roster_id == roster.id))
            db.session.delete(roster)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting roster '{slug}': {e}")
            raise

        bump_catalog_version()
        from app.services.smash_or_pass_service import ROSTERS_DIR
        from app.seeds.writeback import remove_seed_file

        remove_seed_file(ROSTERS_DIR / f"{roster_slug}.json")
        return True

    @staticmethod
    def _slugify(text: str, *, max_len: int, fallback: str) -> str:
        """`"Hooked on You"` -> `"hooked-on-you"` (a run of anything else
        collapses to one hyphen), truncated to `max_len` and re-stripped."""
        return slugify(text, sep="-", fold_unicode=False, strip_symbols=False, max_len=max_len, fallback=fallback)

    @staticmethod
    def _unique_roster_slug(base: str) -> str:
        """A roster's slug is its stable public identity (the picker, the seed
        filename, any future deep link), so a collision must never silently
        overwrite one."""
        return unique_slug(
            base,
            lambda c: db.session.scalar(select(Roster.id).where(Roster.slug == c)),
            reserved=RESERVED_ROSTER_SLUGS,
        )
