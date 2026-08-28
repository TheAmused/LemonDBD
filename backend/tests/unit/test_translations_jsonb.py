# backend/tests/unit/test_translations_jsonb.py
import pytest
from app import create_app
from app.core.config import Config
from app.core.extensions import db
from app.models import Addon, Character, Item, Perk


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt"


@pytest.fixture
def app():
    flask_app = create_app(TestConfig)
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.mark.unit
def test_perk_translations_model(app):
    with app.app_context():
        perk = Perk(
            name="Decisive Strike",
            category="Survivor",
            description="English description for Decisive Strike.",
            translations={
                "en": {"name": "Decisive Strike", "description": "English description for Decisive Strike."},
                "pl": {"name": "Zdecydowany Cios", "description": "Polski opis Zdecydowanego Ciosu."},
                "de": {"name": "Entscheidungsschlag", "description": "Deutsche Beschreibung für Entscheidungsschlag."},
            },
        )
        db.session.add(perk)
        db.session.commit()

        loaded = db.session.scalars(db.select(Perk).where(Perk.name == "Decisive Strike")).first()
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


@pytest.mark.unit
def test_character_translations_model(app):
    with app.app_context():
        char = Character(
            name="The Trapper",
            role="Killer",
            power_name="Bear Trap",
            power_description="English power description.",
            lore="English lore.",
            chapter_name="Base Game",
            translations={
                "en": {
                    "name": "The Trapper",
                    "lore": "English lore.",
                    "chapter_name": "Base Game",
                    "power_name": "Bear Trap",
                    "power_description": "English power description.",
                },
                "pl": {
                    "name": "Traper",
                    "lore": "Polska historia.",
                    "chapter_name": "Gra Podstawowa",
                    "power_name": "Wnyki",
                    "power_description": "Polski opis mocy.",
                },
            },
        )
        db.session.add(char)
        db.session.commit()

        loaded = db.session.scalars(db.select(Character).where(Character.name == "The Trapper")).first()
        assert loaded is not None

        pl_dict = loaded.to_dict(lang="pl")
        assert pl_dict["name"] == "Traper"
        assert pl_dict["lore"] == "Polska historia."
        assert pl_dict["chapter_name"] == "Gra Podstawowa"
        assert pl_dict["power"]["name"] == "Wnyki"
        assert pl_dict["power"]["description"] == "Polski opis mocy."


@pytest.mark.unit
def test_item_and_addon_translations_model(app):
    with app.app_context():
        item = Item(
            name="Flashlight",
            category="Flashlight",
            role="Survivor",
            description="Illuminates the area.",
            translations={
                "en": {"name": "Flashlight", "description": "Illuminates the area."},
                "pl": {"name": "Latarka", "description": "Oświetla obszar."},
            },
        )
        addon = Addon(
            name="Battery",
            associated_target="Flashlight",
            category="Survivor",
            description="Increases battery life.",
            translations={
                "en": {"name": "Battery", "description": "Increases battery life."},
                "pl": {"name": "Bateria", "description": "Wydłuża czas działania."},
            },
        )
        db.session.add_all([item, addon])
        db.session.commit()

        loaded_item = db.session.scalars(db.select(Item).where(Item.name == "Flashlight")).first()
        loaded_addon = db.session.scalars(db.select(Addon).where(Addon.name == "Battery")).first()

        assert loaded_item.to_dict(lang="pl")["name"] == "Latarka"
        assert loaded_item.to_dict(lang="pl")["description"] == "Oświetla obszar."

        assert loaded_addon.to_dict(lang="pl")["name"] == "Bateria"
        assert loaded_addon.to_dict(lang="pl")["description"] == "Wydłuża czas działania."


@pytest.mark.unit
def test_api_routes_with_lang_parameter(client, app):
    with app.app_context():
        perk = Perk(
            name="Sprint Burst",
            category="Survivor",
            description="When starting to run, break into a sprint.",
            translations={
                "en": {"name": "Sprint Burst", "description": "When starting to run, break into a sprint."},
                "pl": {"name": "Sprint", "description": "Podczas rozpoczynania biegu zrywasz się do sprintu."},
            },
        )
        killer = Character(
            name="The Clown",
            role="Killer",
            power_name="The Afterpiece Tonic",
            translations={
                "en": {"name": "The Clown", "power_name": "The Afterpiece Tonic"},
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
