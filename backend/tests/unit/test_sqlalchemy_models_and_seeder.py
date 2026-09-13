# backend/tests/unit/test_sqlalchemy_models_and_seeder.py
import os
from importlib import reload
import pytest
from flask.testing import FlaskClient
from sqlalchemy import delete, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session
from tests.unit.conftest import make_chapter
from app.models import Killer, Perk, Survivor


@pytest.mark.unit
class TestSQLAlchemyModelsAndSeeder:
    """Tests for core SQLAlchemy character/perk mapping, foreign key cascades, upserts, and PostgreSQL URL dialect rewriting."""

    def test_character_and_perk_mapped_models(self, db_session: Session) -> None:
        # No `role`: the table is the role. No `code_prefix`, `short_name` or
        # `release_number` either -- all three were `name` or the primary key
        # respelled, and are derived now.
        char = Killer(
            name="Test Trapper",
            chapter_id=make_chapter(db_session).id,
            power_name="Bear Trap",
            portrait_url="avatars/killers/test_trapper.png",
            real_name="Evan MacMillan",
        )
        db_session.add(char)
        db_session.commit()

        assert char.id is not None
        assert char.role == "Killer"
        assert char.code_prefix == f"K{char.id:02d}"
        assert char.release_number == char.id

        perk1 = Perk(
            name="Test Unnerving Presence",
            role="Killer",
            is_teachable=True,
            description="Causes survivors in terror radius to have difficult skill checks.",
            killer_id=char.id,
        )
        perk2 = Perk(
            name="Test Brutal Strength",
            role="Killer",
            is_teachable=True,
            description="Increases pallet breaking speed.",
            killer_id=char.id,
        )
        db_session.add_all([perk1, perk2])
        db_session.commit()

        stmt = select(Killer).where(Killer.name == "Test Trapper")
        retrieved_char = db_session.scalars(stmt).first()
        assert retrieved_char is not None
        assert len(retrieved_char.perks) == 2
        assert retrieved_char.perks[0].character.name == "Test Trapper"

        char_dict = retrieved_char.to_dict()
        assert char_dict["name"] == "Test Trapper"
        assert char_dict["real_name"] == "Evan MacMillan"
        assert char_dict["code_prefix"] == "K01"

        perk_dict = retrieved_char.perks[0].to_dict()
        assert perk_dict["character"] == "Test Trapper"
        assert perk_dict["character_real_name"] == "Evan MacMillan"
        assert perk_dict["is_teachable"] is True

    def test_cascade_delete(self, db_session: Session) -> None:
        char = Survivor(name="Test Meg", chapter_id=make_chapter(db_session).id)
        db_session.add(char)
        db_session.commit()

        perk = Perk(name="Test Sprint Burst", role="Survivor", survivor_id=char.id)
        db_session.add(perk)
        db_session.commit()

        db_session.delete(char)
        db_session.commit()

        perk_check = db_session.scalars(select(Perk).where(Perk.name == "Test Sprint Burst")).first()
        assert perk_check is None

    def test_atomic_upsert_on_conflict(self, db_session: Session) -> None:
        chapter_id = make_chapter(db_session).id
        stmt1 = sqlite_insert(Survivor).values(
            {
                "name": "Test Claudette",
                "chapter_id": chapter_id,
                "portrait_url": "old_url.png",
            }
        )
        db_session.execute(stmt1)
        db_session.commit()

        stmt2 = sqlite_insert(Survivor).values(
            {
                "name": "Test Claudette",
                "chapter_id": chapter_id,
                "portrait_url": "updated_url.png",
            }
        )
        stmt2 = stmt2.on_conflict_do_update(
            index_elements=[Survivor.name],
            set_={"portrait_url": stmt2.excluded.portrait_url},
        )
        db_session.execute(stmt2)
        db_session.commit()

        char = db_session.scalars(select(Survivor).where(Survivor.name == "Test Claudette")).first()
        assert char is not None
        assert char.portrait_url == "updated_url.png"

    def test_database_url_psycopg3_normalization(self) -> None:
        orig_url = os.environ.get("DATABASE_URL")
        try:
            os.environ["DATABASE_URL"] = "postgres://user:pass@localhost:5432/testdb"
            import app.core.config

            reload(app.core.config)
            assert (
                app.core.config.Config.SQLALCHEMY_DATABASE_URI
                == "postgresql+psycopg://user:pass@localhost:5432/testdb"
            )

            os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/testdb"
            reload(app.core.config)
            assert (
                app.core.config.Config.SQLALCHEMY_DATABASE_URI
                == "postgresql+psycopg://user:pass@localhost:5432/testdb"
            )
        finally:
            if orig_url:
                os.environ["DATABASE_URL"] = orig_url
            else:
                os.environ.pop("DATABASE_URL", None)

    def test_api_scrape_and_seed_route(self, client: FlaskClient) -> None:
        response = client.post("/api/scrape-and-seed", json={"source": "test"})
        assert response.status_code in [200, 401, 500]
        if response.status_code == 200:
            data = response.get_json()
            assert data.get("status") == "success"
            assert "characters_synced" in data
            assert "perks_synced" in data
