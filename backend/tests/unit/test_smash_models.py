# backend/tests/unit/test_smash_models.py
import sqlite3
import pytest
from sqlalchemy.orm import Session
from app.models.smash_or_pass import (
    Entity,
    EntityStat,
    Roster,
    Vote,
)
from app.services.db.raw_schema import init_raw_sqlite_schema


@pytest.mark.unit
class TestSmashModels:
    """Tests for Smash or Pass models, UUID primary keys, calculations, and relational cascade deletes."""

    def test_create_roster_and_entity(self, db_session: Session) -> None:
        roster = Roster(
            slug="test_cyberpunk",
            name_i18n_key="smashOrPass.rosters.cyberpunk.name",
            description_i18n_key="smashOrPass.rosters.cyberpunk.desc",
            cover_image_url="https://example.com/cover.png",
            theme_color="#00f5d4",
            category="Cyberpunk",
            is_nsfw=False,
            is_active=True,
        )
        db_session.add(roster)
        db_session.commit()

        assert roster.id is not None
        assert len(roster.id) == 36
        assert roster.slug == "test_cyberpunk"
        assert roster.theme_color == "#00f5d4"

        entity = Entity(
            roster_id=roster.id,
            slug="cyber_trickster",
            name="Trickster 2077",
            role="Killer",
            gender="male",
            media_url="/images/roster/trickster.png",
            media_type="image",
            chaos_score=92,
            danger_level="Lethal",
            archetype="Neon Idol",
            order_index=1,
        )
        db_session.add(entity)
        db_session.commit()

        assert entity.id is not None
        assert len(entity.id) == 36
        assert entity.roster.slug == "test_cyberpunk"
        assert entity.chaos_score == 92
        assert entity.metadata_dict()["danger_level"] == "Lethal"
        assert len(roster.entities) == 1
        assert roster.entities[0].slug == "cyber_trickster"

        roster_dict = roster.to_dict()
        assert roster_dict["slug"] == "test_cyberpunk"
        assert roster_dict["name_i18n_key"] == "smashOrPass.rosters.cyberpunk.name"
        assert roster_dict["theme_color"] == "#00f5d4"

        entity_dict = entity.to_dict()
        assert entity_dict["slug"] == "cyber_trickster"
        assert entity_dict["metadata"]["chaos_score"] == 92
        assert entity_dict["role"] == "Killer"

    def test_entity_stat_calculations_and_relationships(self, db_session: Session) -> None:
        roster = Roster(
            slug="test_canon",
            name_i18n_key="smashOrPass.rosters.canon.name",
            description_i18n_key="smashOrPass.rosters.canon.desc",
        )
        db_session.add(roster)
        db_session.commit()

        entity = Entity(
            roster_id=roster.id,
            slug="feng_min",
            name="Feng Min",
            role="Survivor",
            gender="female",
        )
        db_session.add(entity)
        db_session.commit()

        stat = EntityStat(
            entity_id=entity.id,
            smash_count=40,
            pass_count=10,
            super_smash_count=10,
            chaos_rating=75.5,
        )
        db_session.add(stat)
        db_session.commit()
        db_session.refresh(stat)

        # `total_votes` and `smash_rate` are database-generated columns now --
        # there is no `calculate_rate()` to call, and no `id` to key on: the
        # entity is the primary key.
        assert stat.total_votes == 60
        assert stat.smash_rate == 83.3
        assert stat.entity.slug == "feng_min"
        assert entity.stat.smash_count == 40

        stat_dict = stat.to_dict()
        assert stat_dict["entity_id"] == entity.id
        assert stat_dict["smash_count"] == 40
        assert stat_dict["smash_rate"] == 83.3
        assert stat_dict["chaos_rating"] == 75.5

        zero_entity = Entity(
            roster_id=roster.id,
            slug="zero_votes_entity",
            name="Zero Votes",
        )
        db_session.add(zero_entity)
        db_session.commit()
        zero_stat = EntityStat(entity_id=zero_entity.id)
        db_session.add(zero_stat)
        db_session.commit()
        db_session.refresh(zero_stat)
        assert zero_stat.total_votes == 0
        assert zero_stat.smash_rate == 0.0

    def test_vote_model_and_relationship(self, db_session: Session) -> None:
        roster = Roster(
            slug="test_hooked",
            name_i18n_key="smashOrPass.rosters.hoy.name",
            description_i18n_key="smashOrPass.rosters.hoy.desc",
        )
        db_session.add(roster)
        db_session.commit()

        entity = Entity(
            roster_id=roster.id,
            slug="trapper_hoy",
            name="Trapper (Island)",
            role="Killer",
            gender="male",
        )
        db_session.add(entity)
        db_session.commit()

        vote = Vote(
            entity_id=entity.id,
            session_id="session_abc123",
            user_id=1,
            vote_type="super_smash",
        )
        db_session.add(vote)
        db_session.commit()

        assert vote.id is not None
        assert vote.entity.name == "Trapper (Island)"
        assert len(entity.votes) == 1
        assert entity.votes[0].vote_type == "super_smash"

        vote_dict = vote.to_dict()
        assert vote_dict["entity_id"] == entity.id
        assert vote_dict["session_id"] == "session_abc123"
        assert vote_dict["vote_type"] == "super_smash"
        assert vote_dict["user_id"] == 1

    def test_cascade_delete(self, db_session: Session) -> None:
        roster = Roster(
            slug="test_cascade",
            name_i18n_key="smashOrPass.rosters.cascade.name",
            description_i18n_key="smashOrPass.rosters.cascade.desc",
        )
        db_session.add(roster)
        db_session.commit()

        entity = Entity(
            roster_id=roster.id,
            slug="cascade_entity",
            name="Cascade Target",
        )
        db_session.add(entity)
        db_session.commit()

        stat = EntityStat(entity_id=entity.id, smash_count=5)
        vote = Vote(entity_id=entity.id, session_id="session_xyz", vote_type="smash")
        db_session.add_all([stat, vote])
        db_session.commit()

        entity_id = entity.id
        # `EntityStat` has no surrogate id any more -- `entity_id` is its
        # primary key, so that is what a post-delete lookup keys on too.
        stat_entity_id = stat.entity_id
        vote_id = vote.id

        db_session.delete(roster)
        db_session.commit()

        assert db_session.get(Entity, entity_id) is None
        assert db_session.get(EntityStat, stat_entity_id) is None
        assert db_session.get(Vote, vote_id) is None

    def test_raw_sqlite_schema_init(self) -> None:
        conn = sqlite3.connect(":memory:")
        init_raw_sqlite_schema(conn)

        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]

        assert "rosters" in tables
        assert "entities" in tables
        assert "entity_stats" in tables
        assert "votes" in tables
        assert "translations" not in tables
        assert "perk_rules" not in tables

        conn.close()
