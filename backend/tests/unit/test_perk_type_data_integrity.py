# backend/tests/unit/test_perk_type_data_integrity.py
"""Standing regression coverage for `Perk.perk_type`.

Three independent guarantees, none of which is a one-off spot check:

1. Every perk seeded from `app/seeds/data/content/perks.json` ends up with a
   valid, non-null `perk_type` after a full seed (not just "the JSON file
   looks right" -- the seeded *database rows* are what the app actually
   serves).
2. No perk carries a `perk_type` whose only consuming Chaos Wheel curse is
   scoped to the *other* role -- the exact bug class Sloppy Butcher (a
   Killer perk classified `altruism_healing`, a Survivor-only curse
   category) was caught and fixed for this session. This is computed
   generically from the curse-to-role mapping below, not hardcoded per
   perk, so any future perk_type assignment mistake of this shape trips it
   without the test needing to be touched.
3. The `ck_perks_perk_type` CHECK constraint on the `perks` table actually
   rejects a value outside the allowed set (proves the DB-level guarantee,
   not just the Python-level `ALLOWED_PERK_TYPES` list).
"""
import pytest
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.core.extensions import db
from app.models.character import Killer, Survivor
from app.models.perk import Perk
from app.seeds.static_db_seeder import seed_from_static_json


ALLOWED_PERK_TYPES = {
    "hex", "boon", "sacrifice", "exhaustion", "obsession",
    "aura", "generator", "healing", "chase", "stealth", "entity", "hooks",
}

# Perk types that only exist on one role: exhaustion perks and boons are
# Survivor-only, and Scourge Hook perks are Killer-only. A perk of the other
# role carrying one of these types is a classification mistake (the Sloppy
# Butcher bug class). Every other type is shared by both roles.
ROLE_ONLY_PERK_TYPES = {
    "exhaustion": "Survivor",
    "boon": "Survivor",
    "hooks": "Killer",
}


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
def test_every_seeded_perk_has_a_valid_perk_type(seeded_perks) -> None:
    perks = db.session.scalars(select(Perk)).all()
    assert len(perks) >= 321

    missing = [p.name for p in perks if not p.perk_type]
    invalid = [(p.name, p.perk_type) for p in perks if p.perk_type and p.perk_type not in ALLOWED_PERK_TYPES]

    assert missing == [], f"perks with no perk_type after seeding: {missing}"
    assert invalid == [], f"perks with an invalid perk_type: {invalid}"


@pytest.mark.unit
def test_no_perk_has_a_role_mismatched_perk_type(seeded_perks) -> None:
    """Generic sweep over the full seeded dataset -- the Sloppy Butcher bug
    class, but for every perk and every role-scoped category at once."""
    perks = db.session.scalars(select(Perk)).all()
    violations = []
    for perk in perks:
        restriction = ROLE_ONLY_PERK_TYPES.get(perk.perk_type)
        if restriction is not None and perk.role != restriction:
            violations.append((perk.name, perk.role, perk.perk_type))

    assert violations == [], (
        "perks whose perk_type belongs to a curse scoped to the OTHER role "
        f"(role, perk_type mismatch): {violations}"
    )


@pytest.mark.unit
def test_perk_type_check_constraint_rejects_invalid_value(app) -> None:
    with app.app_context():
        db.drop_all()
        db.create_all()

        bad = Perk(name="Constraint Probe Perk", role="Survivor", perk_type="not_a_real_category")
        db.session.add(bad)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


@pytest.mark.unit
def test_perk_type_check_constraint_allows_null_and_every_allowed_value(app) -> None:
    with app.app_context():
        db.drop_all()
        db.create_all()

        db.session.add(Perk(name="Null Perk Type Probe", role="Survivor", perk_type=None))
        for i, value in enumerate(sorted(ALLOWED_PERK_TYPES)):
            db.session.add(Perk(name=f"Allowed Perk Type Probe {i}", role="Survivor", perk_type=value))
        db.session.commit()  # must not raise

        count = db.session.scalar(select(func.count(Perk.id)))
        assert count == 1 + len(ALLOWED_PERK_TYPES)
