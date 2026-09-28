# backend/app/services/others/smash_or_pass_service.py
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import case, delete, func, or_, select
from sqlalchemy.orm import joinedload
from app.core.extensions import db
from app.core import redis_cache
from app.core.redis_cache import bump_catalog_version
from app.models.base import utcnow
from app.models.smash_or_pass import (
    Entity,
    EntityStat,
    Roster,
    SmashTaxonomy,
    Vote,
)
from app.seeds.smash_roster_seeder import ROSTERS_DIR, seed_smash_rosters

logger = logging.getLogger(__name__)

_SLUG_INVALID = re.compile(r"[^a-z0-9]+")

#: Not enforced by the model (unlike `TierList.slug`'s own reserved set --
#: there is no per-roster frontend route to collide with, since smash-or-pass
#: is a single page with a modal roster picker), but reserved anyway as cheap
#: insurance against a future route reusing one of these words.
RESERVED_ROSTER_SLUGS = frozenset({"new", "create", "custom", "import", "shared"})

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


def _enrich_with_stat(
    entity: Entity, stat: EntityStat | None, edition: str, lang: str | None = None
) -> dict[str, Any]:
    """Serialize an Entity plus its EntityStat into the flat dict shape shared by
    every vote/leaderboard/roster-browsing response (cast_vote, get_leaderboard,
    get_characters_with_stats, get_character_stat)."""
    d = entity.to_dict(lang)
    d["character_slug"] = entity.slug
    d["character_name"] = entity.name
    d["edition"] = edition
    d["smash_count"] = stat.smash_count if stat else 0
    d["pass_count"] = stat.pass_count if stat else 0
    d["super_smash_count"] = stat.super_smash_count if stat else 0
    # Generated columns: the database fills them in, and they read back as None
    # on a stat row that has been added but not yet flushed and re-read.
    d["total_votes"] = int(stat.total_votes or 0) if stat else 0
    d["smash_rate"] = round(stat.smash_rate or 0.0, 1) if stat else 0.0
    d["chaos_rating"] = stat.chaos_rating if stat else 50.0
    return d


