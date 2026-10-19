# backend/tests/unit/api/test_bulk_ownership.py
"""Bulk ownership saves validate their input and run a fixed number of queries."""
import pytest
from flask.testing import FlaskClient
from sqlalchemy import event

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import Perk, User, UserCharacterOwnership, UserPerkOwnership
from app.services.ownership.characters import seed_default_character_ownership
from tests.unit.conftest import make_killer, make_survivor


@pytest.fixture
def roster(db_session) -> dict:
    survivors = [make_survivor(db_session, f"Survivor {i}", id=i) for i in range(1, 21)]
    killers = [make_killer(db_session, f"Killer {i}", id=i) for i in range(1, 21)]
    perks = []
    for s in survivors:
        perks += [Perk(name=f"{s.name} perk {n}", role="Survivor", survivor_id=s.id) for n in range(3)]
    for k in killers:
        perks += [Perk(name=f"{k.name} perk {n}", role="Killer", killer_id=k.id) for n in range(3)]
    db.session.add_all(perks)
    user = User(login="bulk", username="bulk", email="bulk@example.com", password_hash=hash_password("password123"), is_verified=True)
    db.session.add(user)
    db.session.commit()
    return {"user": user, "perks": perks, "headers": {"Authorization": f"Bearer {generate_token(user.id, role='user')}"}}


class _QueryCounter:
    """Counts SELECTs. INSERTs are one per new row on SQLite (Postgres batches them), so they are
    not what this guards: the old loops ran two or three SELECTs *per row*."""

    def __init__(self) -> None:
        self.count = 0

    def __call__(self, _conn, _cursor, statement, *_args) -> None:
        if statement.lstrip().upper().startswith("SELECT"):
            self.count += 1

    def __enter__(self):
        event.listen(db.engine, "before_cursor_execute", self)
        return self

    def __exit__(self, *_exc) -> None:
        event.remove(db.engine, "before_cursor_execute", self)


@pytest.mark.unit
@pytest.mark.parametrize("body", [{"updates": ["x"]}, {"updates": [1, 2]}, {"updates": "nope"}, {"updates": [{}] * 1001}])
def test_malformed_requests_are_400s(client: FlaskClient, roster, body) -> None:
    uid = roster["user"].id
    assert client.post(f"/api/v1/users/{uid}/characters/bulk", json=body, headers=roster["headers"]).status_code == 400
    assert client.post(f"/api/v1/users/{uid}/perks/bulk", json=body, headers=roster["headers"]).status_code == 400


@pytest.mark.unit
@pytest.mark.parametrize(
    "body",
    [{"character_id": 3, "is_owned": False}, {"character_id": "abc", "role": "killer"}, {"character_id": 3, "role": "both"}],
)
def test_single_character_update_needs_a_role_and_a_real_id(client: FlaskClient, roster, body) -> None:
    uid = roster["user"].id
    assert client.post(f"/api/v1/users/{uid}/characters", json=body, headers=roster["headers"]).status_code == 400


@pytest.mark.unit
def test_single_perk_update_rejects_a_junk_id(client: FlaskClient, roster) -> None:
    uid = roster["user"].id
    assert client.post(f"/api/v1/users/{uid}/perks", json={"perk_id": "abc"}, headers=roster["headers"]).status_code == 400


@pytest.mark.unit
def test_unknown_ids_are_skipped_not_inserted(client: FlaskClient, roster) -> None:
    uid = roster["user"].id
    res = client.post(f"/api/v1/users/{uid}/characters/bulk", json={"updates": [
        {"character_id": 999, "role": "killer", "is_owned": False},
        {"character_id": "abc", "role": "killer", "is_owned": False},
        {"character_id": 3, "role": "killer", "is_owned": False},
    ]}, headers=roster["headers"]).get_json()["data"]
    assert res["updated_count"] == 1
    assert res["skipped_unknown"] == [999]
    assert res["auto_locked_perks_count"] == 3

    res = client.post(f"/api/v1/users/{uid}/perks/bulk", json={"updates": [{"perk_id": 99999, "is_unlocked": False}]}, headers=roster["headers"]).get_json()["data"]
    assert res["updated_count"] == 0 and res["skipped_unknown"] == [99999]
    assert db.session.query(UserPerkOwnership).filter_by(perk_id=99999).count() == 0


@pytest.mark.unit
def test_the_query_count_does_not_grow_with_the_list(app, client: FlaskClient, roster) -> None:
    uid = roster["user"].id
    every_perk = [{"perk_id": p.id, "is_unlocked": False} for p in roster["perks"]]
    with _QueryCounter() as counter:
        seed_default_character_ownership(uid)
    assert db.session.query(UserCharacterOwnership).filter_by(user_id=uid).count() == 40
    seed_queries = counter.count

    with _QueryCounter() as counter:
        assert client.post(f"/api/v1/users/{uid}/perks/bulk", json={"updates": every_perk}, headers=roster["headers"]).status_code == 200
    # 120 perks: a handful of SELECTs for auth, the save and the summary -- not two per perk.
    assert counter.count < 15, counter.count
    # 40 characters and their 120 perks: not ~5 per character.
    assert seed_queries < 15, seed_queries
