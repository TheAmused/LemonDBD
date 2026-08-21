# backend/app/services/others/smash_or_pass_service.py
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import joinedload
from app.core.extensions import db
from app.models.base import utcnow
from app.models.smash_or_pass import (
    Entity,
    EntityStat,
    Roster,
    SmashPassStat,
    SmashPassVote,
    Translation,
    Vote,
)
from app.seeds.smash_roster_seeder import seed_smash_rosters

logger = logging.getLogger(__name__)

# Multi-Edition / Roster definitions for legacy compatibility
EDITIONS = [
    {
        "id": "canon",
        "slug": "canon",
        "name": "Dead by Daylight: Fog Canon",
        "description": "The complete 98-character roster of all official Killers and Survivors.",
        "icon": "Heart",
        "character_count": 98,
    },
    {
        "id": "hooked_on_you",
        "slug": "hooked_on_you",
        "name": "Hooked on You: Island Romance",
        "description": "Tropical paradise dating sim edition with beach outfits and sunny vibes.",
        "icon": "Sparkles",
        "character_count": 8,
    },
    {
        "id": "legendary_cosplay",
        "slug": "legendary_cosplay",
        "name": "Legendary Skins & Collabs",
        "description": "Iconic legendary skins and crossover collabs from gaming history.",
        "icon": "Flame",
        "character_count": 12,
    },
    {
        "id": "cyberpunk_2077",
        "slug": "cyberpunk_2077",
        "name": "Cyberpunk Fog 2077 Edition",
        "description": "High-tech neon augmented champions fighting in a dystopian fog.",
        "icon": "Cpu",
        "character_count": 10,
    },
    {
        "id": "anime_manga",
        "slug": "anime_manga",
        "name": "Fog Anime / Manga Aesthetic",
        "description": "Stylized anime aesthetic adaptations of your favorite Fog characters.",
        "icon": "Sparkle",
        "character_count": 10,
    },
    {
        "id": "gothic_eldritch",
        "slug": "gothic_eldritch",
        "name": "Victorian & Gothic Eldritch Legends",
        "description": "Dark fantasy, Bloodborne aesthetics, and Victorian eldritch horrors.",
        "icon": "Skull",
        "character_count": 10,
    },
]


