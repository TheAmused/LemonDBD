# backend/tests/unit/api/test_character_slug_routes.py
import pytest
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Character, Perk
from app.services.scraper_service import ScraperService


@pytest.fixture(autouse=True)
def setup_slug_characters(db_session: Session) -> None:
    meg = db_session.scalars(select(Character).where(Character.name == "Meg Thomas")).first()
    if not meg:
        meg = Character(name="Meg Thomas", role="Survivor", release_number=2)
        db_session.add(meg)
        db_session.flush()
        db_session.add(
            Perk(
                name="Sprint Burst",
                character_id=meg.id,
                description="Run fast",
                icon_url="url",
                icon_local_path="path",
            )
        )

    trapper = db_session.scalars(select(Character).where(Character.name == "The Trapper")).first()
    if not trapper:
        trapper = Character(
            name="The Trapper", role="Killer", release_number=1, real_name="Evan MacMillan"
        )
        db_session.add(trapper)
        db_session.flush()
        db_session.add(
            Perk(
                name="Agitation",
                character_id=trapper.id,
                description="Carry fast",
                icon_url="url",
                icon_local_path="path",
            )
        )
    else:
        trapper.real_name = "Evan MacMillan"

    nemesis = db_session.scalars(select(Character).where(Character.name == "The Nemesis")).first()
    if not nemesis:
        nemesis = Character(
            name="The Nemesis",
            role="Killer",
            release_number=24,
            real_name="Nemesis-T Type",
            wiki_slug="The_Nemesis",
            short_name="the_nemesis",
            chapter_name="Chapter 20: Resident Evil",
            chapter_number="20",
            dlc_type="licensed_chapter",
            is_licensed=True,
            release_year=2021,
            dlc_counterparts="Leon S. Kennedy, Jill Valentine",
            lore="The Nemesis-T Type was an experimental Bio-Organic Weapon...",
        )
        db_session.add(nemesis)
    else:
        nemesis.chapter_name = "Chapter 20: Resident Evil"
        nemesis.chapter_number = "20"
        nemesis.dlc_type = "licensed_chapter"
        nemesis.is_licensed = True
        nemesis.release_year = 2021
        nemesis.dlc_counterparts = "Leon S. Kennedy, Jill Valentine"
        if not nemesis.lore:
            nemesis.lore = "The Nemesis-T Type was an experimental Bio-Organic Weapon..."

    db_session.commit()


@pytest.mark.unit
class TestCharacterSlugRoutes:
    """Tests for resolving character detail views via names, underscore slugs, hyphen slugs, and real names."""

    @pytest.mark.parametrize(
        "query_slug, expected_canonical_name",
        [
            ("Meg%20Thomas", "Meg Thomas"),
            ("meg_thomas", "Meg Thomas"),
            ("the-trapper", "The Trapper"),
            ("the_trapper", "The Trapper"),
            ("evan_macmillan", "The Trapper"),
        ],
    )
    def test_lookup_by_slug_variations(
        self, client: FlaskClient, query_slug: str, expected_canonical_name: str
    ) -> None:
        res = client.get(f"/api/v1/characters/{query_slug}/detail")
        assert res.status_code == 200
        assert res.get_json()["data"]["character"]["name"] == expected_canonical_name

    def test_character_database_dlc_fields(self, client: FlaskClient) -> None:
        ScraperService().seed_canonical_characters()

        res = client.get("/api/v1/characters/the_nemesis/detail")
        assert res.status_code == 200
        char = res.get_json()["data"]["character"]
        assert char["name"] == "The Nemesis"
        assert char["chapter_name"] == "Chapter 20: Resident Evil"
        assert char["chapter_number"] == "20"
        assert char["dlc_type"] == "licensed_chapter"
        assert char["is_licensed"] is True
        assert char["release_year"] == 2021
        assert "Leon S. Kennedy" in char["dlc_counterparts"]
        assert len(char["lore"]) > 0
