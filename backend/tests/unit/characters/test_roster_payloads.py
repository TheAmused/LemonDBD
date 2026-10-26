# backend/tests/unit/characters/test_roster_payloads.py
"""Roster endpoints send what a grid reads, not every character's lore in five languages."""
import json

import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import Perk, User
from tests.unit.conftest import make_killer, make_survivor

HEAVY = ("lore", "translations", "dlc_counterparts", "emoji_riddle")
LORE = "A very long backstory. " * 200


@pytest.fixture
def roster(db_session) -> User:
    meg = make_survivor(db_session, "Meg Thomas", id=2, lore=LORE, translations={"de": {"lore": LORE}, "ja": {"lore": LORE}})
    make_killer(db_session, "The Trapper", id=1, lore=LORE, emoji_riddle="🐻", translations={"ja": {"name": "トラッパー", "lore": LORE}})
    db.session.add(Perk(name="Sprint Burst", role="Survivor", survivor_id=meg.id, description="Run", translations={"de": {"name": "Sprinten", "description": "Lauf"}}))
    user = User(login="owner", username="owner", email="owner@example.com", password_hash=hash_password("password123"), is_verified=True)
    db.session.add(user)
    db.session.commit()
    return user


@pytest.mark.unit
def test_public_roster_rows_are_light(client: FlaskClient, roster: User) -> None:
    for url in ("/api/v1/characters?lang=ja", "/api/v1/survivors", "/api/v1/killers"):
        rows = client.get(url).get_json()["data"]
        assert rows
        for row in rows:
            assert not set(HEAVY) & set(row), url
            assert {"id", "name", "slug", "category", "avatar_local_path", "is_disabled"} <= set(row)
            assert "power" not in row
    assert len(json.dumps(client.get("/api/v1/characters").get_json())) < 4000


@pytest.mark.unit
def test_detail_still_has_lore(client: FlaskClient, roster: User) -> None:
    character = client.get("/api/v1/characters/the_trapper/detail").get_json()["data"]["character"]
    assert character["lore"].startswith("A very long backstory.")


@pytest.mark.unit
def test_ownership_lists_are_light(client: FlaskClient, roster: User) -> None:
    headers = {"Authorization": f"Bearer {generate_token(roster.id, role='user')}"}
    characters = client.get(f"/api/v1/users/{roster.id}/characters", headers=headers).get_json()["data"]
    assert characters and all(not set(HEAVY) & set(c) for c in characters)
    assert all({"id", "role", "is_owned", "is_free"} <= set(c) for c in characters)

    perks = client.get(f"/api/v1/users/{roster.id}/perks?lang=de", headers=headers).get_json()["data"]
    assert perks and all("translations" not in p for p in perks)
    assert perks[0]["name"] == "Sprinten"
