# backend/app/services/others/smash_or_pass_service.py
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from flask import current_app
from sqlalchemy import func, or_, select, delete
from app.core.extensions import db
from app.models.smash_or_pass import SmashPassStat, SmashPassVote

logger = logging.getLogger(__name__)

# Multi-Edition definitions
EDITIONS = [
    {
        "id": "canon",
        "name": "Dead by Daylight: Fog Canon",
        "description": "The complete 98-character roster of all official Killers and Survivors.",
        "icon": "Heart",
        "character_count": 98,
    },
    {
        "id": "hooked_on_you",
        "name": "Hooked on You: Island Romance",
        "description": "Tropical paradise dating sim edition with beach outfits and sunny vibes.",
        "icon": "Sparkles",
        "character_count": 8,
    },
    {
        "id": "legendary_cosplay",
        "name": "Legendary Skins & Collabs",
        "description": "Iconic legendary skins (Birkin, Hunk, James Sunderland, Cybil, Baba Yaga, Naughty Bear).",
        "icon": "Flame",
        "character_count": 12,
    },
]

# Canonical 98 characters initialized with clean 0-vote counts
CANON_ROSTER: List[Dict[str, Any]] = [
    # --- FEMALE SURVIVORS (28) ---
    {"slug": "ada_wong", "name": "Ada Wong", "role": "Survivor", "gender": "female"},
    {"slug": "sable_ward", "name": "Sable Ward", "role": "Survivor", "gender": "female"},
    {"slug": "feng_min", "name": "Feng Min", "role": "Survivor", "gender": "female"},
    {"slug": "kate_denson", "name": "Kate Denson", "role": "Survivor", "gender": "female"},
    {"slug": "mikaela_reid", "name": "Mikaela Reid", "role": "Survivor", "gender": "female"},
    {"slug": "jill_valentine", "name": "Jill Valentine", "role": "Survivor", "gender": "female"},
    {"slug": "lara_croft", "name": "Lara Croft", "role": "Survivor", "gender": "female"},
    {"slug": "rebecca_chambers", "name": "Rebecca Chambers", "role": "Survivor", "gender": "female"},
    {"slug": "jane_romero", "name": "Jane Romero", "role": "Survivor", "gender": "female"},
    {"slug": "yui_kimura", "name": "Yui Kimura", "role": "Survivor", "gender": "female"},
    {"slug": "zarina_kassir", "name": "Zarina Kassir", "role": "Survivor", "gender": "female"},
    {"slug": "thalita_lyra", "name": "Thalita Lyra", "role": "Survivor", "gender": "female"},
    {"slug": "cheryl_mason", "name": "Cheryl Mason", "role": "Survivor", "gender": "female"},
    {"slug": "nea_karlsson", "name": "Nea Karlsson", "role": "Survivor", "gender": "female"},
    {"slug": "meg_thomas", "name": "Meg Thomas", "role": "Survivor", "gender": "female"},
    {"slug": "claudette_morel", "name": "Claudette Morel", "role": "Survivor", "gender": "female"},
    {"slug": "laurie_strode", "name": "Laurie Strode", "role": "Survivor", "gender": "female"},
    {"slug": "nancy_wheeler", "name": "Nancy Wheeler", "role": "Survivor", "gender": "female"},
    {"slug": "lee_yun_jin", "name": "Yun-Jin Lee", "role": "Survivor", "gender": "female"},
    {"slug": "élodie_rakoto", "name": "Élodie Rakoto", "role": "Survivor", "gender": "female"},
    {"slug": "haddie_kaur", "name": "Haddie Kaur", "role": "Survivor", "gender": "female"},
    {"slug": "ellen_ripley", "name": "Ellen Ripley", "role": "Survivor", "gender": "female"},
    {"slug": "taurie_cain", "name": "Taurie Cain", "role": "Survivor", "gender": "female"},
    {"slug": "michonne_grimes", "name": "Michonne", "role": "Survivor", "gender": "female"},
    {"slug": "eleven", "name": "Eleven", "role": "Survivor", "gender": "female"},
    {"slug": "aurora_stardotter", "name": "Aurora", "role": "Survivor", "gender": "female"},
    {"slug": "vee_boonyasak", "name": "Vee Boonyasak", "role": "Survivor", "gender": "female"},
    {"slug": "orela_rose", "name": "Orela Rose", "role": "Survivor", "gender": "female"},

    # --- MALE SURVIVORS (26) ---
    {"slug": "leon_scott_kennedy", "name": "Leon S. Kennedy", "role": "Survivor", "gender": "male"},
    {"slug": "felix_richter", "name": "Felix Richter", "role": "Survivor", "gender": "male"},
    {"slug": "vittorio_toscano", "name": "Vittorio Toscano", "role": "Survivor", "gender": "male"},
    {"slug": "david_king", "name": "David King", "role": "Survivor", "gender": "male"},
    {"slug": "steve_harrington", "name": "Steve Harrington", "role": "Survivor", "gender": "male"},
    {"slug": "nicolas_cage", "name": "Nicolas Cage", "role": "Survivor", "gender": "male"},
    {"slug": "alan_wake", "name": "Alan Wake", "role": "Survivor", "gender": "male"},
    {"slug": "dwight_fairfield", "name": "Dwight Fairfield", "role": "Survivor", "gender": "male"},
    {"slug": "jake_park", "name": "Jake Park", "role": "Survivor", "gender": "male"},
    {"slug": "ace_visconti", "name": "Ace Visconti", "role": "Survivor", "gender": "male"},
    {"slug": "renato_lyra", "name": "Renato Lyra", "role": "Survivor", "gender": "male"},
    {"slug": "trevor_belmont", "name": "Trevor Belmont", "role": "Survivor", "gender": "male"},
    {"slug": "yoichi_asakawa", "name": "Yoichi Asakawa", "role": "Survivor", "gender": "male"},
    {"slug": "gabriel_soma", "name": "Gabriel Soma", "role": "Survivor", "gender": "male"},
    {"slug": "ash_williams", "name": "Ash Williams", "role": "Survivor", "gender": "male"},
    {"slug": "bill_overbeck", "name": "William 'Bill' Overbeck", "role": "Survivor", "gender": "male"},
    {"slug": "adam_francis", "name": "Adam Francis", "role": "Survivor", "gender": "male"},
    {"slug": "jeff_johansen", "name": "Jeff Johansen", "role": "Survivor", "gender": "male"},
    {"slug": "jonah_vasquez", "name": "Jonah Vasquez", "role": "Survivor", "gender": "male"},
    {"slug": "quentin_smith", "name": "Quentin Smith", "role": "Survivor", "gender": "male"},
    {"slug": "david_tapp", "name": "Detective Tapp", "role": "Survivor", "gender": "male"},
    {"slug": "rick_grimes", "name": "Rick Grimes", "role": "Survivor", "gender": "male"},
    {"slug": "dustin_henderson", "name": "Dustin Henderson", "role": "Survivor", "gender": "male"},
    {"slug": "kwon_tae_young", "name": "Tae-Young", "role": "Survivor", "gender": "male"},
    {"slug": "shane_wiigwaas", "name": "Shane", "role": "Survivor", "gender": "male"},
    {"slug": "the_troupe", "name": "The Troupe", "role": "Survivor", "gender": "monster_other"},

    # --- FEMALE KILLERS (12) ---
    {"slug": "the_huntress", "name": "The Huntress", "role": "Killer", "gender": "female"},
    {"slug": "the_spirit", "name": "The Spirit", "role": "Killer", "gender": "female"},
    {"slug": "the_skull_merchant", "name": "The Skull Merchant", "role": "Killer", "gender": "female"},
    {"slug": "the_pig", "name": "The Pig", "role": "Killer", "gender": "female"},
    {"slug": "the_plague", "name": "The Plague", "role": "Killer", "gender": "female"},
    {"slug": "the_artist", "name": "The Artist", "role": "Killer", "gender": "female"},
    {"slug": "the_nurse", "name": "The Nurse", "role": "Killer", "gender": "female"},
    {"slug": "the_onryō", "name": "The Onryō (Sadako)", "role": "Killer", "gender": "female"},
    {"slug": "the_hag", "name": "The Hag", "role": "Killer", "gender": "female"},
    {"slug": "the_houndmaster", "name": "The Houndmaster", "role": "Killer", "gender": "female"},
    {"slug": "the_krasue", "name": "The Krasue", "role": "Killer", "gender": "female"},
    {"slug": "the_twins", "name": "The Twins", "role": "Killer", "gender": "female"},

    # --- MALE KILLERS (26) ---
    {"slug": "the_trickster", "name": "The Trickster", "role": "Killer", "gender": "male"},
    {"slug": "the_ghost_face", "name": "The Ghost Face", "role": "Killer", "gender": "male"},
    {"slug": "the_executioner", "name": "Pyramid Head", "role": "Killer", "gender": "male"},
    {"slug": "the_mastermind", "name": "Albert Wesker", "role": "Killer", "gender": "male"},
    {"slug": "the_shape", "name": "The Shape (Michael Myers)", "role": "Killer", "gender": "male"},
    {"slug": "the_dark_lord", "name": "Dracula", "role": "Killer", "gender": "male"},
    {"slug": "the_legion", "name": "The Legion", "role": "Killer", "gender": "male"},
    {"slug": "the_trapper", "name": "The Trapper", "role": "Killer", "gender": "male"},
    {"slug": "the_wraith", "name": "The Wraith", "role": "Killer", "gender": "male"},
    {"slug": "the_deathslinger", "name": "The Deathslinger", "role": "Killer", "gender": "male"},
    {"slug": "the_oni", "name": "The Oni", "role": "Killer", "gender": "male"},
    {"slug": "the_knight", "name": "The Knight", "role": "Killer", "gender": "male"},
    {"slug": "the_lich", "name": "Vecna", "role": "Killer", "gender": "male"},
    {"slug": "the_hillbilly", "name": "The Hillbilly", "role": "Killer", "gender": "male"},
    {"slug": "the_doctor", "name": "The Doctor", "role": "Killer", "gender": "male"},
    {"slug": "the_blight", "name": "The Blight", "role": "Killer", "gender": "male"},
    {"slug": "the_cannibal", "name": "Leatherface", "role": "Killer", "gender": "male"},
    {"slug": "the_clown", "name": "The Clown", "role": "Killer", "gender": "male"},
    {"slug": "the_nemesis", "name": "Nemesis", "role": "Killer", "gender": "male"},
    {"slug": "the_nightmare", "name": "Freddy Krueger", "role": "Killer", "gender": "male"},
    {"slug": "the_cenobite", "name": "Pinhead", "role": "Killer", "gender": "male"},
    {"slug": "the_good_guy", "name": "Chucky", "role": "Killer", "gender": "male"},
    {"slug": "the_slasher", "name": "The Slasher", "role": "Killer", "gender": "male"},
    {"slug": "the_first", "name": "The First", "role": "Killer", "gender": "male"},
    {"slug": "the_ghoul", "name": "The Ghoul", "role": "Killer", "gender": "male"},
    {"slug": "the_judgment", "name": "The Judgment", "role": "Killer", "gender": "male"},

    # --- MONSTERS & ELDRITCH (6) ---
    {"slug": "the_xenomorph", "name": "The Xenomorph", "role": "Killer", "gender": "monster_other"},
    {"slug": "the_demogorgon", "name": "The Demogorgon", "role": "Killer", "gender": "monster_other"},
    {"slug": "the_unknown", "name": "The Unknown", "role": "Killer", "gender": "monster_other"},
    {"slug": "the_dredge", "name": "The Dredge", "role": "Killer", "gender": "monster_other"},
    {"slug": "the_singularity", "name": "The Singularity", "role": "Killer", "gender": "monster_other"},
    {"slug": "the_animatronic", "name": "Springtrap", "role": "Killer", "gender": "monster_other"},
]

