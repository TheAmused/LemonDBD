# backend/app/services/others/smash_or_pass_service.py
import logging
from typing import Any
from sqlalchemy import case, delete, func, or_, select
from sqlalchemy.orm import joinedload
from app.core.extensions import db
from app.models.base import utcnow
from app.models.smash_or_pass import (
    Entity,
    EntityStat,
    Roster,
    Vote,
)
from app.seeds.smash_roster_seeder import seed_smash_rosters

logger = logging.getLogger(__name__)


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

    def get_rosters(self, active_only: bool = True) -> list[dict[str, Any]]:
        self.ensure_seeded()
        stmt = select(Roster)
        if active_only:
            stmt = stmt.where(Roster.is_active.is_(True))
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
            r_dict = r.to_dict()
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
        roster_info = roster.to_dict()
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
                    entity = db.session.scalar(select(Entity).where(Entity.slug == character_slug))

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
