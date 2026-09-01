# backend/tests/unit/test_smash_seeder_service.py
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.models.smash_or_pass import (
    Entity,
    EntityStat,
    Roster,
    SmashPassStat,
    Translation,
)
from app.seeds.smash_roster_seeder import seed_smash_rosters
from app.services.others.smash_or_pass_service import SmashOrPassService


@pytest.mark.unit
class TestSmashSeederService:
    """Tests for database seeding, entity counts, dynamic feed filtering, and vote mutations."""

    def test_seed_smash_rosters_creates_all_rosters_entities_and_stats(
        self, db_session: Session
    ) -> None:
        seed_smash_rosters()

        rosters = db_session.scalars(select(Roster)).all()
        assert len(rosters) == 6
        roster_slugs = {r.slug for r in rosters}
        assert roster_slugs == {
            "canon",
            "hooked_on_you",
            "legendary_cosplay",
            "cyberpunk_2077",
            "anime_manga",
            "gothic_eldritch",
        }

        canon_roster = db_session.scalar(select(Roster).where(Roster.slug == "canon"))
        assert canon_roster is not None
        canon_entities = canon_roster.entities
        assert len(canon_entities) == 98

        survivor_count = sum(1 for e in canon_entities if e.role == "Survivor")
        killer_count = sum(1 for e in canon_entities if e.role == "Killer")
        assert survivor_count == 54
        assert killer_count == 44

        hoy_roster = db_session.scalar(select(Roster).where(Roster.slug == "hooked_on_you"))
        assert len(hoy_roster.entities) == 8

        leg_roster = db_session.scalar(select(Roster).where(Roster.slug == "legendary_cosplay"))
        assert len(leg_roster.entities) == 12

        cyber_roster = db_session.scalar(select(Roster).where(Roster.slug == "cyberpunk_2077"))
        assert len(cyber_roster.entities) == 10

        anime_roster = db_session.scalar(select(Roster).where(Roster.slug == "anime_manga"))
        assert len(anime_roster.entities) == 10

        gothic_roster = db_session.scalar(select(Roster).where(Roster.slug == "gothic_eldritch"))
        assert len(gothic_roster.entities) == 10

        all_entities = db_session.scalars(select(Entity)).all()
        assert len(all_entities) == 98 + 8 + 12 + 10 + 10 + 10

        for entity in all_entities:
            assert entity.stat is not None
            assert entity.stat.smash_count == 0
            assert entity.stat.pass_count == 0
            assert entity.stat.super_smash_count == 0
            assert entity.stat.total_votes == 0
            assert entity.stat.smash_rate == 0.0
            assert entity.metadata_json is not None
            assert "chaos_score" in entity.metadata_json
            assert "danger_level" in entity.metadata_json
            assert "quote" in entity.metadata_json
            assert "compatibility_tags" in entity.metadata_json

        locales = db_session.scalars(select(Translation.locale).distinct()).all()
        assert set(locales) == {"en", "es", "de", "ja", "pl"}

    def test_seed_smash_rosters_idempotency(self, db_session: Session) -> None:
        seed_smash_rosters()
        initial_roster_count = db_session.scalar(select(func.count(Roster.id)))
        initial_entity_count = db_session.scalar(select(func.count(Entity.id)))
        initial_stat_count = db_session.scalar(select(func.count(EntityStat.id)))
        initial_trans_count = db_session.scalar(select(func.count(Translation.id)))

        seed_smash_rosters()
        assert db_session.scalar(select(func.count(Roster.id))) == initial_roster_count
        assert db_session.scalar(select(func.count(Entity.id))) == initial_entity_count
        assert db_session.scalar(select(func.count(EntityStat.id))) == initial_stat_count
        assert db_session.scalar(select(func.count(Translation.id))) == initial_trans_count

    def test_service_get_rosters(self, db_session: Session) -> None:
        seed_smash_rosters()
        service = SmashOrPassService()
        active_rosters = service.get_rosters(active_only=True)
        all_rosters = service.get_rosters(active_only=False)

        assert len(active_rosters) == 2
        assert len(all_rosters) == 6
        canon = next((r for r in active_rosters if r["slug"] == "canon"), None)
        assert canon is not None
        assert canon["entity_count"] == 98
        assert canon["total_votes"] == 0
        assert canon["theme_color"] == "#ff0055"
        assert canon["name_i18n_key"] == "smashOrPass.rosters.canon.name"

    def test_service_get_feed_and_unvoted_filtering(self, db_session: Session) -> None:
        seed_smash_rosters()
        service = SmashOrPassService()

        feed_res = service.get_feed(roster_slug="canon", limit=10)
        assert feed_res is not None
        assert feed_res["total_remaining"] == 98
        feed = feed_res["entities"]
        assert len(feed) == 10

        first_entity = feed[0]
        second_entity = feed[1]

        service.cast_vote(
            entity_id=first_entity["id"],
            vote_type="smash",
            session_id="session_test_1",
        )
        service.cast_vote(
            entity_id=second_entity["id"],
            vote_type="pass",
            session_id="session_test_1",
        )

        feed_filtered_res = service.get_feed(
            roster_slug="canon", session_id="session_test_1", limit=10
        )
        assert feed_filtered_res["total_remaining"] == 96
        filtered_ids = {e["id"] for e in feed_filtered_res["entities"]}
        assert first_entity["id"] not in filtered_ids
        assert second_entity["id"] not in filtered_ids

        feed_other_res = service.get_feed(
            roster_slug="canon", session_id="session_other", limit=10
        )
        assert feed_other_res["total_remaining"] == 98
        other_ids = {e["id"] for e in feed_other_res["entities"]}
        assert first_entity["id"] in other_ids
        assert second_entity["id"] in other_ids

        female_survivors_res = service.get_feed(
            roster_slug="canon", role="Survivor", gender="female", limit=50
        )
        female_survivors = female_survivors_res["entities"]
        assert len(female_survivors) == 28
        assert female_survivors_res["total_remaining"] == 28
        assert all(e["role"] == "Survivor" and e["gender"] == "female" for e in female_survivors)

    def test_service_cast_vote_atomic_counts_and_rate(self, db_session: Session) -> None:
        seed_smash_rosters()
        service = SmashOrPassService()

        res1 = service.cast_vote(
            character_slug="ada_wong",
            vote_type="smash",
            user_id=1,
            edition="canon",
        )
        assert res1["stat"]["smash_count"] == 1
        assert res1["stat"]["pass_count"] == 0
        assert res1["stat"]["total_votes"] == 1
        assert res1["stat"]["smash_rate"] == 100.0

        res2 = service.cast_vote(
            character_slug="ada_wong",
            vote_type="pass",
            user_id=2,
            edition="canon",
        )
        assert res2["stat"]["smash_count"] == 1
        assert res2["stat"]["pass_count"] == 1
        assert res2["stat"]["total_votes"] == 2
        assert res2["stat"]["smash_rate"] == 50.0

        res3 = service.cast_vote(
            character_slug="ada_wong",
            vote_type="super_smash",
            user_id=3,
            edition="canon",
        )
        assert res3["stat"]["smash_count"] == 1
        assert res3["stat"]["pass_count"] == 1
        assert res3["stat"]["super_smash_count"] == 1
        assert res3["stat"]["total_votes"] == 3
        assert res3["stat"]["smash_rate"] == 66.7

        res4 = service.cast_vote(
            character_slug="ada_wong",
            vote_type="pass",
            user_id=1,
            edition="canon",
        )
        assert res4["stat"]["smash_count"] == 0
        assert res4["stat"]["pass_count"] == 2
        assert res4["stat"]["super_smash_count"] == 1
        assert res4["stat"]["total_votes"] == 3
        assert res4["stat"]["smash_rate"] == 33.3

        leg_stat = db_session.scalar(
            select(SmashPassStat).where(
                SmashPassStat.character_slug == "ada_wong",
                SmashPassStat.edition == "canon",
            )
        )
        assert leg_stat is not None
        assert leg_stat.smash_count == 0
        assert leg_stat.pass_count == 2
        assert leg_stat.super_smash_count == 1
        assert leg_stat.total_votes == 3
        assert leg_stat.smash_rate == 33.3

    def test_service_cast_vote_by_entity_id(self, db_session: Session) -> None:
        seed_smash_rosters()
        service = SmashOrPassService()
        feed_res = service.get_feed(roster_slug="cyberpunk_2077", limit=1)
        target = feed_res["entities"][0]

        res = service.cast_vote(
            entity_id=target["id"],
            vote_type="smash",
            user_id=10,
        )
        assert res["id"] == target["id"]
        assert res["stat"]["smash_count"] == 1
        assert res["stat"]["total_votes"] == 1

    def test_service_leaderboard_tiers_and_sorting(self, db_session: Session) -> None:
        seed_smash_rosters()
        service = SmashOrPassService()

        for i in range(5):
            service.cast_vote(
                character_slug="ada_wong",
                vote_type="smash",
                user_id=100 + i,
            )

        for i in range(7):
            service.cast_vote(
                character_slug="sable_ward",
                vote_type="smash",
                user_id=200 + i,
            )
        for i in range(3):
            service.cast_vote(
                character_slug="sable_ward",
                vote_type="pass",
                user_id=300 + i,
            )

        service.cast_vote(character_slug="feng_min", vote_type="smash", user_id=401)
        service.cast_vote(character_slug="feng_min", vote_type="pass", user_id=402)

        for i in range(4):
            service.cast_vote(
                character_slug="kate_denson",
                vote_type="pass",
                user_id=500 + i,
            )

        leaderboard = service.get_leaderboard(roster_slug="canon", limit=10)

        ada_entry = next(e for e in leaderboard if e["slug"] == "ada_wong")
        assert ada_entry["rank"] == 1
        assert ada_entry["tier"] == "God Tier"
        assert ada_entry["smash_rate"] == 100.0

        sable_entry = next(e for e in leaderboard if e["slug"] == "sable_ward")
        assert sable_entry["tier"] == "Fatal Attraction"
        assert sable_entry["smash_rate"] == 70.0

        feng_entry = next(e for e in leaderboard if e["slug"] == "feng_min")
        assert feng_entry["tier"] == "Friendzone"
        assert feng_entry["smash_rate"] == 50.0

        kate_entry = next(e for e in leaderboard if e["slug"] == "kate_denson")
        assert kate_entry["tier"] == "Eldritch Void"
        assert kate_entry["smash_rate"] == 0.0

        by_votes = service.get_leaderboard(roster_slug="canon", sort_by="total_votes")
        assert by_votes[0]["slug"] == "sable_ward"

    def test_service_reset_session_and_user_votes(self, db_session: Session) -> None:
        seed_smash_rosters()
        service = SmashOrPassService()

        # Guest session vote
        service.cast_vote(
            character_slug="ada_wong", vote_type="smash", session_id="sess_reset_me"
        )
        service.cast_vote(
            character_slug="sable_ward", vote_type="pass", session_id="sess_reset_me"
        )

        reset_res = service.reset_session_votes(session_id="sess_reset_me")
        assert reset_res["status"] == "success"
        assert reset_res["reset_count"] == 2

        # User vote (mutates global stats)
        service.cast_vote(character_slug="ada_wong", vote_type="super_smash", user_id=99)
        assert service.get_character_stat("ada_wong")["super_smash_count"] == 1

        user_reset_res = service.reset_user_votes(user_id=99)
        assert user_reset_res["status"] == "success"
        assert user_reset_res["reset_count"] == 1
        assert service.get_character_stat("ada_wong")["super_smash_count"] == 0

    def test_service_get_translations(self, db_session: Session) -> None:
        seed_smash_rosters()
        service = SmashOrPassService()

        en_dict = service.get_translations("en")
        assert en_dict["smashOrPass.rosters.canon.name"] == "Dead by Daylight: Fog Canon"
        assert en_dict["smashOrPass.tiers.godTier"] == "God Tier"

        es_dict = service.get_translations("es")
        assert en_dict["smashOrPass.rosters.canon.name"] is not None
        assert es_dict["smashOrPass.tiers.godTier"] == "Nivel Dios"

        ja_dict = service.get_translations("ja")
        assert "霧の正史" in ja_dict["smashOrPass.rosters.canon.name"]
        assert ja_dict["smashOrPass.tiers.godTier"] == "神ティア"

        pl_dict = service.get_translations("pl")
        assert pl_dict["smashOrPass.rosters.canon.name"] == "Dead by Daylight: Kanon Mgły"
        assert pl_dict["smashOrPass.tiers.godTier"] == "Boski Poziom"

    def test_service_legacy_methods_compatibility(self, db_session: Session) -> None:
        seed_smash_rosters()
        service = SmashOrPassService()

        editions = service.get_editions()
        assert len(editions) >= 2

        canon_chars = service.get_characters_with_stats(edition="canon")
        assert len(canon_chars) == 98
        assert "character_slug" in canon_chars[0]
        assert "smash_rate" in canon_chars[0]

        searched = service.get_characters_with_stats(edition="canon", search="Leon")
        assert len(searched) == 1
        assert searched[0]["character_slug"] == "leon_scott_kennedy"

        stat = service.get_character_stat("leon_scott_kennedy", edition="canon")
        assert stat is not None
        assert stat["character_name"] == "Leon S. Kennedy"

        service.cast_vote(character_slug="leon_scott_kennedy", vote_type="smash", user_id=55)
        user_votes = service.get_user_votes(user_id=55, edition="canon")
        assert len(user_votes) == 1
        assert user_votes[0]["character_slug"] == "leon_scott_kennedy"

        reset_out = service.reset_stats()
        assert reset_out["status"] == "reset_complete"
        stat_reset = service.get_character_stat("leon_scott_kennedy", edition="canon")
        assert stat_reset["smash_count"] == 0
