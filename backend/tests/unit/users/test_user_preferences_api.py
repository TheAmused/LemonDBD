# backend/tests/unit/users/test_user_preferences_api.py
import pytest
from flask import Flask
from sqlalchemy.orm import Session

from app.core.security import generate_token
from tests.unit.smash.smash_api_support import create_user, setup_smash_data  # noqa: F401

URL = "/api/v1/user/preferences"


def _headers(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user_id, role='user')}"}


@pytest.mark.unit
class TestUserPreferencesApi:
    def test_requires_auth(self, app: Flask) -> None:
        client = app.test_client()
        assert client.get(URL).status_code == 401
        assert client.put(URL, json={"effects": True, "chosen_at": 1}).status_code == 401

    def test_initial_read_is_null(self, app: Flask, db_session: Session) -> None:
        user = create_user(db_session)
        res = app.test_client().get(URL, headers=_headers(user.id))
        assert res.status_code == 200
        assert res.get_json() == {"data": None}

    def test_save_and_read_back(self, app: Flask, db_session: Session) -> None:
        user = create_user(db_session)
        client = app.test_client()
        payload = {
            "effects": False,
            "sounds": True,
            "music": False,
            "nsfw": True,
            "background_animation": "eco",
            "gifs": False,
            "chosen_at": 1000,
        }
        put_res = client.put(URL, headers=_headers(user.id), json=payload)
        assert put_res.status_code == 200
        assert put_res.get_json()["data"] == payload

        get_res = client.get(URL, headers=_headers(user.id))
        assert get_res.status_code == 200
        assert get_res.get_json()["data"] == payload

    def test_fallback_to_smash_preferences(self, app: Flask, db_session: Session) -> None:
        from app.models.smash_or_pass import SmashUserPreference

        user = create_user(db_session)
        smash_pref = SmashUserPreference(
            user_id=user.id,
            effects_enabled=False,
            sounds_enabled=True,
            music_enabled=False,
            chosen_at=500,
        )
        db_session.add(smash_pref)
        db_session.commit()

        res = app.test_client().get(URL, headers=_headers(user.id))
        assert res.status_code == 200
        data = res.get_json()["data"]
        assert data is not None
        assert data["effects"] is False
        assert data["sounds"] is True
        assert data["music"] is False
        assert data["nsfw"] is False
        assert data["background_animation"] == "eco"
        assert data["gifs"] is True
        assert data["chosen_at"] == 500

    @pytest.mark.parametrize(
        "invalid_body",
        [
            {},
            {"chosen_at": -5},
            {"effects": "maybe", "chosen_at": 100},
            {"background_animation": "extreme", "chosen_at": 100},
        ],
    )
    def test_rejects_invalid_preferences(self, app: Flask, db_session: Session, invalid_body: dict) -> None:
        user = create_user(db_session)
        client = app.test_client()
        res = client.put(URL, headers=_headers(user.id), json=invalid_body)
        assert res.status_code == 400

    def test_gifs_defaults_to_on_when_the_client_omits_it(self, app: Flask, db_session: Session) -> None:
        user = create_user(db_session)
        client = app.test_client()
        res = client.put(URL, headers=_headers(user.id), json={"chosen_at": 10})
        assert res.status_code == 200
        assert res.get_json()["data"]["gifs"] is True

    def test_older_client_without_gifs_keeps_the_saved_choice(self, app: Flask, db_session: Session) -> None:
        user = create_user(db_session)
        client = app.test_client()
        assert client.put(URL, headers=_headers(user.id), json={"gifs": False, "chosen_at": 10}).status_code == 200
        res = client.put(URL, headers=_headers(user.id), json={"effects": False, "chosen_at": 20})
        assert res.status_code == 200
        assert res.get_json()["data"]["gifs"] is False

    def test_dual_write_to_smash_preferences(self, app: Flask, db_session: Session) -> None:
        from app.models.smash_or_pass import SmashUserPreference

        user = create_user(db_session)
        client = app.test_client()
        payload = {
            "effects": False,
            "sounds": True,
            "music": False,
            "nsfw": True,
            "background_animation": "off",
            "chosen_at": 2500,
        }
        res = client.put(URL, headers=_headers(user.id), json=payload)
        assert res.status_code == 200

        smash_pref = db_session.get(SmashUserPreference, user.id)
        assert smash_pref is not None
        assert smash_pref.effects_enabled is False
        assert smash_pref.sounds_enabled is True
        assert smash_pref.music_enabled is False
        assert smash_pref.chosen_at == 2500

    def test_smash_preferences_syncs_to_user_preference(self, app: Flask, db_session: Session) -> None:
        from app.models.user_preference import UserPreference

        user = create_user(db_session)
        client = app.test_client()

        # Initial user preference
        user_pref = UserPreference(
            user_id=user.id,
            effects_enabled=True,
            sounds_enabled=True,
            music_enabled=True,
            nsfw_enabled=True,
            background_animation="eco",
            chosen_at=1000,
        )
        db_session.add(user_pref)
        db_session.commit()

        # Update via smash endpoint
        smash_url = "/api/v1/smash-or-pass/preferences"
        smash_payload = {
            "effects": False,
            "sounds": False,
            "music": True,
            "chosen_at": 2000,
        }
        smash_res = client.put(smash_url, headers=_headers(user.id), json=smash_payload)
        assert smash_res.status_code == 200

        # Verify user preference has synced audio/effects while preserving nsfw and background_animation
        db_session.expire_all()
        reloaded = db_session.get(UserPreference, user.id)
        assert reloaded is not None
        assert reloaded.effects_enabled is False
        assert reloaded.sounds_enabled is False
        assert reloaded.music_enabled is True
        assert reloaded.nsfw_enabled is True
        assert reloaded.background_animation == "eco"
        assert reloaded.chosen_at == 2000

    def test_stale_choice_does_not_overwrite_newer_one(self, app: Flask, db_session: Session) -> None:
        user = create_user(db_session)
        client = app.test_client()
        newer_payload = {
            "effects": False,
            "sounds": True,
            "music": False,
            "nsfw": True,
            "background_animation": "eco",
            "gifs": False,
            "chosen_at": 2000,
        }
        res1 = client.put(URL, headers=_headers(user.id), json=newer_payload)
        assert res1.status_code == 200

        older_payload = {
            "effects": True,
            "sounds": False,
            "music": True,
            "nsfw": False,
            "background_animation": "on",
            "gifs": True,
            "chosen_at": 1000,
        }
        res2 = client.put(URL, headers=_headers(user.id), json=older_payload)
        assert res2.status_code == 200
        # Should retain the newer choice
        assert res2.get_json()["data"] == newer_payload

    def test_rejects_non_mapping_payload(self, app: Flask, db_session: Session) -> None:
        user = create_user(db_session)
        client = app.test_client()
        assert client.put(URL, headers=_headers(user.id), json=[]).status_code == 400
        assert client.put(URL, headers=_headers(user.id), json=[1, 2, 3]).status_code == 400

    def test_stale_choice_does_not_overwrite_newer_smash_preference(self, app: Flask, db_session: Session) -> None:
        from app.models.smash_or_pass import SmashUserPreference
        from app.models.user_preference import UserPreference

        user = create_user(db_session)
        client = app.test_client()

        # Seed only SmashUserPreference with newer timestamp 2000
        smash_pref = SmashUserPreference(
            user_id=user.id,
            effects_enabled=False,
            sounds_enabled=True,
            music_enabled=False,
            chosen_at=2000,
        )
        db_session.add(smash_pref)
        db_session.commit()

        # UserPreference table has no row yet
        assert db_session.get(UserPreference, user.id) is None

        # Send older payload with chosen_at 1000
        older_payload = {
            "effects": True,
            "sounds": False,
            "music": True,
            "nsfw": True,
            "background_animation": "off",
            "chosen_at": 1000,
        }
        res = client.put(URL, headers=_headers(user.id), json=older_payload)
        assert res.status_code == 200

        data = res.get_json()["data"]
        assert data["effects"] is False
        assert data["sounds"] is True
        assert data["music"] is False
        assert data["chosen_at"] == 2000
