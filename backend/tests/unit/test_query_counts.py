# backend/tests/unit/test_query_counts.py
"""The number of SQL statements must not grow with the number of rows (no N+1 loops)."""
from contextlib import contextmanager
from pathlib import Path

import pytest
from sqlalchemy import event, select

from app.core.extensions import db
from app.models import Killer, Perk, User
from app.models.gauntlet import GauntletMatchLog, GauntletRun
from app.models.smash_or_pass import Entity, Roster, Vote
from tests.unit.conftest import make_chapter


@contextmanager
def counting_selects():
    statements: list[str] = []

    def _record(conn, cursor, statement, parameters, context, executemany):  # noqa: ANN001
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    event.listen(db.engine, "before_cursor_execute", _record)
    try:
        yield statements
    finally:
        event.remove(db.engine, "before_cursor_execute", _record)


def _user(name: str) -> User:
    user = User(login=name, username=name, email=f"{name}@example.com", password_hash="h")
    db.session.add(user)
    db.session.flush()
    return user


@pytest.mark.unit
def test_session_vote_sync_does_not_query_per_vote(db_session, monkeypatch) -> None:
    from app.seeds.smash_roster_seeder import seed_smash_rosters
    from app.services.smash_or_pass_service import SmashOrPassService

    seed_smash_rosters()
    service = SmashOrPassService()
    monkeypatch.setattr(service, "ensure_seeded", lambda: None)
    monkeypatch.setattr(service, "recalculate_stat_for_entity", lambda entity_id: None)
    entities = db.session.scalars(select(Entity).order_by(Entity.id).limit(12)).all()
    assert len(entities) == 12

    def _sync(count: int) -> int:
        user = _user(f"syncer{count}")
        session_id = f"guest-{count}"
        for entity in entities[:count]:
            db.session.add(Vote(entity_id=entity.id, session_id=session_id, vote_type="smash"))
        # The account already voted on the first entity: its own vote wins.
        db.session.add(Vote(entity_id=entities[0].id, user_id=user.id, vote_type="pass"))
        db.session.commit()
        db.session.expire_all()
        with counting_selects() as statements:
            result = service.sync_session_votes(user.id, session_id)
        assert result["synced_count"] == count - 1
        return len(statements)

    assert _sync(3) == _sync(12)


@pytest.mark.unit
def test_chaos_perks_load_their_killers_in_the_same_query(db_session) -> None:
    from app.services.chaos.roller import resolve_perks_by_ids

    chapter = make_chapter(db.session)
    ids = []
    for n in range(1, 6):
        killer = Killer(id=n, name=f"The Killer {n}", chapter_id=chapter.id, power_name=f"Power {n}")
        db.session.add(killer)
        db.session.flush()
        perk = Perk(name=f"Killer Perk {n}", killer_id=killer.id, is_teachable=True, role="Killer")
        db.session.add(perk)
        db.session.flush()
        ids.append(perk.id)
    db.session.commit()
    db.session.expire_all()

    with counting_selects() as statements:
        perks = resolve_perks_by_ids(ids)
    assert len(perks) == 5
    assert len(statements) == 1, statements


@pytest.mark.unit
def test_run_export_loads_logs_and_owners_in_bulk(db_session) -> None:
    from app.services.db.run_family_export import export_run_family

    for n in range(5):
        user = _user(f"runner{n}")
        run = GauntletRun(user_id=user.id, role="Survivor", game_mode="original", current_character_id="claudette")
        db.session.add(run)
        db.session.flush()
        for result in ("win", "loss"):
            db.session.add(GauntletMatchLog(
                run_id=run.id, role="Survivor", character_id="claudette", result=result,
                streak_before=0, streak_after=1,
            ))
    db.session.commit()
    db.session.expire_all()

    export: dict = {}
    counts: dict[str, int] = {}
    with counting_selects() as statements:
        export_run_family(export, counts, "gauntlet_runs", GauntletRun, GauntletMatchLog, "match_logs")
    assert counts["gauntlet_runs"] == 5
    assert all(len(row["match_logs"]) == 2 for row in export["gauntlet_runs"])
    assert len(statements) <= 3, statements  # runs, their logs, the owners' logins


@pytest.mark.unit
def test_roster_export_does_not_query_per_entity(db_session, tmp_path: Path) -> None:
    from app.seeds.smash_roster_seeder import seed_smash_rosters
    from app.services.db.export_writer import build_export

    seed_smash_rosters()
    db.session.commit()
    entity_count = db.session.query(Entity).count()
    roster_count = db.session.query(Roster).count()
    assert entity_count > 20
    db.session.expire_all()

    with counting_selects() as statements:
        build_export({"rosters"}, include_assets=False, static_dir=tmp_path)
    # users, rosters, entities, stats, votes -- whatever the size of the rosters
    assert len(statements) <= 6, f"{len(statements)} SELECTs for {roster_count} rosters / {entity_count} entities"
