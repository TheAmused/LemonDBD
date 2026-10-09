# backend/app/services/smash_or_pass_service.py
import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.models.smash_or_pass import Entity, EntityStat, Roster, Vote
from app.seeds.smash_roster_seeder import ROSTERS_DIR, seed_smash_rosters
from app.services.smash_or_pass.roster_admin import SmashRosterAdminMixin
from app.services.smash_or_pass.serialize import enrich_with_stat
from app.services.smash_or_pass.votes import SmashVotesMixin

logger = logging.getLogger(__name__)

#: `ENTITY_TEXT_FIELDS` from the seeder, in the order a seed file spells them.
_ENTITY_PROFILE_TEXT_FIELDS = (
    "bio",
    "tagline",
    "quote",
    "meme",
    "turn_on",
    "dealbreaker",
    "dating_vibe",
)


class SmashOrPassService(SmashVotesMixin, SmashRosterAdminMixin):
    """Service handling multi-roster Smash or Pass voting, feed generation, user persistence, and leaderboards."""
    _is_seeded: bool = False

    def ensure_seeded(self) -> None:
        if SmashOrPassService._is_seeded:
            return
        try:
            count = db.session.scalar(select(func.count(Roster.id)))
            if not count or count == 0:
                seed_smash_rosters()
            SmashOrPassService._is_seeded = True
        except Exception as e:
            logger.debug(f"Smash-or-pass seed notice: {e}")

    def get_rosters(self, active_only: bool = True, include_nsfw: bool = False, lang: str | None = None) -> list[dict[str, Any]]:
        """List rosters. `include_nsfw=False` (the default) hides any roster with
        `is_nsfw=True` from this listing entirely -- an explicit opt-in
        (`?include_nsfw=true` on the route) is required to see it here at all.
        This is a listing-level gate only: fetching a specific NSFW roster's feed
        directly by slug (get_feed) still works even without the opt-in, so a
        direct link still resolves -- `is_nsfw` just isn't hidden from the
        response in that case, so the frontend can gate display on it there."""
        self.ensure_seeded()
        stmt = select(Roster)
        if active_only:
            stmt = stmt.where(Roster.is_active.is_(True))
        if not include_nsfw:
            stmt = stmt.where(Roster.is_nsfw.is_(False))
        stmt = stmt.order_by(Roster.slug)
        rosters = db.session.scalars(stmt).all()

        # Single grouped query for entity_count and total_votes by roster_id to eliminate N+1 queries
        counts_stmt = (
            select(
                Entity.roster_id,
                func.count(Entity.id).label("entity_count"),
                func.coalesce(func.sum(EntityStat.total_votes), 0).label("total_votes"),
            )
            .outerjoin(EntityStat, Entity.id == EntityStat.entity_id)
            .group_by(Entity.roster_id)
        )
        counts_by_roster = {
            row.roster_id: (int(row.entity_count or 0), int(row.total_votes or 0))
            for row in db.session.execute(counts_stmt).all()
        }

        result = []
        for r in rosters:
            entity_count, total_votes = counts_by_roster.get(r.id, (0, 0))
            r_dict = r.to_dict(lang=lang)
            r_dict["entity_count"] = entity_count
            r_dict["character_count"] = entity_count
            r_dict["total_votes"] = total_votes
            result.append(r_dict)
        return result

    def get_feed(
        self,
        roster_slug: str = "canon",
        session_id: str | None = None,
        user_id: int | None = None,
        role: str | None = None,
        gender: str | None = None,
        limit: int = 250,
        lang: str | None = None,
    ) -> dict[str, Any] | None:
        self.ensure_seeded()
        roster = db.session.scalar(select(Roster).where(Roster.slug == roster_slug))
        if not roster:
            return None

        # Scoped to this one roster instead of calling get_rosters(), which
        # selects every roster and aggregates votes across every entity in
        # the database just to discard all but one row.
        entity_count, roster_total_votes = db.session.execute(
            select(
                func.count(Entity.id),
                func.coalesce(func.sum(EntityStat.total_votes), 0),
            )
            .select_from(Entity)
            .outerjoin(EntityStat, Entity.id == EntityStat.entity_id)
            .where(Entity.roster_id == roster.id)
        ).one()
        roster_info = roster.to_dict(lang=lang)
        roster_info["entity_count"] = int(entity_count or 0)
        roster_info["character_count"] = int(entity_count or 0)
        roster_info["total_votes"] = int(roster_total_votes or 0)

        voted_conditions = []
        if user_id is not None:
            voted_conditions.append(Vote.user_id == user_id)
        if session_id is not None:
            voted_conditions.append(Vote.session_id == session_id)

        voted_entity_ids: list[str] = []
        if voted_conditions:
            voted_stmt = select(Vote.entity_id).where(or_(*voted_conditions))
            voted_entity_ids = list(db.session.scalars(voted_stmt).all())

        count_stmt = select(func.count(Entity.id)).where(Entity.roster_id == roster.id)
        if voted_entity_ids:
            count_stmt = count_stmt.where(Entity.id.not_in(voted_entity_ids))

        if role and role != "all":
            count_stmt = count_stmt.where(Entity.role == role)
        if gender and gender != "all":
            count_stmt = count_stmt.where(Entity.gender == gender)

        total_remaining = db.session.scalar(count_stmt) or 0

        stmt = (
            select(Entity)
            .options(joinedload(Entity.stat))
            .where(Entity.roster_id == roster.id)
        )

        if voted_entity_ids:
            stmt = stmt.where(Entity.id.not_in(voted_entity_ids))

        if role and role != "all":
            stmt = stmt.where(Entity.role == role)
        if gender and gender != "all":
            stmt = stmt.where(Entity.gender == gender)

        stmt = stmt.order_by(Entity.order_index).limit(limit)
        entities = db.session.scalars(stmt).all()

        return {
            "roster": roster_info,
            "entities": [e.to_dict(lang) for e in entities],
            "total_remaining": int(total_remaining),
        }

    def get_leaderboard(
        self,
        roster_slug: str = "canon",
        role: str | None = None,
        gender: str | None = None,
        sort_by: str = "smash_rate",
        limit: int = 100,
        edition: str | None = None,
        lang: str | None = None,
    ) -> list[dict[str, Any]]:
        self.ensure_seeded()
        target_slug = roster_slug or edition or "canon"
        roster_id = db.session.scalar(select(Roster.id).where(Roster.slug == target_slug))
        if roster_id is None:
            return []

        stmt = (
            select(Entity, EntityStat)
            .join(EntityStat, Entity.id == EntityStat.entity_id)
            .where(Entity.roster_id == roster_id)
        )

        if role and role != "all":
            stmt = stmt.where(Entity.role == role)
        if gender and gender != "all":
            stmt = stmt.where(Entity.gender == gender)

        if sort_by == "total_votes":
            stmt = stmt.order_by(EntityStat.total_votes.desc(), EntityStat.smash_rate.desc())
        elif sort_by == "smash_count":
            stmt = stmt.order_by((EntityStat.smash_count + EntityStat.super_smash_count).desc(), EntityStat.smash_rate.desc())
        elif sort_by == "chaos_rating":
            stmt = stmt.order_by(EntityStat.chaos_rating.desc(), EntityStat.smash_rate.desc())
        else:
            stmt = stmt.order_by(EntityStat.smash_rate.desc(), EntityStat.total_votes.desc())

        stmt = stmt.limit(limit)
        rows = db.session.execute(stmt).all()

        leaderboard = []
        for rank, (entity, stat) in enumerate(rows, start=1):
            rate = stat.smash_rate if stat.smash_rate is not None else 0.0
            if rate >= 80.0:
                tier = "God Tier"
            elif rate >= 60.0:
                tier = "Fatal Attraction"
            elif rate >= 40.0:
                tier = "Friendzone"
            else:
                tier = "Eldritch Void"

            item = enrich_with_stat(entity, stat, target_slug, lang)
            item["rank"] = rank
            item["tier"] = tier
            leaderboard.append(item)

        return leaderboard

    def get_editions(self) -> list[dict[str, Any]]:
        return self.get_rosters(active_only=True)

    def get_characters_with_stats(
        self,
        edition: str = "canon",
        role: str | None = None,
        gender: str | None = None,
        search: str | None = None,
        lang: str | None = None,
    ) -> list[dict[str, Any]]:
        self.ensure_seeded()
        roster = db.session.scalar(select(Roster).where(Roster.slug == edition))
        if not roster:
            return []

        stmt = (
            select(Entity)
            .options(joinedload(Entity.stat))
            .where(Entity.roster_id == roster.id)
        )
        if role and role != "all":
            stmt = stmt.where(Entity.role == role)
        if gender and gender != "all":
            stmt = stmt.where(Entity.gender == gender)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(or_(Entity.name.ilike(pattern), Entity.slug.ilike(pattern)))

        stmt = stmt.order_by(Entity.order_index)
        entities = db.session.scalars(stmt).all()
        return [enrich_with_stat(e, e.stat, edition, lang) for e in entities]

    def get_character_stat(
        self, character_slug: str, edition: str = "canon", lang: str | None = None
    ) -> dict[str, Any] | None:
        self.ensure_seeded()
        roster = db.session.scalar(select(Roster).where(Roster.slug == edition))
        if not roster:
            return None
        entity = db.session.scalar(
            select(Entity)
            .options(joinedload(Entity.stat))
            .where(
                Entity.roster_id == roster.id,
                Entity.slug == character_slug,
            )
        )
        if not entity or not entity.stat:
            return None
        return enrich_with_stat(entity, entity.stat, edition, lang)

    def reset_stats(self) -> dict[str, Any]:
        try:
            db.session.execute(delete(Vote))
            db.session.execute(delete(EntityStat))
            db.session.commit()
            seed_smash_rosters()
            return {
                "status": "reset_complete",
                "message": "All smash-or-pass stats reset to 0",
            }
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def _write_roster_seed_file(roster: Roster, entities: list[Entity]) -> None:
        """Writes exactly one new `seeds/data/smash_or_pass/rosters/<slug>.json`
        file, in the same `{"rosters": [{...}]}` shape `load_rosters_from_json_files`
        reads back -- unlike tier lists' single shared file, this format is
        already one-file-per-roster, so creating a roster never touches any
        other file. A write failure (read-only filesystem, full disk) is
        logged, not raised -- the DB rows this follows are already committed
        and are what the running app serves.
        """
        roster_dict: dict[str, Any] = {
            "slug": roster.slug,
            "name": roster.name,
            "description": roster.description,
            "translations": roster.translations or {},
            "cover_image_url": roster.cover_image_url,
            "theme_color": roster.theme_color,
            "category": roster.category,
            "is_nsfw": roster.is_nsfw,
            "is_active": roster.is_active,
            "entities": [],
        }
        for e in entities:
            entity_dict: dict[str, Any] = {
                "slug": e.slug,
                "name": e.name,
                "role": e.role,
                "gender": e.gender,
                "media_url": e.media_url,
                "archetype": e.archetype,
            }
            if e.media_display:
                entity_dict["media_display"] = e.media_display
            for field in _ENTITY_PROFILE_TEXT_FIELDS:
                entity_dict[field] = getattr(e, field) or ""
            entity_dict["red_flags"] = list(e.red_flags or [])
            entity_dict["green_flags"] = list(e.green_flags or [])
            entity_dict["chapter"] = e.chapter
            entity_dict["danger_level"] = e.danger_level
            entity_dict["chaos_score"] = e.chaos_score
            entity_dict["translations"] = e.translations or {}
            entity_dict["order_index"] = e.order_index
            entity_dict["real_name"] = e.real_name
            entity_dict["watermark_left"] = e.watermark_left
            entity_dict["watermark_right"] = e.watermark_right
            roster_dict["entities"].append(entity_dict)

        payload = {
            "version": "1.0",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "source": "LemonDBD admin roster creator",
            "rosters": [roster_dict],
        }
        path = ROSTERS_DIR / f"{roster.slug}.json"
        try:
            path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        except OSError as err:
            logger.error("[smash_or_pass_service] Failed to write roster seed file %s: %s", path, err)
