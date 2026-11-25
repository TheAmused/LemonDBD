# backend/tests/unit/smash/test_smash_reimport_keeps_votes.py
"""An edited roster seed file is merge-imported on the next boot: that must not wipe players' votes."""
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.smash_or_pass import Entity, Vote
from app.services.db.export_import import DatabaseExportImportService


def _payload(**entity_extra: Any) -> dict[str, Any]:
    entity: dict[str, Any] = {"slug": "reimport_entity", "name": "Reimport Entity", "role": "Killer", **entity_extra}
    return {
        "target": "rosters",
        "rosters": [{"slug": "reimport_roster", "name": "Reimport Roster", "description": "d", "entities": [entity]}],
    }


def _votes(db_session: Session) -> list[tuple[str | None, str]]:
    return [(vote.session_id, vote.vote_type) for vote in db_session.scalars(select(Vote)).all()]


def _import_with_one_vote(db_session: Session) -> None:
    DatabaseExportImportService.import_database(_payload(), mode="merge")
    entity = db_session.scalars(select(Entity).where(Entity.slug == "reimport_entity")).one()
    db_session.add(Vote(entity_id=entity.id, session_id="player_session", vote_type="smash"))
    db_session.commit()


@pytest.mark.unit
def test_a_roster_file_without_votes_keeps_the_existing_votes(db_session: Session) -> None:
    _import_with_one_vote(db_session)

    DatabaseExportImportService.import_database(_payload(bio="edited in the seed file"), mode="merge")

    assert _votes(db_session) == [("player_session", "smash")]


@pytest.mark.unit
def test_a_backup_that_lists_votes_still_replaces_them(db_session: Session) -> None:
    _import_with_one_vote(db_session)

    restored = _payload(votes=[{"session_id": "backup_session", "vote_type": "pass"}])
    DatabaseExportImportService.import_database(restored, mode="merge")

    assert _votes(db_session) == [("backup_session", "pass")]


@pytest.mark.unit
def test_a_backup_with_an_empty_vote_list_clears_them(db_session: Session) -> None:
    _import_with_one_vote(db_session)

    DatabaseExportImportService.import_database(_payload(votes=[]), mode="merge")

    assert _votes(db_session) == []
