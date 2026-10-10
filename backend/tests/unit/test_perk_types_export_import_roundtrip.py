# backend/tests/unit/test_perk_types_export_import_roundtrip.py
"""Pins down the bug class caught during the original `perk_type` rename work:
`DatabaseExportImportService`'s perk `update_fields` is a separate,
hand-maintained list from the model's columns, so adding a column and
forgetting it there is a silent, no-error data-loss bug that only shows up
days later as "why did every perk come back as entity". `perk_types` is
handled outside that list (it is validated through the pydantic schema on the
way in), so the round trip is pinned here, together with the two ways an old
payload can be shaped and the one way a bad payload must fail.

Follows the same pattern as
`tests/unit/api/test_full_db_migration_workflow.py`: SQLite in-memory,
`app` fixture from `tests/unit/conftest.py`.
"""
import pytest
from sqlalchemy import select

from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.character import Survivor
from app.models.perk import Perk
from app.services.db.export_import import DatabaseExportImportService


def _perks_rows(exported: dict) -> list[dict]:
    """`export_database` nests everything under `groups[<group_name>]`, and
    which group "perks" lands in is an implementation detail this test
    shouldn't hardcode -- so find it generically, the same way
    `import_database` itself flattens `groups` back into a flat dict."""
    for group in exported.get("groups", {}).values():
        if isinstance(group, dict) and "perks" in group:
            return group["perks"]
    raise AssertionError("no 'perks' key found in any export group")


def _wipe_perks() -> None:
    db.session.execute(Perk.__table__.delete())
    db.session.commit()
    assert db.session.scalar(select(Perk).limit(1)) is None


def _types_by_name() -> dict[str, list[str]]:
    return {p.name: p.perk_types for p in db.session.scalars(select(Perk)).all()}


@pytest.fixture
def perk_seeded_app(app):
    with app.app_context():
        db.drop_all()
        db.create_all()
        chapter = Chapter(name="Test Chapter")
        db.session.add(chapter)
        db.session.flush()
        surv = Survivor(name="Test Survivor", chapter_id=chapter.id)
        db.session.add(surv)
        db.session.flush()

        db.session.add_all([
            Perk(name="Roundtrip Exhaustion Perk", role="Survivor", perk_types=["exhaustion"], survivor_id=surv.id),
            Perk(name="Roundtrip Two Types Perk", role="Survivor", perk_types=["generator", "aura"], survivor_id=surv.id),
            Perk(name="Roundtrip Reversed Perk", role="Survivor", perk_types=["aura", "generator"], survivor_id=surv.id),
            Perk(name="Roundtrip Default Perk", role="Survivor", survivor_id=surv.id),
        ])
        db.session.commit()
        yield
        db.session.remove()
        db.drop_all()


@pytest.mark.unit
def test_export_then_import_preserves_perk_types_and_their_order(perk_seeded_app) -> None:
    before = _types_by_name()
    assert before["Roundtrip Two Types Perk"] == ["generator", "aura"]
    assert before["Roundtrip Reversed Perk"] == ["aura", "generator"]
    assert before["Roundtrip Default Perk"] == ["entity"]

    exported = DatabaseExportImportService.export_database(targets=["perks"], include_assets=False)

    # Every exported perk row carries the list and not the retired key.
    for row in _perks_rows(exported):
        assert isinstance(row.get("perk_types"), list) and row["perk_types"], "perk_types missing from export"
        assert "perk_type" not in row

    _wipe_perks()
    DatabaseExportImportService.import_database(exported, targets=["perks"])

    assert _types_by_name() == before


@pytest.mark.unit
def test_import_of_an_older_export_missing_the_key_entirely_defaults_to_entity(perk_seeded_app) -> None:
    exported = DatabaseExportImportService.export_database(targets=["perks"], include_assets=False)
    for row in _perks_rows(exported):
        row.pop("perk_types", None)

    _wipe_perks()
    DatabaseExportImportService.import_database(exported, targets=["perks"])

    perks = db.session.scalars(select(Perk)).all()
    assert len(perks) == 4
    assert all(p.perk_types == ["entity"] for p in perks)


@pytest.mark.unit
def test_import_of_a_pre_list_export_turns_the_single_perk_type_into_a_one_entry_list(perk_seeded_app) -> None:
    exported = DatabaseExportImportService.export_database(targets=["perks"], include_assets=False)
    legacy_types = {
        "Roundtrip Exhaustion Perk": "exhaustion",
        "Roundtrip Two Types Perk": "generator",
        "Roundtrip Reversed Perk": None,
        "Roundtrip Default Perk": "",
    }
    for row in _perks_rows(exported):
        row.pop("perk_types")
        row["perk_type"] = legacy_types[row["name"]]

    _wipe_perks()
    DatabaseExportImportService.import_database(exported, targets=["perks"])

    assert _types_by_name() == {
        "Roundtrip Exhaustion Perk": ["exhaustion"],
        "Roundtrip Two Types Perk": ["generator"],
        "Roundtrip Reversed Perk": ["entity"],
        "Roundtrip Default Perk": ["entity"],
    }


@pytest.mark.unit
@pytest.mark.parametrize(
    ("perk_types", "message"),
    [
        (["aura", "aura"], "repeat"),
        (["entity", "aura"], "catch-all"),
        (["not_a_type"], "Input should be"),
        ([], "at least 1"),
        (["hooks"], "only exists on Killer"),
    ],
)
def test_import_refuses_an_invalid_list_and_names_the_perk(perk_seeded_app, perk_types, message) -> None:
    exported = DatabaseExportImportService.export_database(targets=["perks"], include_assets=False)
    victim = _perks_rows(exported)[0]
    victim["perk_types"] = perk_types
    _wipe_perks()

    with pytest.raises(Exception) as excinfo:
        DatabaseExportImportService.import_database(exported, targets=["perks"])

    text = str(excinfo.value)
    assert message in text
    assert victim["name"] in text
