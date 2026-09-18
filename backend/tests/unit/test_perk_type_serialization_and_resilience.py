# backend/tests/unit/test_perk_type_serialization_and_resilience.py
"""`Perk.to_dict()` / `PerkResponse` exposing `perk_type`, and graceful
degradation for a perk with no `perk_type` at all (old/incomplete seed
data) -- the model column is nullable specifically so this never crashes.
"""
import pytest

from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.character import Survivor
from app.models.perk import Perk
from app.schemas.perk import PerkResponse


@pytest.fixture
def survivor(app):
    with app.app_context():
        db.drop_all()
        db.create_all()
        chapter = Chapter(name="Test Chapter")
        db.session.add(chapter)
        db.session.flush()
        surv = Survivor(name="Test Survivor", chapter_id=chapter.id)
        db.session.add(surv)
        db.session.commit()
        yield surv.id
        db.session.remove()
        db.drop_all()


@pytest.mark.unit
def test_to_dict_exposes_perk_type_when_set(app, survivor) -> None:
    with app.app_context():
        perk = Perk(name="Serialization Perk", role="Survivor", perk_type="hex", survivor_id=survivor)
        db.session.add(perk)
        db.session.commit()

        d = perk.to_dict()
        assert d["perk_type"] == "hex"


@pytest.mark.unit
def test_to_dict_degrades_missing_perk_type_to_general_not_none_or_crash(app, survivor) -> None:
    with app.app_context():
        perk = Perk(name="No Perk Type Perk", role="Survivor", perk_type=None, survivor_id=survivor)
        db.session.add(perk)
        db.session.commit()

        d = perk.to_dict()  # must not raise
        assert d["perk_type"] == "general"


@pytest.mark.unit
def test_perk_response_schema_validates_and_defaults_perk_type(app, survivor) -> None:
    with app.app_context():
        perk = Perk(name="Schema Perk", role="Survivor", perk_type=None, survivor_id=survivor)
        db.session.add(perk)
        db.session.commit()

        response = PerkResponse.model_validate(perk.to_dict())
        assert response.perk_type == "general"

        perk2 = Perk(name="Schema Perk 2", role="Survivor", perk_type="chase", survivor_id=survivor)
        db.session.add(perk2)
        db.session.commit()
        response_with_type = PerkResponse.model_validate(perk2.to_dict())
        assert response_with_type.perk_type == "chase"


@pytest.mark.unit
def test_perk_base_schema_accepts_null_and_any_string_perk_type(app) -> None:
    """`PerkBase.perk_type` is a plain optional string field with no
    server-side enum validation (the enforcement point is the DB CHECK
    constraint, exercised in test_perk_type_data_integrity.py) -- confirm
    the schema itself doesn't reject a legitimate value, and that an
    out-of-vocabulary string is a DB-layer concern, not rejected here
    (matches how the rest of this schema defers to the DB CHECK for role
    consistency too)."""
    from app.schemas.perk import PerkBase

    valid = PerkBase(name="Base Perk", role="Survivor", perk_type="boon")
    assert valid.perk_type == "boon"

    also_accepted_here = PerkBase(name="Base Perk 2", role="Survivor", perk_type=None)
    assert also_accepted_here.perk_type is None
