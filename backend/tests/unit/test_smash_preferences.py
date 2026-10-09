# backend/tests/unit/test_smash_preferences.py
import time

import pytest
from flask import Flask
from sqlalchemy.orm import Session

from app.core.security import generate_token
from app.models.smash_or_pass import SmashUserPreference
from app.services.user.data_export import export_user_data
from tests.unit.smash_api_support import create_user as _create_user, setup_smash_data  # noqa: F401 (autouse fixture)

URL = "/api/v1/smash-or-pass/preferences"


def _headers(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user_id, role='user')}"}


@pytest.mark.unit
class TestSmashPreferences:
    """The effects-and-music choice saved on a signed-in viewer's account."""

    def test_requires_a_signed_in_user(self, app: Flask) -> None:
        client = app.test_client()
        assert client.get(URL).status_code == 401
        assert client.put(URL, json={"effects": True, "music": True, "chosen_at": 1}).status_code == 401

    def test_no_choice_yet_reads_as_null(self, app: Flask, db_session: Session) -> None:
        user = _create_user(db_session)
        res = app.test_client().get(URL, headers=_headers(user.id))
        assert res.status_code == 200
        assert res.get_json() == {"data": None}

    def test_save_then_read_back(self, app: Flask, db_session: Session) -> None:
        user = _create_user(db_session)
        client = app.test_client()
        res = client.put(URL, headers=_headers(user.id), json={"effects": False, "music": True, "chosen_at": 1000})
        assert res.status_code == 200
        assert res.get_json() == {"data": {"effects": False, "music": True, "chosen_at": 1000}, "applied": True}
        assert client.get(URL, headers=_headers(user.id)).get_json()["data"] == {
            "effects": False,
            "music": True,
            "chosen_at": 1000,
        }

    def test_a_later_choice_replaces_an_earlier_one(self, app: Flask, db_session: Session) -> None:
        user = _create_user(db_session)
        client = app.test_client()
        client.put(URL, headers=_headers(user.id), json={"effects": False, "music": False, "chosen_at": 1000})
        res = client.put(URL, headers=_headers(user.id), json={"effects": True, "music": True, "chosen_at": 2000})
        assert res.get_json() == {"data": {"effects": True, "music": True, "chosen_at": 2000}, "applied": True}
        assert db_session.query(SmashUserPreference).count() == 1

    def test_an_older_choice_does_not_overwrite_a_newer_one(self, app: Flask, db_session: Session) -> None:
        user = _create_user(db_session)
        client = app.test_client()
        client.put(URL, headers=_headers(user.id), json={"effects": False, "music": False, "chosen_at": 2000})
        res = client.put(URL, headers=_headers(user.id), json={"effects": True, "music": True, "chosen_at": 1000})
        assert res.get_json() == {"data": {"effects": False, "music": False, "chosen_at": 2000}, "applied": False}

    def test_a_choice_dated_in_the_future_cannot_pin_the_account(self, app: Flask, db_session: Session) -> None:
        user = _create_user(db_session)
        client = app.test_client()
        far_future = int(time.time() * 1000) + 10 * 365 * 24 * 3600 * 1000
        res = client.put(URL, headers=_headers(user.id), json={"effects": False, "music": False, "chosen_at": far_future})
        assert res.get_json()["data"]["chosen_at"] <= int(time.time() * 1000)
        later = client.put(
            URL, headers=_headers(user.id), json={"effects": True, "music": True, "chosen_at": int(time.time() * 1000) + 5}
        )
        assert later.get_json()["applied"] is True

    @pytest.mark.parametrize(
        "body",
        [{}, {"effects": True}, {"effects": "maybe", "music": True, "chosen_at": 1}, {"effects": True, "music": True, "chosen_at": -5}],
    )
    def test_rejects_a_malformed_choice(self, app: Flask, db_session: Session, body: dict) -> None:
        user = _create_user(db_session)
        assert app.test_client().put(URL, headers=_headers(user.id), json=body).status_code == 400

    def test_accounts_do_not_share_a_choice(self, app: Flask, db_session: Session) -> None:
        first = _create_user(db_session, username="first", email="first@test.com")
        second = _create_user(db_session, username="second", email="second@test.com")
        client = app.test_client()
        client.put(URL, headers=_headers(first.id), json={"effects": False, "music": False, "chosen_at": 5})
        assert client.get(URL, headers=_headers(second.id)).get_json() == {"data": None}

    def test_it_is_part_of_the_users_data_export(self, app: Flask, db_session: Session) -> None:
        user = _create_user(db_session)
        app.test_client().put(URL, headers=_headers(user.id), json={"effects": False, "music": True, "chosen_at": 7})
        exported = export_user_data(user.id, "self")
        assert exported["smash_or_pass_preferences"][0]["effects_enabled"] is False
        assert exported["smash_or_pass_preferences"][0]["music_enabled"] is True
