# backend/tests/unit/api/test_character_detail_route.py
import pytest
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Perk, Survivor
from tests.unit.conftest import make_chapter


@pytest.fixture(autouse=True)
def setup_character_data(db_session: Session) -> None:
    existing = db_session.scalars(select(Survivor).where(Survivor.name == "Meg Thomas")).first()
    if not existing:
        # `release_number` is the primary key now -- the source numbered
        # survivors and killers separately, and that is what each table's id is.
        c = Survivor(name="Meg Thomas", id=2, chapter_id=make_chapter(db_session).id)
        db_session.add(c)
        db_session.flush()
    else:
        c = existing

    perk = db_session.scalars(select(Perk).where(Perk.name == "Sprint Burst")).first()
    if not perk:
        db_session.add(
            Perk(
                name="Sprint Burst",
                survivor_id=c.id,
                role="Survivor",
                description="Run fast",
                icon_url="url",
                icon_local_path="path",
            )
        )
    else:
        perk.survivor_id = c.id
    db_session.commit()


@pytest.mark.unit
class TestCharacterDetailRoute:
    """Tests for fetching aggregated character profiles, teachable perks, and add-ons."""

    def test_character_detail(self, client: FlaskClient) -> None:
        response = client.get("/api/v1/characters/Meg%20Thomas/detail")
        assert response.status_code == 200
        data = response.get_json()
        assert "data" in data
        detail = data["data"]
        assert "character" in detail
        assert "perks" in detail
        assert "addons" in detail
        assert detail["character"]["name"] == "Meg Thomas"
        assert isinstance(detail["perks"], list)
        assert len(detail["perks"]) > 0
        for perk in detail["perks"]:
            assert "name" in perk
            assert "description" in perk
            assert "icon_url" in perk
            assert "icon_local_path" in perk

    def test_character_detail_not_found(self, client: FlaskClient) -> None:
        response = client.get("/api/v1/characters/NonExistentCharacter12345/detail")
        assert response.status_code == 404
        data = response.get_json()
        assert "error" in data
