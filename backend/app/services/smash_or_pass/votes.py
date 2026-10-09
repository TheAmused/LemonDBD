# backend/app/services/smash_or_pass/votes.py
"""Casting, syncing and resetting smash-or-pass votes, and the aggregate stats they feed."""
import logging
from typing import Any

from sqlalchemy import case, func, or_, select

from app.core.extensions import db
from app.models.base import utcnow
from app.models.smash_or_pass import Entity, EntityStat, Roster, Vote
from app.services.smash_or_pass.serialize import enrich_with_stat

logger = logging.getLogger(__name__)


class SmashVotesMixin:
    """Voting half of `SmashOrPassService`; relies on its `ensure_seeded`."""

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

            return enrich_with_stat(entity, stat, target_slug, lang)
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
