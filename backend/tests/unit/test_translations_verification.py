# backend/tests/unit/test_translations_verification.py
import pytest
from flask import Flask
from sqlalchemy import select
from app import create_app
from app.core.config import Config
from app.core.extensions import db
from app.models.character import Character
from app.models.perk import Perk
from app.models.equipment import Item, Addon
from app.services.translations import TranslationService


class VerificationTestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt"


@pytest.fixture
def app() -> Flask:
    flask_app = create_app(VerificationTestConfig)
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.mark.unit
class TestTranslationsVerification:
    """Tests for synchronizing multi-locale i18n catalogs into database models."""

    def test_translations_sync_and_retrieval(self, app: Flask) -> None:
        with app.app_context():
            trapper = db.session.scalars(
                select(Character).where(Character.name == "The Trapper")
            ).first()
            if not trapper:
                trapper = Character(
                    name="The Trapper",
                    role="Killer",
                    code_prefix="K01",
                    lore="Evan MacMillan idolized his father.",
                    chapter_name="Base Game",
                )
                db.session.add(trapper)

            unnerving = db.session.scalars(
                select(Perk).where(Perk.name == "Unnerving Presence")
            ).first()
            if not unnerving:
                unnerving = Perk(
                    name="Unnerving Presence",
                    category="Killer",
                    description="Your presence alone instills great fear.",
                    character=trapper,
                )
                db.session.add(unnerving)

            item = db.session.scalars(
                select(Item).where(Item.name == "Chinese Firecracker")
            ).first()
            if not item:
                item = Item(
                    name="Chinese Firecracker",
                    category="Survivor",
                    role="Survivor",
                    description="A row of small explosive devices wrapped in heavy paper casing.",
                )
                db.session.add(item)

            addon = db.session.scalars(
                select(Addon).where(Addon.name == "Trapper Gloves")
            ).first()
            if not addon:
                addon = Addon(
                    name="Trapper Gloves",
                    associated_target="The Trapper",
                    category="Killer",
                    description="Setting speed of Bear Traps by protective gloves made out of thick leather.",
                )
                db.session.add(addon)

            ash = db.session.scalars(
                select(Character).where(Character.name == "Ash Williams")
            ).first()
            if not ash:
                ash = Character(
                    name="Ash Williams",
                    role="Survivor",
                    code_prefix="S17",
                    real_name="Ash Williams",
                    short_name="ash_williams",
                    wiki_slug="Ash_Williams",
                )
                db.session.add(ash)

            db.session.commit()

            service = TranslationService()
            res = service.sync_all_locales_to_db(locales=["en", "pl", "de", "es", "ja"])

            assert res["characters_updated"] >= 1
            assert res["perks_updated"] >= 1
            assert res["items_updated"] >= 1
            assert res["addons_updated"] >= 1

            loaded_trapper = db.session.scalars(
                select(Character).where(Character.name == "The Trapper")
            ).first()
            assert loaded_trapper is not None
            for lang in ["en", "pl", "de", "es", "ja"]:
                assert lang in loaded_trapper.translations
                trans_dict = loaded_trapper.to_dict(lang=lang)
                assert trans_dict["name"] is not None
                assert len(trans_dict["lore"]) > 0

            pl_char = loaded_trapper.to_dict(lang="pl")
            assert pl_char["name"] in ["Traper", "The Trapper"]
            assert len(pl_char["lore"]) > 20

            loaded_perk = db.session.scalars(
                select(Perk).where(Perk.name == "Unnerving Presence")
            ).first()
            assert loaded_perk is not None
            for lang in ["en", "pl", "de", "es", "ja"]:
                assert lang in loaded_perk.translations
                p_dict = loaded_perk.to_dict(lang=lang)
                assert len(p_dict["description"]) > 10

            pl_perk = loaded_perk.to_dict(lang="pl")
            assert pl_perk["name"] in ["Niepokojąca Obecność", "Unnerving Presence"]

            from app.services.perk_service import PerkService

            perk_svc = PerkService()

            ash_detail_pl = perk_svc.get_character_detail("ashley_j_williams", lang="pl")
            assert ash_detail_pl is not None
            assert ash_detail_pl["character"]["name"] == "Ashley J. Williams"
            assert len(ash_detail_pl["character"]["lore"]) > 50

            trapper_detail_pl = perk_svc.get_character_detail("traper", lang="pl")
            assert trapper_detail_pl is not None
            assert trapper_detail_pl["character"]["name"] == "Traper"
