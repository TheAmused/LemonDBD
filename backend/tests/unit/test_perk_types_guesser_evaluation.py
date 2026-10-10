# backend/tests/unit/test_perk_types_guesser_evaluation.py
"""Classic Perk Guesser scoring of the `perk_types` column.

The same set of types is `correct` (order is not part of the comparison), any
overlap is `partial` and no overlap is `incorrect`.
"""
import pytest

from app.core.extensions import db
from app.models.perk import Perk
from app.services.minigames.evaluation import (
    _compare_perk_types,
    _evaluate_classic_perk,
)


@pytest.mark.unit
@pytest.mark.parametrize(
    ("target", "guess", "expected"),
    [
        (["aura"], ["aura"], "correct"),
        (["generator", "aura"], ["aura", "generator"], "correct"),
        (["generator", "aura"], ["aura"], "partial"),
        (["generator"], ["generator", "aura"], "partial"),
        (["generator", "aura"], ["aura", "chase"], "partial"),
        (["generator"], ["chase"], "incorrect"),
        (["entity"], ["aura", "chase"], "incorrect"),
    ],
)
def test_compare_perk_types(target, guess, expected) -> None:
    assert _compare_perk_types(target, guess) == expected


@pytest.fixture
def two_perks(app):
    with app.app_context():
        db.drop_all()
        db.create_all()
        db.session.add_all([
            Perk(id=1, name="Target Perk", role="Survivor", perk_types=["generator", "aura"]),
            Perk(id=2, name="Guess Perk", role="Survivor", perk_types=["aura", "chase"]),
        ])
        db.session.commit()
        yield
        db.session.remove()
        db.drop_all()


@pytest.mark.unit
def test_evaluate_classic_perk_reports_partial_and_the_guess_list(app, two_perks) -> None:
    with app.app_context():
        result = _evaluate_classic_perk(target_id=1, guess_id=2, attempt_number=1)

        assert result["attributes"]["perk_types"] == {"status": "partial"}
        assert result["guess"]["perk_types"] == ["aura", "chase"]
        assert "perk_type" not in result["guess"]
        assert "perk_type" not in result["attributes"]