class SmashOrPassService:
    """Service handling multi-roster Smash or Pass voting, feed generation, user persistence, and leaderboards."""

    def __init__(self):
        pass

    def ensure_seeded(self) -> None:
        """Seed baseline rosters, characters, stats, and translations if missing."""
        try:
            count = db.session.scalar(select(func.count(Roster.id)))
            if not count or count == 0:
                seed_smash_rosters()
        except Exception as e:
            logger.debug(f"Smash-or-pass seed notice: {e}")

    def get_rosters(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Retrieve all available rosters with live entity counts and total votes."""
        self.ensure_seeded()
        stmt = select(Roster)
        if active_only:
            stmt = stmt.where(Roster.is_active.is_(True))
        stmt = stmt.order_by(Roster.slug)
        rosters = db.session.scalars(stmt).all()

        result = []
        for r in rosters:
            entity_count = (
                db.session.scalar(
                    select(func.count(Entity.id)).where(
                        Entity.roster_id == r.id,
                        Entity.is_active.is_(True),
                    )
                )
                or 0
            )

            total_votes = (
                db.session.scalar(
                    select(func.coalesce(func.sum(EntityStat.total_votes), 0))
                    .select_from(Entity)
                    .join(EntityStat, Entity.id == EntityStat.entity_id)
                    .where(
                        Entity.roster_id == r.id,
                        Entity.is_active.is_(True),
                    )
                )
                or 0
            )

            r_dict = r.to_dict()
            r_dict["entity_count"] = entity_count
            r_dict["character_count"] = entity_count  # legacy compatibility
            r_dict["total_votes"] = int(total_votes)
            result.append(r_dict)
        return result

    def get_feed(
        self,
        roster_slug: str = "canon",
        session_id: Optional[str] = None,
        user_id: Optional[int] = None,
        role: Optional[str] = None,
        gender: Optional[str] = None,
        limit: int = 50,
    ) -> Optional[Dict[str, Any]]:
        """Retrieve feed of unvoted entities, roster info, and total remaining count."""
        self.ensure_seeded()
        roster = db.session.scalar(select(Roster).where(Roster.slug == roster_slug))
        if not roster:
            return None

        roster_info = next(
            (r for r in self.get_rosters(active_only=False) if r["slug"] == roster_slug),
            roster.to_dict(),
        )

        # Identify entities already voted on by this user or session
        voted_conditions = []
        if user_id is not None:
            voted_conditions.append(Vote.user_id == user_id)
        if session_id is not None:
            voted_conditions.append(Vote.session_id == session_id)

        voted_entity_ids = []
        if voted_conditions:
            voted_stmt = select(Vote.entity_id).where(or_(*voted_conditions))
            voted_entity_ids = db.session.scalars(voted_stmt).all()

        # Calculate total remaining count
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

        # Query feed entities
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
            "entities": [e.to_dict() for e in entities],
            "total_remaining": int(total_remaining),
        }

    def cast_vote(
        self,
        entity_id: Optional[str] = None,
        character_slug: Optional[str] = None,
        vote_type: str = "smash",
        session_id: Optional[str] = None,
        user_id: Optional[int] = None,
        roster_slug: Optional[str] = None,
        edition: str = "canon",
    ) -> Dict[str, Any]:
        """
        Cast a vote (smash, pass, super_smash) on an entity.
        Supports both entity_id and legacy character_slug with edition/roster_slug.
        Atomically updates EntityStat and Vote records, and synchronizes legacy stats.
        """
        self.ensure_seeded()
        valid_votes = {"smash", "pass", "super_smash"}
        if vote_type not in valid_votes:
            raise ValueError(
                f"Invalid vote_type '{vote_type}'. Must be one of {valid_votes}"
            )

        try:
            target_slug = roster_slug or edition
            entity: Optional[Entity] = None
            if entity_id:
                entity = db.session.get(Entity, entity_id)
            elif character_slug:
                roster = db.session.scalar(
                    select(Roster).where(Roster.slug == target_slug)
                )
                if roster:
                    entity = db.session.scalar(
                        select(Entity).where(
                            Entity.roster_id == roster.id,
                            Entity.slug == character_slug,
                        )
                    )
                if not entity:
                    entity = db.session.scalar(
                        select(Entity).where(Entity.slug == character_slug)
                    )

            if not entity:
                raise ValueError(
                    f"Entity not found for entity_id='{entity_id}' or character_slug='{character_slug}'"
                )

            # Get or create EntityStat
            stat = db.session.scalar(
                select(EntityStat).where(EntityStat.entity_id == entity.id)
            )
            if not stat:
                chaos = float(entity.get_metadata().get("chaos_score", 50.0))
                stat = EntityStat(
                    entity_id=entity.id,
                    smash_count=0,
                    pass_count=0,
                    super_smash_count=0,
                    total_votes=0,
                    smash_rate=0.0,
                    chaos_rating=chaos,
                )
                db.session.add(stat)
                db.session.flush()

            # Check existing vote
            existing_vote = None
            user_sess_conds = []
            if user_id is not None:
                user_sess_conds.append(Vote.user_id == user_id)
            if session_id is not None:
                user_sess_conds.append(Vote.session_id == session_id)

            if user_sess_conds:
                existing_vote = db.session.scalar(
                    select(Vote).where(
                        Vote.entity_id == entity.id,
                        or_(*user_sess_conds),
                    )
                )

            prev_vote_type = None
            if existing_vote:
                prev_vote_type = existing_vote.vote_type
                # Unwind previous vote count
                if prev_vote_type == "smash":
                    stat.smash_count = max(0, stat.smash_count - 1)
                elif prev_vote_type == "pass":
                    stat.pass_count = max(0, stat.pass_count - 1)
                elif prev_vote_type == "super_smash":
                    stat.super_smash_count = max(0, stat.super_smash_count - 1)

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

            # Apply new vote
            if vote_type == "smash":
                stat.smash_count += 1
            elif vote_type == "pass":
                stat.pass_count += 1
            elif vote_type == "super_smash":
                stat.super_smash_count += 1

            stat.calculate_rate()

            # Synchronize legacy SmashPassStat
            try:
                leg_stat = db.session.scalar(
                    select(SmashPassStat).where(
                        SmashPassStat.character_slug == entity.slug,
                        SmashPassStat.edition == target_slug,
                    )
                )
                if leg_stat:
                    if prev_vote_type:
                        if prev_vote_type == "smash":
                            leg_stat.smash_count = max(0, leg_stat.smash_count - 1)
                        elif prev_vote_type == "pass":
                            leg_stat.pass_count = max(0, leg_stat.pass_count - 1)
                        elif prev_vote_type == "super_smash":
                            leg_stat.super_smash_count = max(
                                0, leg_stat.super_smash_count - 1
                            )

                    if vote_type == "smash":
                        leg_stat.smash_count += 1
                    elif vote_type == "pass":
                        leg_stat.pass_count += 1
                    elif vote_type == "super_smash":
                        leg_stat.super_smash_count += 1
                    leg_stat.calculate_rate()
            except Exception:
                pass

            db.session.commit()
            db.session.refresh(entity)
            db.session.refresh(stat)

            res = entity.to_dict()
            res["character_slug"] = entity.slug
            res["character_name"] = entity.name
            res["edition"] = target_slug
            res["smash_count"] = stat.smash_count
            res["pass_count"] = stat.pass_count
            res["super_smash_count"] = stat.super_smash_count
            res["total_votes"] = stat.total_votes
            res["smash_rate"] = stat.smash_rate
            res["chaos_rating"] = stat.chaos_rating
            return res
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error recording smash-or-pass vote: {e}")
            raise e

    def get_leaderboard(
        self,
        roster_slug: str = "canon",
        role: Optional[str] = None,
        gender: Optional[str] = None,
        sort_by: str = "smash_rate",
        limit: int = 100,
        edition: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve ranked entities with assigned tiers (God Tier, Fatal Attraction, Friendzone, Eldritch Void)."""
        self.ensure_seeded()
        target_slug = roster_slug or edition or "canon"
        roster = db.session.scalar(select(Roster).where(Roster.slug == target_slug))
        if not roster:
            return []

        stmt = (
            select(Entity, EntityStat)
            .join(EntityStat, Entity.id == EntityStat.entity_id)
            .where(
                Entity.roster_id == roster.id,
                Entity.is_active.is_(True),
            )
        )

        if role and role != "all":
            stmt = stmt.where(Entity.role == role)
        if gender and gender != "all":
            stmt = stmt.where(Entity.gender == gender)

        if sort_by == "total_votes":
            stmt = stmt.order_by(
                EntityStat.total_votes.desc(),
                EntityStat.smash_rate.desc(),
            )
        elif sort_by == "smash_count":
            stmt = stmt.order_by(
                (EntityStat.smash_count + EntityStat.super_smash_count).desc(),
                EntityStat.smash_rate.desc(),
            )
        elif sort_by == "chaos_rating":
            stmt = stmt.order_by(
                EntityStat.chaos_rating.desc(),
                EntityStat.smash_rate.desc(),
            )
        else:  # smash_rate
            stmt = stmt.order_by(
                EntityStat.smash_rate.desc(),
                EntityStat.total_votes.desc(),
            )

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

            item = entity.to_dict()
            item["rank"] = rank
            item["tier"] = tier
            item["character_slug"] = entity.slug
            item["character_name"] = entity.name
            item["edition"] = target_slug
            item["smash_count"] = stat.smash_count
            item["pass_count"] = stat.pass_count
            item["super_smash_count"] = stat.super_smash_count
            item["total_votes"] = stat.total_votes
            item["smash_rate"] = stat.smash_rate
            item["chaos_rating"] = stat.chaos_rating
            leaderboard.append(item)

        return leaderboard

    def reset_session_votes(
        self, session_id: str, roster_slug: Optional[str] = None
    ) -> Dict[str, Any]:
        """Unwind votes cast in a session and remove them from the database."""
        try:
            stmt = select(Vote).where(Vote.session_id == session_id)
            if roster_slug:
                roster = db.session.scalar(
                    select(Roster).where(Roster.slug == roster_slug)
                )
                if roster:
                    stmt = stmt.join(Entity, Vote.entity_id == Entity.id).where(
                        Entity.roster_id == roster.id
                    )
                else:
                    return {"status": "success", "reset_count": 0}

            votes = db.session.scalars(stmt).all()
            reset_count = len(votes)

            for vote in votes:
                stat = db.session.scalar(
                    select(EntityStat).where(EntityStat.entity_id == vote.entity_id)
                )
                if stat:
                    if vote.vote_type == "smash":
                        stat.smash_count = max(0, stat.smash_count - 1)
                    elif vote.vote_type == "pass":
                        stat.pass_count = max(0, stat.pass_count - 1)
                    elif vote.vote_type == "super_smash":
                        stat.super_smash_count = max(0, stat.super_smash_count - 1)
                    stat.calculate_rate()

                db.session.delete(vote)

            db.session.commit()
            return {"status": "success", "reset_count": reset_count}
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error resetting session votes: {e}")
            raise e

    def reset_user_votes(
        self,
        user_id: int,
        roster_slug: Optional[str] = None,
        edition: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Unwind votes cast by a user and delete them from the database."""
        try:
            target_slug = roster_slug or edition
            stmt = select(Vote).where(Vote.user_id == user_id)
            if target_slug:
                roster = db.session.scalar(
                    select(Roster).where(Roster.slug == target_slug)
                )
                if roster:
                    stmt = stmt.join(Entity, Vote.entity_id == Entity.id).where(
                        Entity.roster_id == roster.id
                    )
                else:
                    return {"status": "success", "reset_count": 0}

            votes = db.session.scalars(stmt).all()
            reset_count = len(votes)

            for vote in votes:
                stat = db.session.scalar(
                    select(EntityStat).where(EntityStat.entity_id == vote.entity_id)
                )
                if stat:
                    if vote.vote_type == "smash":
                        stat.smash_count = max(0, stat.smash_count - 1)
                    elif vote.vote_type == "pass":
                        stat.pass_count = max(0, stat.pass_count - 1)
                    elif vote.vote_type == "super_smash":
                        stat.super_smash_count = max(0, stat.super_smash_count - 1)
                    stat.calculate_rate()

                db.session.delete(vote)

            # Legacy cleanup
            try:
                leg_stmt = select(SmashPassVote).where(SmashPassVote.user_id == user_id)
                if target_slug:
                    leg_stmt = leg_stmt.where(SmashPassVote.edition == target_slug)
                leg_votes = db.session.scalars(leg_stmt).all()
                for lv in leg_votes:
                    ls = db.session.scalar(
                        select(SmashPassStat).where(
                            SmashPassStat.character_slug == lv.character_slug,
                            SmashPassStat.edition == lv.edition,
                        )
                    )
                    if ls:
                        if lv.vote_type == "smash":
                            ls.smash_count = max(0, ls.smash_count - 1)
                        elif lv.vote_type == "pass":
                            ls.pass_count = max(0, ls.pass_count - 1)
                        elif lv.vote_type == "super_smash":
                            ls.super_smash_count = max(0, ls.super_smash_count - 1)
                        ls.calculate_rate()
                    db.session.delete(lv)
            except Exception:
                pass

            db.session.commit()
            return {"status": "success", "reset_count": reset_count}
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error resetting user votes: {e}")
            raise e

    def get_translations(self, locale: str = "en") -> Dict[str, str]:
        """Retrieve key-value translations dictionary for a given locale."""
        self.ensure_seeded()
        stmt = select(Translation).where(Translation.locale == locale)
        trans = db.session.scalars(stmt).all()
        if not trans and locale != "en":
            stmt_en = select(Translation).where(Translation.locale == "en")
            trans = db.session.scalars(stmt_en).all()
        return {t.key: t.value for t in trans}

    def get_editions(self) -> List[Dict[str, Any]]:
        """Return available editions (legacy method mapping to rosters)."""
        return self.get_rosters(active_only=True)

    def get_characters_with_stats(
        self,
        edition: str = "canon",
        role: Optional[str] = None,
        gender: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve characters for an edition with live community stats."""
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
            stmt = stmt.where(
                or_(
                    Entity.name.ilike(pattern),
                    Entity.slug.ilike(pattern),
                )
            )

        stmt = stmt.order_by(Entity.order_index)
        entities = db.session.scalars(stmt).all()
        result = []
        for e in entities:
            d = e.to_dict()
            stat = e.stat
            d["character_slug"] = e.slug
            d["character_name"] = e.name
            d["edition"] = edition
            d["smash_count"] = stat.smash_count if stat else 0
            d["pass_count"] = stat.pass_count if stat else 0
            d["super_smash_count"] = stat.super_smash_count if stat else 0
            d["total_votes"] = stat.total_votes if stat else 0
            d["smash_rate"] = stat.smash_rate if stat else 0.0
            d["chaos_rating"] = stat.chaos_rating if stat else 50.0
            result.append(d)
        return result

    def get_character_stat(
        self, character_slug: str, edition: str = "canon"
    ) -> Optional[Dict[str, Any]]:
        """Retrieve stat for a single character."""
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
        d = entity.to_dict()
        stat = entity.stat
        d["character_slug"] = entity.slug
        d["character_name"] = entity.name
        d["edition"] = edition
        d["smash_count"] = stat.smash_count
        d["pass_count"] = stat.pass_count
        d["super_smash_count"] = stat.super_smash_count
        d["total_votes"] = stat.total_votes
        d["smash_rate"] = stat.smash_rate
        d["chaos_rating"] = stat.chaos_rating
        return d

    def get_user_votes(
        self, user_id: int, edition: str = "canon"
    ) -> List[Dict[str, Any]]:
        """Retrieve all votes cast by a specific user in an edition."""
        self.ensure_seeded()
        roster = db.session.scalar(select(Roster).where(Roster.slug == edition))
        if not roster:
            return []
        stmt = (
            select(Vote, Entity)
            .join(Entity, Vote.entity_id == Entity.id)
            .where(Vote.user_id == user_id, Entity.roster_id == roster.id)
        )
        rows = db.session.execute(stmt).all()
        res = []
        for v, e in rows:
            vd = v.to_dict()
            vd["character_slug"] = e.slug
            vd["edition"] = edition
            res.append(vd)
        return res

    def reset_stats(self) -> Dict[str, Any]:
        """Admin reset: wipe all votes and reset stats to 0."""
        try:
            db.session.execute(delete(Vote))
            db.session.execute(delete(EntityStat))
            db.session.execute(delete(SmashPassVote))
            db.session.execute(delete(SmashPassStat))
            db.session.commit()
            seed_smash_rosters()
            return {
                "status": "reset_complete",
                "message": "All smash-or-pass stats reset to 0",
            }
        except Exception as e:
            db.session.rollback()
            raise e
