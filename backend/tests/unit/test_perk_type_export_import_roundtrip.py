# backend/tests/unit/test_perk_type_export_import_roundtrip.py
"""Pins down the exact bug class caught during this session's rename work:
`perk_type` (then `curse_category`) silently getting dropped by the
export/import round-trip because `DatabaseExportImportService`'s perk
`update_fields` list is a separate, hand-maintained list from the model's
columns -- adding a column to the model and forgetting to add it there is a
silent, no-error data-loss bug that only shows up as "why did every perk
come back as general" days later. This must never regress unnoticed again.

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
            Perk(name="Roundtrip Exhaustion Perk", role="Survivor", perk_type="exhaustion", survivor_id=surv.id),
            Perk(name="Roundtrip General Perk", role="Survivor", perk_type="general", survivor_id=surv.id),
            Perk(name="Roundtrip Null Perk", role="Survivor", perk_type=None, survivor_id=surv.id),
        ])
        db.session.commit()
        yield
        db.session.remove()
        db.drop_all()


@pytest.mark.unit
def test_export_then_import_preserves_perk_type_for_every_perk(perk_seeded_app) -> None:
    with_perk_type_before = {
        p.name: p.perk_type
        for p in db.session.scalars(select(Perk)).all()
    }
    assert with_perk_type_before["Roundtrip Exhaustion Perk"] == "exhaustion"
    assert with_perk_type_before["Roundtrip General Perk"] == "general"
    assert with_perk_type_before["Roundtrip Null Perk"] is None

    exported = DatabaseExportImportService.export_database(targets=["perks"], include_assets=False)

    # Every exported perk row must actually carry the field -- proves the
    # serializer wasn't reverted to drop it.
    for row in _perks_rows(exported):
        assert "perk_type" in row, "perk_type missing from export payload -- serializer regressed"

    # Wipe and re-import.
    db.session.execute(Perk.__table__.delete())
    db.session.commit()
    assert db.session.scalar(select(Perk).limit(1)) is None

    DatabaseExportImportService.import_database(exported, targets=["perks"])

    after = {p.name: p.perk_type for p in db.session.scalars(select(Perk)).all()}
    assert after == with_perk_type_before, (
        "perk_type did not survive the export/import round-trip -- this is the exact "
        "silent-data-loss bug caught during the perk_type rename (a column present on "
        "the model but missing from DatabaseExportImportService's update_fields list "
        "gets dropped on import with no error)"
    )


@pytest.mark.unit
def test_import_of_a_legacy_export_missing_perk_type_key_entirely_does_not_crash(perk_seeded_app) -> None:
    """An export taken before `perk_type` existed (or hand-edited to strip
    it) must still import without raising -- the column is nullable and
    `_upsert_by_id` should simply leave it unset, not KeyError."""
    exported = DatabaseExportImportService.export_database(targets=["perks"], include_assets=False)
    for row in _perks_rows(exported):
        row.pop("perk_type", None)

    db.session.execute(Perk.__table__.delete())
    db.session.commit()

    # Must not raise.
    DatabaseExportImportService.import_database(exported, targets=["perks"])

    perks = db.session.scalars(select(Perk)).all()
    assert len(perks) == 3
    for p in perks:
        assert p.perk_type is None or p.perk_type == "general"
