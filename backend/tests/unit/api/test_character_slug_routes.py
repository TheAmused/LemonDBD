# backend/tests/unit/api/test_character_slug_routes.py
import pytest
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Killer, Perk, Survivor
from tests.unit.conftest import make_chapter


@pytest.fixture(autouse=True)
def setup_slug_characters(db_session: Session) -> None:
    """Three characters to resolve by name, slug and real name.

    `role` is not passed: the table is the role. `release_number` is the
    primary key -- the source numbered survivors and killers separately, which
    is what each table's id is. `wiki_slug`, `short_name`, `chapter_name`,
    `chapter_number`, `dlc_type`, `is_licensed`, `release_year` and
    `dlc_counterparts` are all gone from a character row: the first two were
    `name` respelled, and the rest belong to the chapter.
    """
    base_game = make_chapter(db_session, "Base Game")
    resident_evil = make_chapter(db_session, "Resident Evil")
    resident_evil.is_licensed = True
    resident_evil.release_year = 2021
    resident_evil.dlc_type = "chapter"

    meg = db_session.scalars(select(Survivor).where(Survivor.name == "Meg Thomas")).first()
    if not meg:
        meg = Survivor(name="Meg Thomas", id=2, chapter_id=base_game.id)
        db_session.add(meg)
        db_session.flush()
        db_session.add(
            Perk(
                name="Sprint Burst",
                role="Survivor",
                survivor_id=meg.id,
                description="Run fast",
                icon_url="url",
                icon_local_path="path",
            )
        )

    trapper = db_session.scalars(select(Killer).where(Killer.name == "The Trapper")).first()
    if not trapper:
        trapper = Killer(
            name="The Trapper",
            id=1,
            chapter_id=base_game.id,
            power_name="Bear Trap",
            real_name="Evan MacMillan",
        )
        db_session.add(trapper)
        db_session.flush()
        db_session.add(
            Perk(
                name="Agitation",
                role="Killer",
                killer_id=trapper.id,
                description="Carry fast",
                icon_url="url",
                icon_local_path="path",
            )
        )
    else:
        trapper.real_name = "Evan MacMillan"

    nemesis = db_session.scalars(select(Killer).where(Killer.name == "The Nemesis")).first()
    if not nemesis:
        nemesis = Killer(
            name="The Nemesis",
            id=24,
            chapter_id=resident_evil.id,
            power_name="T-Virus",
            real_name="Nemesis-T Type",
            lore="The Nemesis-T Type was an experimental Bio-Organic Weapon...",
        )
        db_session.add(nemesis)
    else:
        nemesis.chapter_id = resident_evil.id
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
        from app.seeds.static_db_seeder import seed_from_static_json
        seed_from_static_json(force=True)

        res = client.get("/api/v1/characters/the_nemesis/detail")
        assert res.status_code == 200
        char = res.get_json()["data"]["character"]
        assert char["name"] == "The Nemesis"
        assert "Resident Evil" in char["chapter_name"]
        assert char["is_licensed"] is True
        assert char["release_year"] == 2021
        assert char["role"] == "Killer"
