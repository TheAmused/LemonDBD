# backend/app/services/smash_or_pass/roster_admin.py
"""Roster authoring and the role/gender taxonomies."""
import logging
import re
import uuid
from typing import Any

from sqlalchemy import select

from app.core import redis_cache
from app.core.extensions import db
from app.core.redis_cache import bump_catalog_version
from app.models.slug import slugify, unique_slug
from app.models.smash_or_pass import Entity, EntityStat, Roster, SmashTaxonomy, clean_media_display

logger = logging.getLogger(__name__)

#: Not enforced by the model (unlike `TierList.slug`'s own reserved set --
#: there is no per-roster frontend route to collide with, since smash-or-pass
#: is a single page with a modal roster picker), but reserved anyway as cheap
#: insurance against a future route reusing one of these words.
RESERVED_ROSTER_SLUGS = frozenset({"new", "create", "custom", "import", "shared"})


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
        translations: dict[str, Any],
        entities: list[dict[str, Any]],
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
            is_active=True,
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

    def get_taxonomies(self) -> dict[str, list[str]]:
        """Returns cached or database-derived lists of known roles and genders."""
        cache_key = "smash_or_pass:taxonomies"
        cached = redis_cache.get(cache_key)
        if cached and isinstance(cached, dict) and "roles" in cached and "genders" in cached:
            return cached

        terms = db.session.scalars(
            select(SmashTaxonomy).order_by(SmashTaxonomy.is_predefined.desc(), SmashTaxonomy.name.asc())
        ).all()

        if not terms:
            defaults = [
                ("role", "Survivor", "survivor"),
                ("role", "Killer", "killer"),
                ("gender", "female", "female"),
                ("gender", "male", "male"),
                ("gender", "monster_other", "monster_other"),
            ]
            for t_type, t_name, t_slug in defaults:
                term = SmashTaxonomy(type=t_type, name=t_name, slug=t_slug, is_predefined=True)
                db.session.add(term)
            try:
                db.session.commit()
                terms = db.session.scalars(
                    select(SmashTaxonomy).order_by(SmashTaxonomy.is_predefined.desc(), SmashTaxonomy.name.asc())
                ).all()
            except Exception as e:
                db.session.rollback()
                logger.error("[smash_or_pass_service] Failed to seed default taxonomies: %s", e)

        roles = [t.name for t in terms if t.type == "role"]
        genders = [t.name for t in terms if t.type == "gender"]

        for default_role in ("Survivor", "Killer"):
            if default_role not in roles:
                roles.insert(0, default_role)
        for default_gender in ("female", "male", "monster_other"):
            if default_gender not in genders:
                genders.append(default_gender)

        result = {"roles": roles, "genders": genders}
        redis_cache.set(cache_key, result, ttl=86400)
        return result

    def register_taxonomy(self, term_type: str, name: str) -> dict[str, Any]:
        """Registers a custom role or gender in the database, busting the cache."""
        clean_name = name.strip()[:64]
        if not clean_name:
            raise ValueError("Taxonomy name cannot be empty")
        if term_type not in ("role", "gender"):
            raise ValueError(f"Invalid taxonomy type: {term_type}")

        slug = re.sub(r"[^a-z0-9_-]+", "-", clean_name.lower()).strip("-") or "custom"
        existing = db.session.scalar(
            select(SmashTaxonomy).where(
                SmashTaxonomy.type == term_type,
                SmashTaxonomy.slug == slug,
            )
        )
        if existing:
            return existing.to_dict()

        new_term = SmashTaxonomy(
            type=term_type,
            name=clean_name,
            slug=slug,
            is_predefined=False,
        )
        db.session.add(new_term)
        try:
            db.session.commit()
            bump_catalog_version()
            redis_cache.set("smash_or_pass:taxonomies", None, ttl=1)
        except Exception as e:
            db.session.rollback()
            logger.error("[smash_or_pass_service] Error registering taxonomy: %s", e)
            raise

        return new_term.to_dict()
