# backend/tests/live/api/test_live_user_ownership_api.py
"""A user's character and perk ownership on PostgreSQL: listing, toggling one, and that nobody can
read another user's list."""
from typing import Any, Callable

import pytest
from flask.testing import FlaskClient

ClientFactory = Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]]


@pytest.mark.live
class TestLiveUserOwnershipAPI:
    def test_live_user_registration_login_and_ownership(self, auth_client_factory: ClientFactory, db_count: Callable[..., int]) -> None:
        client, headers, user = auth_client_factory("live_user_1", "live_1@example.com", "pass123")
        user_id = user["id"]
        assert client.get("/api/v1/auth/me", headers=headers).get_json()["user"]["username"] == "live_user_1"

        chars = client.get(f"/api/v1/users/{user_id}/characters", headers=headers).get_json()["data"]
        assert len(chars) == db_count("SELECT (SELECT count(*) FROM survivors) + (SELECT count(*) FROM killers)")

        target = chars[0]
        res_toggle = client.post(
            f"/api/v1/users/{user_id}/characters",
            json={"character_id": target["id"], "role": target["role"], "is_owned": not target["is_owned"]},
            headers=headers,
        )
        assert res_toggle.status_code == 200
        after = client.get(f"/api/v1/users/{user_id}/characters", headers=headers).get_json()["data"]
        changed = [c["name"] for c, old in zip(after, chars) if c["is_owned"] != old["is_owned"]]
        assert changed == [target["name"]], "exactly the toggled character changed"

        # Survivor and killer ids overlap, so a change without its role is refused, not guessed.
        res_no_role = client.post(f"/api/v1/users/{user_id}/characters", json={"character_id": target["id"], "is_owned": True}, headers=headers)
        assert res_no_role.status_code == 400

    def test_live_perk_ownership_toggle(self, auth_client_factory: ClientFactory, db_count: Callable[..., int]) -> None:
        client, headers, user = auth_client_factory("live_user_perks", "live_p@example.com", "pass123")
        user_id = user["id"]
        perks = client.get(f"/api/v1/users/{user_id}/perks", headers=headers).get_json()["data"]
        assert len(perks) == db_count("SELECT count(*) FROM perks")

        target = perks[0]
        res_toggle = client.post(
            f"/api/v1/users/{user_id}/perks",
            json={"perk_id": target["id"], "is_unlocked": not target["is_unlocked"]},
            headers=headers,
        )
        assert res_toggle.status_code == 200
        assert res_toggle.get_json()["data"]["is_unlocked"] is (not target["is_unlocked"])
        reread = next(p for p in client.get(f"/api/v1/users/{user_id}/perks", headers=headers).get_json()["data"] if p["id"] == target["id"])
        assert reread["is_unlocked"] is (not target["is_unlocked"])

    def test_another_users_lists_are_refused(self, auth_client_factory: ClientFactory) -> None:
        client, headers, _ = auth_client_factory("live_user_snoop", "snoop@example.com", "pass123")
        _, _, other = auth_client_factory("live_user_victim", "victim@example.com", "pass123")
        assert client.get(f"/api/v1/users/{other['id']}/perks", headers=headers).status_code == 403
        assert client.get(f"/api/v1/users/{other['id']}/characters", headers=headers).status_code == 403
