# backend/tests/unit/test_perk_types_data_integrity.py
"""Standing regression coverage for `Perk.perk_types`.

Four independent guarantees, none of which is a one-off spot check:

1. Every perk seeded from `app/seeds/data/content/perks.json` ends up with a
   valid `perk_types` list after a full seed (not just "the JSON file looks
   right" -- the seeded *database rows* are what the app actually serves).
2. No perk carries a role-scoped type (exhaustion, boon, hooks) on the other
   side -- the exact bug class Sloppy Butcher (a Killer perk classified as a
   Survivor-only healing type) was caught and fixed for. It is computed
   generically from `ROLE_ONLY_PERK_TYPES`, not hardcoded per perk.
3. The pydantic rules -- vocabulary, 1-3 entries, no repeats, `entity` only
   alone -- are enforced when the list is assigned to the model.
4. Each seed row also passes the write schema (`PerkBase`), so the file cannot
   drift out of what the API itself would accept.
"""
import json
from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select

from app.core.extensions import db
from app.models.perk import Perk
from app.models.perk_types import MAX_PERK_TYPES, PERK_TYPES, ROLE_ONLY_PERK_TYPES
from app.schemas.perk import PerkBase
from app.seeds.static_db_seeder import seed_from_static_json

PERKS_JSON = Path(__file__).resolve().parents[2] / "app" / "seeds" / "data" / "content" / "perks.json"

ALLOWED_PERK_TYPES = {
    "hex", "boon", "sacrifice", "exhaustion", "obsession",
    "aura", "generator", "healing", "chase", "stealth", "entity", "hooks",
}


def _seed_rows() -> list[dict]:
    payload = json.loads(PERKS_JSON.read_text(encoding="utf-8"))
    return payload["perks"] if isinstance(payload, dict) else payload


@pytest.fixture
def seeded_perks(app):
    with app.app_context():
        db.drop_all()
        db.create_all()
        result = seed_from_static_json(force=True)
        assert result["status"] == "success"
        yield
        db.session.remove()


@pytest.mark.unit
def test_vocabulary_matches_the_documented_twelve_types() -> None:
    assert set(PERK_TYPES) == ALLOWED_PERK_TYPES
    assert len(PERK_TYPES) == len(ALLOWED_PERK_TYPES)


@pytest.mark.unit
def test_every_seeded_perk_has_a_valid_perk_types_list(seeded_perks) -> None:
    perks = db.session.scalars(select(Perk)).all()
    assert len(perks) >= 321

    problems = []
    for perk in perks:
        types = perk.perk_types
        if not isinstance(types, list) or not types:
            problems.append((perk.name, "missing or empty", types))
            continue
        if len(types) > MAX_PERK_TYPES:
            problems.append((perk.name, "too many", types))
        if len(set(types)) != len(types):
            problems.append((perk.name, "repeated type", types))
        if any(t not in ALLOWED_PERK_TYPES for t in types):
            problems.append((perk.name, "unknown type", types))
        if "entity" in types and len(types) > 1:
            problems.append((perk.name, "entity combined with another type", types))

    assert problems == [], f"perks with an invalid perk_types list: {problems}"


@pytest.mark.unit
def test_no_perk_has_a_role_mismatched_perk_type(seeded_perks) -> None:
    """Generic sweep over the full seeded dataset -- every entry of every list."""
    violations = []
    for perk in db.session.scalars(select(Perk)).all():
        for perk_type in perk.perk_types:
            restriction = ROLE_ONLY_PERK_TYPES.get(perk_type)
            if restriction is not None and perk.role != restriction:
                violations.append((perk.name, perk.role, perk_type))

    assert violations == [], f"perks whose perk_types belong to the OTHER role (role, type mismatch): {violations}"


@pytest.mark.unit
def test_every_seed_row_passes_the_write_schema() -> None:
    rows = _seed_rows()
    assert len(rows) >= 321
    failures = []
    for row in rows:
        assert "perk_type" not in row, f"{row.get('name')} still carries the retired perk_type key"
        try:
            PerkBase.model_validate(row)
        except ValidationError as err:
            failures.append((row.get("name"), [e["msg"] for e in err.errors()]))
    assert failures == [], f"seed rows the write schema rejects: {failures}"


@pytest.mark.unit
def test_deja_vu_is_both_a_generator_and_an_aura_perk_with_generator_first(seeded_perks) -> None:
    deja_vu = db.session.scalar(select(Perk).where(Perk.name == "Déjà Vu"))
    assert deja_vu is not None
    assert deja_vu.perk_types == ["generator", "aura"]
    assert deja_vu.primary_perk_type == "generator"


@pytest.mark.unit
@pytest.mark.parametrize(
    "value",
    [
        ["not_a_real_category"],
        [],
        None,
        "aura",
        ["aura", "aura"],
        ["entity", "aura"],
        ["aura", "entity"],
        ["aura", "chase", "hex", "stealth"],
        ["Aura"],
        [1],
    ],
)
def test_assigning_an_invalid_list_to_the_model_is_rejected(value) -> None:
    perk = Perk(name="Constraint Probe Perk", role="Survivor")
    with pytest.raises(ValidationError):
        perk.perk_types = value


@pytest.mark.unit
def test_every_allowed_type_and_the_maximum_length_persist_in_order(app) -> None:
    with app.app_context():
        db.drop_all()
        db.create_all()

        db.session.add(Perk(name="Defaulted Probe", role="Survivor"))
        for i, value in enumerate(sorted(ALLOWED_PERK_TYPES)):
            role = ROLE_ONLY_PERK_TYPES.get(value, "Survivor")
            db.session.add(Perk(name=f"Allowed Probe {i}", role=role, perk_types=[value]))
        db.session.add(Perk(name="Three Types Probe", role="Survivor", perk_types=["chase", "aura", "stealth"]))
        db.session.commit()

        assert db.session.scalar(select(func.count(Perk.id))) == 1 + len(ALLOWED_PERK_TYPES) + 1
        assert db.session.scalar(select(Perk).where(Perk.name == "Defaulted Probe")).perk_types == ["entity"]
        assert db.session.scalar(select(Perk).where(Perk.name == "Three Types Probe")).perk_types == [
            "chase", "aura", "stealth",
        ]
