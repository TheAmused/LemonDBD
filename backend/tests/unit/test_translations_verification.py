# backend/tests/unit/test_translations_verification.py
import pytest
from flask import Flask
from sqlalchemy import select
from app import create_app
from app.core.config import Config
from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.character import Killer, Survivor
from app.models.perk import Perk
from app.models.equipment import Item, ItemCategory, KillerAddon
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
            chapter = db.session.scalars(
                select(Chapter).where(Chapter.name == "Base Game")
            ).first()
            if not chapter:
                chapter = Chapter(name="Base Game", dlc_type="base_game")
                db.session.add(chapter)
                db.session.flush()

            trapper = db.session.scalars(
                select(Killer).where(Killer.name == "The Trapper")
            ).first()
            if not trapper:
                trapper = Killer(
                    name="The Trapper",
                    chapter_id=chapter.id,
                    lore="Evan MacMillan idolized his father.",
                    power_name="Bear Trap",
                    power_description="Set traps to catch survivors.",
                )
                db.session.add(trapper)
                db.session.flush()

            unnerving = db.session.scalars(
                select(Perk).where(Perk.name == "Unnerving Presence")
            ).first()
            if not unnerving:
                unnerving = Perk(
                    name="Unnerving Presence",
                    role="Killer",
                    description="Your presence alone instills great fear.",
                    killer=trapper,
                )
                db.session.add(unnerving)

            med_kit_category = db.session.scalars(
                select(ItemCategory).where(ItemCategory.name == "Firecracker")
            ).first()
            if not med_kit_category:
                med_kit_category = ItemCategory(
                    name="Firecracker",
                    addon_target_label="Firecrackers",
                    role="Survivor",
                )
                db.session.add(med_kit_category)
                db.session.flush()

            item = db.session.scalars(
                select(Item).where(Item.name == "Chinese Firecracker")
            ).first()
            if not item:
                item = Item(
                    name="Chinese Firecracker",
                    category_id=med_kit_category.id,
                    description="A row of small explosive devices wrapped in heavy paper casing.",
                )
                db.session.add(item)

            addon = db.session.scalars(
                select(KillerAddon).where(KillerAddon.name == "Trapper Gloves")
            ).first()
            if not addon:
                addon = KillerAddon(
                    name="Trapper Gloves",
                    killer_id=trapper.id,
                    description="Setting speed of Bear Traps by protective gloves made out of thick leather.",
                )
                db.session.add(addon)

            # The in-game/translations.json name is "Ashley J. Williams", not
            # the "Ash Williams" nickname -- `sync_all_locales_to_db` matches
            # by `simplify_lookup_key(name)`, so the row has to carry the same
            # name the translation bundle does for the match (and later the
            # `ashley_j_williams` slug lookup) to succeed.
            ash = db.session.scalars(
                select(Survivor).where(Survivor.name == "Ashley J. Williams")
            ).first()
            if not ash:
                ash = Survivor(
                    name="Ashley J. Williams",
                    chapter_id=chapter.id,
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
                select(Killer).where(Killer.name == "The Trapper")
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
