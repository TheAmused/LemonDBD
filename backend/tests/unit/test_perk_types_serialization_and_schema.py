# backend/tests/unit/test_perk_types_serialization_and_schema.py
"""`Perk.to_dict()` / `PerkResponse` exposing `perk_types`, and the pydantic
rules `PerkBase` enforces on the way in (the single definition of a valid
list lives in `app.models.perk_types`; this file pins that the schema applies
it, including the one rule that depends on the perk's role).
"""
import pytest
from pydantic import ValidationError

from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.character import Survivor
from app.models.perk import Perk
from app.schemas.perk import PerkBase, PerkResponse


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
def test_to_dict_exposes_the_ordered_list_and_not_the_retired_key(app, survivor) -> None:
    with app.app_context():
        perk = Perk(name="Serialization Perk", role="Survivor", perk_types=["generator", "aura"], survivor_id=survivor)
        db.session.add(perk)
        db.session.commit()

        d = perk.to_dict()
        assert d["perk_types"] == ["generator", "aura"]
        assert "perk_type" not in d


@pytest.mark.unit
def test_to_dict_returns_a_copy_so_callers_cannot_mutate_the_row(app, survivor) -> None:
    with app.app_context():
        perk = Perk(name="Copy Perk", role="Survivor", perk_types=["hex"], survivor_id=survivor)
        db.session.add(perk)
        db.session.commit()

        perk.to_dict()["perk_types"].append("aura")
        assert perk.perk_types == ["hex"]


@pytest.mark.unit
def test_a_perk_with_no_stated_type_serializes_as_entity(app, survivor) -> None:
    with app.app_context():
        unflushed = Perk(name="Unflushed Perk", role="Survivor", survivor_id=survivor)
        assert unflushed.to_dict()["perk_types"] == ["entity"]  # must not raise before the default applies

        db.session.add(unflushed)
        db.session.commit()
        assert unflushed.to_dict()["perk_types"] == ["entity"]
        assert unflushed.primary_perk_type == "entity"


@pytest.mark.unit
def test_perk_response_round_trips_the_list(app, survivor) -> None:
    with app.app_context():
        perk = Perk(name="Schema Perk", role="Survivor", perk_types=["chase", "stealth"], survivor_id=survivor)
        db.session.add(perk)
        db.session.commit()

        response = PerkResponse.model_validate(perk.to_dict())
        assert response.perk_types == ["chase", "stealth"]
        assert "perk_type" not in response.model_dump()


@pytest.mark.unit
def test_perk_base_defaults_to_the_catch_all() -> None:
    assert PerkBase(name="Base Perk").perk_types == ["entity"]


@pytest.mark.unit
def test_perk_base_accepts_one_to_three_distinct_types_in_order() -> None:
    assert PerkBase(name="P", role="Survivor", perk_types=["boon"]).perk_types == ["boon"]
    assert PerkBase(name="P", role="Survivor", perk_types=["aura", "generator"]).perk_types == ["aura", "generator"]
    assert PerkBase(name="P", role="Killer", perk_types=["hex", "aura", "chase"]).perk_types == ["hex", "aura", "chase"]


@pytest.mark.unit
@pytest.mark.parametrize(
    ("perk_types", "message"),
    [
        ([], "at least 1"),
        (["warp"], "Input should be"),
        (["aura", "aura"], "repeat"),
        (["entity", "aura"], "catch-all"),
        (["aura", "entity"], "catch-all"),
        (["aura", "chase", "hex", "stealth"], "at most 3"),
        (None, "valid list"),
        ("aura", "valid list"),
    ],
)
def test_perk_base_rejects_malformed_lists(perk_types, message) -> None:
    with pytest.raises(ValidationError, match=message):
        PerkBase(name="Bad Perk", role="Survivor", perk_types=perk_types)


@pytest.mark.unit
@pytest.mark.parametrize(
    ("role", "perk_types", "allowed"),
    [
        ("Killer", ["exhaustion"], False),
        ("Killer", ["aura", "boon"], False),
        ("Survivor", ["hooks"], False),
        ("Survivor", ["chase", "hooks"], False),
        ("Survivor", ["exhaustion"], True),
        ("Survivor", ["aura", "boon"], True),
        ("Killer", ["hooks"], True),
        ("Killer", ["hex", "hooks"], True),
    ],
)
def test_role_only_types_must_match_the_perks_role(role, perk_types, allowed) -> None:
    if allowed:
        assert PerkBase(name="P", role=role, perk_types=perk_types).perk_types == perk_types
    else:
        with pytest.raises(ValidationError, match="only exists on"):
            PerkBase(name="P", role=role, perk_types=perk_types)


@pytest.mark.unit
def test_the_retired_perk_type_key_is_rejected_not_silently_ignored() -> None:
    with pytest.raises(ValidationError, match="replaced by `perk_types`"):
        PerkBase.model_validate({"name": "Old Client Perk", "role": "Survivor", "perk_type": "boon"})
