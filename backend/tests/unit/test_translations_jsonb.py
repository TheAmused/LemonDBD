# backend/tests/unit/test_translations_jsonb.py
import pytest
from flask import Flask
from flask.testing import FlaskClient
from app import create_app
from app.core.config import Config
from app.core.extensions import db
from app.models import Chapter, Item, ItemAddon, ItemCategory, Killer, Perk


class TranslationTestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt"


@pytest.fixture
def app() -> Flask:
    flask_app = create_app(TranslationTestConfig)
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    return app.test_client()


@pytest.mark.unit
class TestTranslationsJSONB:
    """PostgreSQL JSONB / SQLite dict translations on perks, killers and equipment."""

    def test_perk_translations_model(self, app: Flask) -> None:
        with app.app_context():
            perk = Perk(
                name="Decisive Strike",
                role="Survivor",
                description="English description for Decisive Strike.",
                translations={
                    "en": {
                        "name": "Decisive Strike",
                        "description": "English description for Decisive Strike.",
                    },
                    "pl": {
                        "name": "Zdecydowany Cios",
                        "description": "Polski opis Zdecydowanego Ciosu.",
                    },
                    "de": {
                        "name": "Entscheidungsschlag",
                        "description": "Deutsche Beschreibung für Entscheidungsschlag.",
                    },
                },
            )
            db.session.add(perk)
            db.session.commit()

            loaded = db.session.scalars(
                db.select(Perk).where(Perk.name == "Decisive Strike")
            ).first()
            assert loaded is not None
            assert "pl" in loaded.translations
            assert loaded.translations["pl"]["name"] == "Zdecydowany Cios"

            default_dict = loaded.to_dict()
            assert default_dict["name"] == "Decisive Strike"
            assert default_dict["description"] == "English description for Decisive Strike."
            assert "pl" in default_dict["translations"]

            pl_dict = loaded.to_dict(lang="pl")
            assert pl_dict["name"] == "Zdecydowany Cios"
            assert pl_dict["description"] == "Polski opis Zdecydowanego Ciosu."

            de_dict = loaded.to_dict(lang="de")
            assert de_dict["name"] == "Entscheidungsschlag"
            assert de_dict["description"] == "Deutsche Beschreibung für Entscheidungsschlag."

            ja_dict = loaded.to_dict(lang="ja")
            assert ja_dict["name"] == "Decisive Strike"
            assert ja_dict["description"] == "English description for Decisive Strike."

    def test_character_translations_model(self, app: Flask) -> None:
        with app.app_context():
            # No `role` (the table is the role) and no `chapter_name` -- the
            # chapter title lived on every character and its translation lived
            # in every character's blob; both come from the chapter now, so
            # the chapter carries its own `translations` blob instead.
            chapter = Chapter(
                name="Base Game",
                translations={"pl": {"name": "Gra Podstawowa"}},
            )
            db.session.add(chapter)
            db.session.flush()
            char = Killer(
                name="The Trapper",
                chapter_id=chapter.id,
                power_name="Bear Trap",
                power_description="English power description.",
                lore="English lore.",
                translations={
                    "pl": {
                        "name": "Traper",
                        "lore": "Polska historia.",
                        "power_name": "Wnyki",
                        "power_description": "Polski opis mocy.",
                    },
                },
            )
            db.session.add(char)
            db.session.commit()

            loaded = db.session.scalars(
                db.select(Killer).where(Killer.name == "The Trapper")
            ).first()
            assert loaded is not None

            pl_dict = loaded.to_dict(lang="pl")
            assert pl_dict["name"] == "Traper"
            assert pl_dict["lore"] == "Polska historia."
            assert pl_dict["chapter_name"] == "Gra Podstawowa"
            assert pl_dict["power"]["name"] == "Wnyki"
            assert pl_dict["power"]["description"] == "Polski opis mocy."

    def test_item_and_addon_translations_model(self, app: Flask) -> None:
        with app.app_context():
            flashlights = ItemCategory(
                name="Flashlight", addon_target_label="Flashlights", role="Survivor"
            )
            db.session.add(flashlights)
            db.session.flush()
            # `category` and `role` were two strings on every item; they are one
            # foreign key to the class the item belongs to.
            item = Item(
                name="Flashlight",
                category_id=flashlights.id,
                description="Illuminates the area.",
                translations={
                    "en": {"name": "Flashlight", "description": "Illuminates the area."},
                    "pl": {"name": "Latarka", "description": "Oświetla obszar."},
                },
            )
            addon = ItemAddon(
                name="Battery",
                item_category_id=flashlights.id,
                description="Increases battery life.",
                translations={
                    "en": {"name": "Battery", "description": "Increases battery life."},
                    "pl": {"name": "Bateria", "description": "Wydłuża czas działania."},
                },
            )
            db.session.add_all([item, addon])
            db.session.commit()

            loaded_item = db.session.scalars(db.select(Item).where(Item.name == "Flashlight")).first()
            loaded_addon = db.session.scalars(db.select(ItemAddon).where(ItemAddon.name == "Battery")).first()

            assert loaded_item.to_dict(lang="pl")["name"] == "Latarka"
            assert loaded_item.to_dict(lang="pl")["description"] == "Oświetla obszar."

            assert loaded_addon.to_dict(lang="pl")["name"] == "Bateria"
            assert loaded_addon.to_dict(lang="pl")["description"] == "Wydłuża czas działania."

    def test_api_routes_with_lang_parameter(self, client: FlaskClient, app: Flask) -> None:
        with app.app_context():
            perk = Perk(
                name="Sprint Burst",
                role="Survivor",
                description="When starting to run, break into a sprint.",
                translations={
                    "en": {
                        "name": "Sprint Burst",
                        "description": "When starting to run, break into a sprint.",
                    },
                    "pl": {
                        "name": "Sprint",
                        "description": "Podczas rozpoczynania biegu zrywasz się do sprintu.",
                    },
                },
            )
            clown_chapter = Chapter(name="Curtain Call")
            db.session.add(clown_chapter)
            db.session.flush()
            killer = Killer(
                name="The Clown",
                chapter_id=clown_chapter.id,
                power_name="The Afterpiece Tonic",
                translations={
                    "pl": {"name": "Klaun", "power_name": "Tonik Poprawiający Nastrój"},
                },
            )
            db.session.add_all([perk, killer])
            db.session.commit()
            perk_id = perk.id
            killer_id = killer.id

        resp = client.get("/api/v1/perks?lang=pl")
        assert resp.status_code == 200
        data = resp.get_json().get("data", [])
        assert len(data) >= 1
        found_perk = next((p for p in data if p["id"] == perk_id), None)
        assert found_perk is not None
        assert found_perk["name"] == "Sprint"
        assert found_perk["description"] == "Podczas rozpoczynania biegu zrywasz się do sprintu."

        resp_char = client.get("/api/v1/characters?lang=pl")
        assert resp_char.status_code == 200
        char_data = resp_char.get_json().get("data", [])
        found_clown = next((c for c in char_data if c["id"] == killer_id), None)
        assert found_clown is not None
        assert found_clown["name"] == "Klaun"
        assert found_clown["power"]["name"] == "Tonik Poprawiający Nastrój"