class SmashOrPassService:
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
            .where(Entity.is_active.is_(True))
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
            .where(Entity.roster_id == roster.id, Entity.is_active.is_(True))
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

        count_stmt = select(func.count(Entity.id)).where(
            Entity.roster_id == roster.id,
            Entity.is_active.is_(True),
        )
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
            .where(
                Entity.roster_id == roster.id,
                Entity.is_active.is_(True),
            )
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

    def recalculate_stat_for_entity(self, entity_id: str) -> EntityStat:
        """
        Recalculate exact, immutable aggregate statistics for an entity strictly from 
        authenticated user votes (Vote.user_id != None). Prevents vote-stuffing and drifts.
        """
        stat = db.session.scalar(select(EntityStat).where(EntityStat.entity_id == entity_id))
        if not stat:
            entity = db.session.get(Entity, entity_id)
            # `chaos_score` is a column now, not a key in a metadata blob.
            chaos = 50.0
            if entity is not None and entity.chaos_score is not None:
                chaos = float(entity.chaos_score)
            # `total_votes` and `smash_rate` are generated columns and cannot be
            # assigned here -- the database computes them from the three counts.
            stat = EntityStat(
                entity_id=entity_id,
                smash_count=0,
                pass_count=0,
                super_smash_count=0,
                chaos_rating=chaos,
            )
            db.session.add(stat)
            db.session.flush()

        stmt = (
            select(
                func.count(case((Vote.vote_type == "smash", 1))),
                func.count(case((Vote.vote_type == "pass", 1))),
                func.count(case((Vote.vote_type == "super_smash", 1))),
            )
            .where(
                Vote.entity_id == entity_id,
                Vote.user_id.is_not(None),
            )
        )
        smashes, passes, super_smashes = db.session.execute(stmt).one()
        stat.smash_count = int(smashes or 0)
        stat.pass_count = int(passes or 0)
        stat.super_smash_count = int(super_smashes or 0)
        # `calculate_rate()` is gone: `total_votes` and `smash_rate` are
        # generated columns, so there is nothing for a writer to forget. The
        # price is that the database has to see the new counts before those two
        # can be read back -- hence the flush and the re-read.
        db.session.flush()
        db.session.refresh(stat, attribute_names=["total_votes", "smash_rate"])
        return stat

    def cast_vote(
        self,
        entity_id: str | None = None,
        character_slug: str | None = None,
        vote_type: str = "smash",
        session_id: str | None = None,
        user_id: int | None = None,
        roster_slug: str | None = None,
        edition: str = "canon",
        lang: str | None = None,
    ) -> dict[str, Any]:
        self.ensure_seeded()
        valid_votes = {"smash", "pass", "super_smash"}
        if vote_type not in valid_votes:
            raise ValueError(f"Invalid vote_type '{vote_type}'. Must be one of {valid_votes}")

        try:
            target_slug = roster_slug or edition
            entity: Entity | None = None
            if entity_id:
                entity = db.session.get(Entity, entity_id)
            elif character_slug:
                roster = db.session.scalar(select(Roster).where(Roster.slug == target_slug))
                if roster:
                    entity = db.session.scalar(
                        select(Entity).where(
                            Entity.roster_id == roster.id,
                            Entity.slug == character_slug,
                        )
                    )
                if not entity:
                    # Cross-roster fallback for a caller that only has a character_slug
                    # and either no roster_slug/edition or one that doesn't resolve to a
                    # real roster. Entity.slug is only guaranteed unique WITHIN a roster
                    # (the seeder's upsert lookup scopes by roster_id -- see
                    # smash_roster_seeder.py), not globally, and nothing in the schema
                    # enforces global uniqueness. No current roster JSON file actually
                    # reuses a slug across rosters, but if one ever does, this bare
                    # `.scalar()` with no ORDER BY would silently record the vote
                    # against an arbitrary one of the matching entities instead of a
                    # deterministic one. `.order_by(Entity.id)` at least makes that
                    # deterministic (same slug always resolves to the same entity here)
                    # rather than implementation-defined -- it doesn't decide which one
                    # is "correct" for an ambiguous slug, which is a real product
                    # question (should this fallback exist at all without a roster
                    # scope?) left open rather than decided here.
                    entity = db.session.scalars(
                        select(Entity).where(Entity.slug == character_slug).order_by(Entity.id)
                    ).first()

            if not entity:
                raise ValueError(f"Entity not found for entity_id='{entity_id}' or character_slug='{character_slug}'")

            existing_vote = None
            user_sess_conds = []
            if user_id is not None:
                user_sess_conds.append(Vote.user_id == user_id)
            if session_id is not None:
                user_sess_conds.append(Vote.session_id == session_id)

            if user_sess_conds:
                # `.scalars().order_by(...).first()`, not `.scalar()`: two Vote
                # rows can legally match here (e.g. an anonymous vote under
                # `session_id` and a separate authenticated vote under `user_id`
                # for the same entity, from two different devices), since there
                # is no DB constraint preventing it. Bare `.scalar()` on a
                # multi-row result does NOT raise -- it silently returns the
                # first column of whichever row the database happens to return
                # first, with no ORDER BY to make that deterministic. That means
                # which vote gets treated as "the" existing one (and therefore
                # overwritten in place below) could differ between two identical
                # requests. Ordering by `created_at desc` makes it deterministic:
                # the vote being cast right now always updates the most recent
                # prior vote, not an arbitrary one.
                existing_vote = db.session.scalars(
                    select(Vote)
                    .where(Vote.entity_id == entity.id, or_(*user_sess_conds))
                    .order_by(Vote.created_at.desc())
                ).first()

            if existing_vote:
                existing_vote.vote_type = vote_type
                if user_id is not None:
                    existing_vote.user_id = user_id
                if session_id is not None:
                    existing_vote.session_id = session_id
                existing_vote.created_at = utcnow()
            else:
                new_vote = Vote(
                    entity_id=entity.id,
                    session_id=session_id,
                    user_id=user_id,
                    vote_type=vote_type,
                )
                db.session.add(new_vote)

            db.session.flush()
            stat = self.recalculate_stat_for_entity(entity.id)

            db.session.commit()
            db.session.refresh(entity)
            db.session.refresh(stat)

            return _enrich_with_stat(entity, stat, target_slug, lang)
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error recording smash-or-pass vote: {e}")
            raise e

    def sync_session_votes(
        self,
        user_id: int,
        session_id: str,
        roster_slug: str | None = None,
    ) -> dict[str, Any]:
        """
        Migrate and synchronize guest votes from a session to an authenticated user account.
        Attaches the votes to the user and recalculates global EntityStat rankings.
        """
        self.ensure_seeded()
        if not user_id or not session_id:
            return {"status": "success", "synced_count": 0, "synced_votes": []}

        try:
            stmt = select(Vote).where(Vote.session_id == session_id, Vote.user_id.is_(None))
            if roster_slug:
                roster = db.session.scalar(select(Roster).where(Roster.slug == roster_slug))
                if roster:
                    stmt = stmt.join(Entity, Vote.entity_id == Entity.id).where(Entity.roster_id == roster.id)

            session_votes = db.session.scalars(stmt).all()
            synced_count = 0
            synced_votes = []
            affected_entity_ids = set()

            for s_vote in session_votes:
                # Same reasoning as cast_vote: more than one Vote row can already
                # match (entity_id, user_id) since nothing enforces uniqueness, and
                # bare `.scalar()` picks an arbitrary one with no ORDER BY. Ordering
                # by `created_at desc` makes the sync target deterministic instead
                # of implementation-defined.
                existing_user_vote = db.session.scalars(
                    select(Vote)
                    .where(Vote.entity_id == s_vote.entity_id, Vote.user_id == user_id)
                    .order_by(Vote.created_at.desc())
                ).first()

                if existing_user_vote:
                    db.session.delete(s_vote)
                else:
                    s_vote.user_id = user_id
                    affected_entity_ids.add(s_vote.entity_id)
                    synced_count += 1
                    synced_votes.append({
                        "entity_id": s_vote.entity_id,
                        "vote_type": s_vote.vote_type,
                    })

            db.session.flush()

            for eid in affected_entity_ids:
                self.recalculate_stat_for_entity(eid)

            db.session.commit()
            return {
                "status": "success",
                "synced_count": synced_count,
                "synced_votes": synced_votes,
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error syncing session votes to user {user_id}: {e}")
            raise e

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
            .where(
                Entity.roster_id == roster_id,
                Entity.is_active.is_(True),
            )
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

            item = _enrich_with_stat(entity, stat, target_slug, lang)
            item["rank"] = rank
            item["tier"] = tier
            leaderboard.append(item)

        return leaderboard

    def reset_session_votes(
        self, session_id: str, roster_slug: str | None = None
    ) -> dict[str, Any]:
        try:
            stmt = select(Vote).where(Vote.session_id == session_id)
            if roster_slug:
                roster = db.session.scalar(select(Roster).where(Roster.slug == roster_slug))
                if roster:
                    stmt = stmt.join(Entity, Vote.entity_id == Entity.id).where(Entity.roster_id == roster.id)
                else:
                    return {"status": "success", "reset_count": 0}

            votes = db.session.scalars(stmt).all()
            reset_count = len(votes)
            affected_entity_ids = {v.entity_id for v in votes}

            for vote in votes:
                db.session.delete(vote)

            db.session.flush()

            for eid in affected_entity_ids:
                self.recalculate_stat_for_entity(eid)

            db.session.commit()
            return {"status": "success", "reset_count": reset_count}
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error resetting session votes: {e}")
            raise e

    def reset_user_votes(
        self,
        user_id: int,
        roster_slug: str | None = None,
        edition: str | None = None,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        try:
            target_slug = roster_slug or edition
            conds = [Vote.user_id == user_id]
            if session_id:
                conds.append(Vote.session_id == session_id)

            stmt = select(Vote).where(or_(*conds))
            if target_slug:
                roster = db.session.scalar(select(Roster).where(Roster.slug == target_slug))
                if roster:
                    stmt = stmt.join(Entity, Vote.entity_id == Entity.id).where(Entity.roster_id == roster.id)
                else:
                    return {"status": "success", "reset_count": 0}

            votes = db.session.scalars(stmt).all()
            reset_count = len(votes)
            affected_entity_ids = {v.entity_id for v in votes}

            for vote in votes:
                db.session.delete(vote)

            db.session.flush()

            for eid in affected_entity_ids:
                self.recalculate_stat_for_entity(eid)

            db.session.commit()
            return {"status": "success", "reset_count": reset_count}
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error resetting user votes: {e}")
            raise e


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
            .where(
                Entity.roster_id == roster.id,
                Entity.is_active.is_(True),
            )
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
        return [_enrich_with_stat(e, e.stat, edition, lang) for e in entities]

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
        return _enrich_with_stat(entity, entity.stat, edition, lang)

    def get_user_votes(
        self,
        user_id: int | None = None,
        session_id: str | None = None,
        edition: str = "canon",
        lang: str | None = None,
    ) -> list[dict[str, Any]]:
        self.ensure_seeded()
        roster = db.session.scalar(select(Roster).where(Roster.slug == edition))
        if not roster:
            return []

        conditions = []
        if user_id is not None:
            conditions.append(Vote.user_id == user_id)
        if session_id is not None:
            conditions.append(Vote.session_id == session_id)

        if not conditions:
            return []

        stmt = (
            select(Vote, Entity)
            .join(Entity, Vote.entity_id == Entity.id)
            .where(or_(*conditions), Entity.roster_id == roster.id)
            .order_by(Vote.created_at.asc())
        )
        rows = db.session.execute(stmt).all()
        res = []
        for v, e in rows:
            vd = v.to_dict()
            vd["character_slug"] = e.slug
            vd["character_name"] = e.name
            vd["role"] = e.role
            vd["gender"] = e.gender
            vd["edition"] = edition
            vd["entity"] = e.to_dict(lang)
            res.append(vd)
        return res

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
                    media_type=e.get("media_type") or "image",
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
                    is_active=True,
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
        collapses to one hyphen), truncated to `max_len` and re-stripped so a
        cut mid-word never leaves a trailing hyphen."""
        slug = _SLUG_INVALID.sub("-", (text or "").strip().lower()).strip("-")
        slug = slug[:max_len].strip("-")
        return slug or fallback

    @staticmethod
    def _unique_roster_slug(base: str) -> str:
        """The first `base`, `base-2`, `base-3`... that is neither reserved
        nor already taken. A roster's slug is its stable public identity (the
        picker, the seed filename, any future deep link), so a collision here
        must never silently overwrite one."""
        candidate = base
        n = 2
        while candidate in RESERVED_ROSTER_SLUGS or db.session.scalar(
            select(Roster.id).where(Roster.slug == candidate)
        ):
            candidate = f"{base}-{n}"
            n += 1
        return candidate

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
                "media_type": e.media_type,
                "archetype": e.archetype,
            }
            for field in _ENTITY_PROFILE_TEXT_FIELDS:
                entity_dict[field] = getattr(e, field) or ""
            entity_dict["red_flags"] = list(e.red_flags or [])
            entity_dict["green_flags"] = list(e.green_flags or [])
            entity_dict["chapter"] = e.chapter
            entity_dict["danger_level"] = e.danger_level
            entity_dict["chaos_score"] = e.chaos_score
            entity_dict["translations"] = e.translations or {}
            entity_dict["order_index"] = e.order_index
            entity_dict["is_active"] = e.is_active
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
