# backend/tests/live/api/test_live_user_ownership_api.py
import pytest


@pytest.mark.live
def test_live_user_registration_login_and_ownership(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("live_user_1", "live_1@example.com", "pass123")
    user_id = user["id"]

    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.get_json()["user"]["username"] == "live_user_1"

    res_chars = client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
    assert res_chars.status_code == 200
    chars = res_chars.get_json()["data"]
    assert len(chars) > 50

    first_char = chars[0]
    target_id = first_char["id"]
    new_state = not first_char["is_owned"]

    res_toggle = client.post(
        f"/api/v1/users/{user_id}/characters",
        json={"character_id": target_id, "is_owned": new_state},
        headers=headers,
    )
    assert res_toggle.status_code == 200

    res_chars2 = client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
    chars2 = res_chars2.get_json()["data"]
    updated_char = next(c for c in chars2 if c["id"] == target_id)
    assert updated_char["is_owned"] == new_state


@pytest.mark.live
def test_live_perk_ownership_toggle(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("live_user_perks", "live_p@example.com", "pass123")
    user_id = user["id"]

    res_perks = client.get(f"/api/v1/users/{user_id}/perks", headers=headers)
    assert res_perks.status_code == 200
    perks_data = res_perks.get_json()["data"]
    assert len(perks_data) > 100

    target_perk = perks_data[0]
    target_id = target_perk["id"]
    new_state = not target_perk.get("is_owned", True)

    res_toggle = client.post(
        f"/api/v1/users/{user_id}/perks",
        json={"perk_id": target_id, "is_owned": new_state},
        headers=headers,
    )
    assert res_toggle.status_code == 200