# Additional Editions
HOOKED_ON_YOU_ROSTER: List[Dict[str, Any]] = [
    {"slug": "the_trapper_hoy", "name": "Trapper (Island)", "role": "Killer", "gender": "male"},
    {"slug": "the_huntress_hoy", "name": "Huntress (Bikini)", "role": "Killer", "gender": "female"},
    {"slug": "the_spirit_hoy", "name": "Spirit (Resort)", "role": "Killer", "gender": "female"},
    {"slug": "the_wraith_hoy", "name": "Wraith (Beach)", "role": "Killer", "gender": "male"},
    {"slug": "claudette_morel_hoy", "name": "Claudette (Island)", "role": "Survivor", "gender": "female"},
    {"slug": "dwight_fairfield_hoy", "name": "Dwight (Lifeguard)", "role": "Survivor", "gender": "male"},
    {"slug": "the_trickster_hoy", "name": "Trickster (Summer)", "role": "Killer", "gender": "male"},
    {"slug": "the_ocean_hoy", "name": "The Entity (Ocean)", "role": "Killer", "gender": "monster_other"},
]

LEGENDARY_ROSTER: List[Dict[str, Any]] = [
    {"slug": "william_birkin", "name": "William Birkin", "role": "Killer", "gender": "monster_other"},
    {"slug": "hunk", "name": "HUNK (Grim Reaper)", "role": "Killer", "gender": "male"},
    {"slug": "james_sunderland", "name": "James Sunderland", "role": "Survivor", "gender": "male"},
    {"slug": "maria", "name": "Maria", "role": "Survivor", "gender": "female"},
    {"slug": "cybil_bennett", "name": "Cybil Bennett", "role": "Survivor", "gender": "female"},
    {"slug": "lisa_garland", "name": "Lisa Garland", "role": "Survivor", "gender": "female"},
    {"slug": "naughty_bear", "name": "Naughty Bear", "role": "Killer", "gender": "monster_other"},
    {"slug": "baba_yaga", "name": "Baba Yaga", "role": "Killer", "gender": "female"},
    {"slug": "the_look_see", "name": "The Look-See", "role": "Killer", "gender": "monster_other"},
    {"slug": "minotaur", "name": "The Minotaur", "role": "Killer", "gender": "monster_other"},
    {"slug": "tiffany_valentine", "name": "Tiffany Valentine", "role": "Killer", "gender": "female"},
    {"slug": "chatterer", "name": "Chatterer Cenobite", "role": "Killer", "gender": "monster_other"},
]


