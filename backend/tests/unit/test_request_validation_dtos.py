# backend/tests/unit/test_request_validation_dtos.py
"""Request bodies that used to be read field by field now go through DTOs: ownership changes need
real booleans and a bounded list, smash session resets / syncs bound their identifiers."""
import pytest

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import User
from app.schemas.smash_or_pass import MAX_SMASH_KEY_LENGTH
from app.schemas.user import MAX_BULK_OWNERSHIP_UPDATES


@pytest.fixture
def member(db_session) -> User:
    user = User(login="owner", username="Owner", email="owner@example.com", password_hash=hash_password("password123"), role="user", is_verified=True)
    db.session.add(user)
    db.session.commit()
    return user


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}


@pytest.mark.unit
class TestOwnership:
    def test_a_string_flag_is_refused_not_read_as_true(self, client, member) -> None:
        res = client.post(f"/api/v1/users/{member.id}/perks", json={"perk_id": 1, "is_unlocked": "false"}, headers=_auth(member))
        assert res.status_code == 400
        assert res.get_json()["error"] == "Validation failed"

    def test_a_character_flag_must_be_boolean(self, client, member) -> None:
        res = client.post(
            f"/api/v1/users/{member.id}/characters",
            json={"character_id": 1, "role": "survivor", "is_owned": "no"},
            headers=_auth(member),
        )
        assert res.status_code == 400

    @pytest.mark.parametrize("kind,item", [("characters", {"character_id": 1, "role": "killer"}), ("perks", {"perk_id": 1})])
    def test_bulk_lists_are_bounded(self, client, member, kind: str, item: dict) -> None:
        res = client.post(
            f"/api/v1/users/{member.id}/{kind}/bulk",
            json={"updates": [item] * (MAX_BULK_OWNERSHIP_UPDATES + 1)},
            headers=_auth(member),
        )
        assert res.status_code == 400

    @pytest.mark.parametrize("updates", ["not-a-list", [1, 2], [{"perk_id": 1, "is_unlocked": "yes"}]])
    def test_bulk_items_must_be_well_formed(self, client, member, updates) -> None:
        res = client.post(f"/api/v1/users/{member.id}/perks/bulk", json={"updates": updates}, headers=_auth(member))
        assert res.status_code == 400

    def test_a_well_formed_bulk_request_still_works(self, client, member) -> None:
        res = client.post(f"/api/v1/users/{member.id}/perks/bulk", json={"updates": []}, headers=_auth(member))
        assert res.status_code == 200


@pytest.mark.unit
class TestSmashSessions:
    @pytest.mark.parametrize("path", ["/api/v1/smash-or-pass/session/reset", "/api/v1/smash-or-pass/sync-session"])
    def test_overlong_session_ids_are_refused(self, client, member, path: str) -> None:
        res = client.post(path, json={"session_id": "s" * (MAX_SMASH_KEY_LENGTH + 1)}, headers=_auth(member))
        assert res.status_code == 400
        assert res.get_json()["error"] == "Validation failed"

    def test_overlong_roster_slugs_are_refused(self, client) -> None:
        res = client.post("/api/v1/smash-or-pass/session/reset", json={"session_id": "abc", "roster_slug": "r" * 500})
        assert res.status_code == 400

    def test_a_non_numeric_user_id_is_refused(self, client, member) -> None:
        res = client.post("/api/v1/smash-or-pass/user-votes/reset", json={"user_id": "me"}, headers=_auth(member))
        assert res.status_code == 400

    def test_the_session_id_still_comes_from_the_header(self, client) -> None:
        res = client.post("/api/v1/smash-or-pass/session/reset", headers={"X-Session-ID": "from-header"})
        assert res.status_code == 200

    def test_a_missing_session_id_keeps_its_message(self, client) -> None:
        res = client.post("/api/v1/smash-or-pass/session/reset", json={})
        assert res.status_code == 400
        assert "session_id" in res.get_json()["error"]