class SmashOrPassService:
    """Service handling Smash or Pass voting, user persistence, and clean leaderboards."""

    def __init__(self):
        pass

    def ensure_seeded(self):
        """Seed clean 0-vote baseline records for all character editions if missing."""
        try:
            # Seed Canon
            for item in CANON_ROSTER:
                stat = db.session.scalar(
                    select(SmashPassStat).where(
                        SmashPassStat.character_slug == item["slug"],
                        SmashPassStat.edition == "canon",
                    )
                )
                if not stat:
                    db.session.add(
                        SmashPassStat(
                            character_slug=item["slug"],
                            character_name=item["name"],
                            role=item["role"],
                            gender=item["gender"],
                            edition="canon",
                            smash_count=0,
                            pass_count=0,
                            super_smash_count=0,
                            total_votes=0,
                            smash_rate=0.0,
                        )
                    )

            # Seed Hooked on You
            for item in HOOKED_ON_YOU_ROSTER:
                stat = db.session.scalar(
                    select(SmashPassStat).where(
                        SmashPassStat.character_slug == item["slug"],
                        SmashPassStat.edition == "hooked_on_you",
                    )
                )
                if not stat:
                    db.session.add(
                        SmashPassStat(
                            character_slug=item["slug"],
                            character_name=item["name"],
                            role=item["role"],
                            gender=item["gender"],
                            edition="hooked_on_you",
                            smash_count=0,
                            pass_count=0,
                            super_smash_count=0,
                            total_votes=0,
                            smash_rate=0.0,
                        )
                    )

            # Seed Legendary Skins
            for item in LEGENDARY_ROSTER:
                stat = db.session.scalar(
                    select(SmashPassStat).where(
                        SmashPassStat.character_slug == item["slug"],
                        SmashPassStat.edition == "legendary_cosplay",
                    )
                )
                if not stat:
                    db.session.add(
                        SmashPassStat(
                            character_slug=item["slug"],
                            character_name=item["name"],
                            role=item["role"],
                            gender=item["gender"],
                            edition="legendary_cosplay",
                            smash_count=0,
                            pass_count=0,
                            super_smash_count=0,
                            total_votes=0,
                            smash_rate=0.0,
                        )
                    )

            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.debug(f"Smash-or-pass seed notice: {e}")

    def get_editions(self) -> List[Dict[str, Any]]:
        """Return available editions."""
        return EDITIONS

    def get_characters_with_stats(
        self,
        edition: str = "canon",
        role: Optional[str] = None,
        gender: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve characters for an edition with live community stats."""
        self.ensure_seeded()
        stmt = select(SmashPassStat).where(SmashPassStat.edition == edition)

        if role and role != "all":
            stmt = stmt.where(SmashPassStat.role == role)
        if gender and gender != "all":
            stmt = stmt.where(SmashPassStat.gender == gender)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    SmashPassStat.character_name.ilike(pattern),
                    SmashPassStat.character_slug.ilike(pattern),
                )
            )

        stats = db.session.scalars(stmt).all()
        return [s.to_dict() for s in stats]

    def get_character_stat(self, character_slug: str, edition: str = "canon") -> Optional[Dict[str, Any]]:
        """Retrieve stat for a single character."""
        self.ensure_seeded()
        stat = db.session.scalar(
            select(SmashPassStat).where(
                SmashPassStat.character_slug == character_slug,
                SmashPassStat.edition == edition,
            )
        )
        return stat.to_dict() if stat else None

    def cast_vote(
        self,
        character_slug: str,
        vote_type: str,
        edition: str = "canon",
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Cast a vote. Only logged-in users (with valid user_id) count towards the community leaderboard.
        If user already voted on this character, it updates their previous vote to prevent double counting.
        """
        self.ensure_seeded()
        valid_votes = {"smash", "pass", "super_smash"}
        if vote_type not in valid_votes:
            raise ValueError(f"Invalid vote_type '{vote_type}'. Must be one of {valid_votes}")

        try:
            stat = db.session.scalar(
                select(SmashPassStat).where(
                    SmashPassStat.character_slug == character_slug,
                    SmashPassStat.edition == edition,
                )
            )

            if not stat:
                stat = SmashPassStat(
                    character_slug=character_slug,
                    character_name=character_slug.replace("_", " ").title(),
                    edition=edition,
                    smash_count=0,
                    pass_count=0,
                    super_smash_count=0,
                    total_votes=0,
                    smash_rate=0.0,
                )
                db.session.add(stat)

            # ONLY LOGGED-IN USERS (user_id is not None) COUNT TOWARDS COMMUNITY LEADERBOARD
            if user_id is not None:
                # Check for existing vote by this user on this character
                existing_vote = db.session.scalar(
                    select(SmashPassVote).where(
                        SmashPassVote.user_id == user_id,
                        SmashPassVote.character_slug == character_slug,
                        SmashPassVote.edition == edition,
                    )
                )

                if existing_vote:
                    # Unwind previous vote count
                    if existing_vote.vote_type == "smash":
                        stat.smash_count = max(0, stat.smash_count - 1)
                    elif existing_vote.vote_type == "pass":
                        stat.pass_count = max(0, stat.pass_count - 1)
                    elif existing_vote.vote_type == "super_smash":
                        stat.super_smash_count = max(0, stat.super_smash_count - 1)

                    # Update vote
                    existing_vote.vote_type = vote_type
                    existing_vote.created_at = datetime.utcnow()
                else:
                    # Insert new vote record
                    new_vote = SmashPassVote(
                        character_slug=character_slug,
                        vote_type=vote_type,
                        edition=edition,
                        user_id=user_id,
                        session_id=session_id,
                    )
                    db.session.add(new_vote)

                # Add new vote to community stat
                if vote_type == "smash":
                    stat.smash_count += 1
                elif vote_type == "pass":
                    stat.pass_count += 1
                elif vote_type == "super_smash":
                    stat.super_smash_count += 1

                stat.calculate_rate()
                db.session.commit()
            else:
                # Anonymous play: return stat without modifying community leaderboard
                db.session.rollback()

            return stat.to_dict()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error recording smash-or-pass vote: {e}")
            raise e

    def get_user_votes(self, user_id: int, edition: str = "canon") -> List[Dict[str, Any]]:
        """Retrieve all votes cast by a specific user in an edition (used for no-repeat filtering)."""
        stmt = select(SmashPassVote).where(
            SmashPassVote.user_id == user_id,
            SmashPassVote.edition == edition,
        )
        votes = db.session.scalars(stmt).all()
        return [v.to_dict() for v in votes]

    def reset_user_votes(self, user_id: int, edition: Optional[str] = None) -> Dict[str, Any]:
        """
        Reset and unwind all votes for a specific user, recalculating community leaderboard stats.
        """
        try:
            stmt = select(SmashPassVote).where(SmashPassVote.user_id == user_id)
            if edition:
                stmt = stmt.where(SmashPassVote.edition == edition)

            user_votes = db.session.scalars(stmt).all()
            reset_count = len(user_votes)

            # Unwind from community statistics
            for vote in user_votes:
                stat = db.session.scalar(
                    select(SmashPassStat).where(
                        SmashPassStat.character_slug == vote.character_slug,
                        SmashPassStat.edition == vote.edition,
                    )
                )
                if stat:
                    if vote.vote_type == "smash":
                        stat.smash_count = max(0, stat.smash_count - 1)
                    elif vote.vote_type == "pass":
                        stat.pass_count = max(0, stat.pass_count - 1)
                    elif vote.vote_type == "super_smash":
                        stat.super_smash_count = max(0, stat.super_smash_count - 1)
                    stat.calculate_rate()

            # Delete the user's vote rows
            del_stmt = delete(SmashPassVote).where(SmashPassVote.user_id == user_id)
            if edition:
                del_stmt = del_stmt.where(SmashPassVote.edition == edition)
            db.session.execute(del_stmt)

            db.session.commit()
            return {"status": "success", "reset_count": reset_count}
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error resetting user votes for user {user_id}: {e}")
            raise e

    def get_leaderboard(
        self,
        edition: str = "canon",
        role: Optional[str] = None,
        gender: Optional[str] = None,
        sort_by: str = "smash_rate",
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Retrieve ranked leaderboard sorted by smash rate or vote volume."""
        self.ensure_seeded()
        stmt = select(SmashPassStat).where(SmashPassStat.edition == edition)

        if role and role != "all":
            stmt = stmt.where(SmashPassStat.role == role)
        if gender and gender != "all":
            stmt = stmt.where(SmashPassStat.gender == gender)

        if sort_by == "total_votes":
            stmt = stmt.order_by(SmashPassStat.total_votes.desc())
        elif sort_by == "smash_count":
            stmt = stmt.order_by(
                (SmashPassStat.smash_count + SmashPassStat.super_smash_count).desc()
            )
        else:
            stmt = stmt.order_by(
                SmashPassStat.smash_rate.desc(), SmashPassStat.total_votes.desc()
            )

        stmt = stmt.limit(limit)
        stats = db.session.scalars(stmt).all()
        return [s.to_dict() for s in stats]

    def reset_stats(self) -> Dict[str, Any]:
        """Admin reset: wipe all votes and reset stats to 0."""
        try:
            db.session.execute(delete(SmashPassVote))
            db.session.execute(delete(SmashPassStat))
            db.session.commit()
            self.ensure_seeded()
            return {"status": "reset_complete", "message": "All smash-or-pass stats reset to 0"}
        except Exception as e:
            db.session.rollback()
            raise e
