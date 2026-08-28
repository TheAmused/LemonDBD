# backend/tests/live/workflows/test_auth_ownership_workflow.py
import pytest
from sqlalchemy import select
from app.core.extensions import db
from app.models import Perk


@pytest.mark.live
@pytest.mark.workflow
def test_full_auth_and_ownership_cascade_workflow(live_client, live_app, auth_client_factory):
    reg_res = live_client.post("/api/v1/auth/register", json={
        "username": "workflow_owner_1",
        "email": "owner1@example.com",
        "password": "StrongPassword123!",
    })
    assert reg_res.status_code == 201
    user_id = reg_res.get_json()["user"]["id"]
    token = reg_res.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    login_res = live_client.post("/api/v1/auth/login", json={
        "username": "workflow_owner_1",
        "password": "StrongPassword123!",
    })
    assert login_res.status_code == 200
    assert login_res.get_json()["user"]["email"] == "owner1@example.com"

    me_res = live_client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.get_json()["user"]["username"] == "workflow_owner_1"

    chars_res = live_client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
    assert chars_res.status_code == 200
    chars = chars_res.get_json()["data"]
    
    free_names = {"The Trapper", "The Wraith", "The Hillbilly", "The Nurse", "The Huntress",
                  "Dwight Fairfield", "Meg Thomas", "Claudette Morel", "Jake Park", "Nea Karlsson", "Bill Overbeck", "David King"}
    
    for c in chars:
        if c["name"] in free_names:
            assert c["is_owned"] is True, f"Expected {c['name']} to be owned by default"

    trapper = next(c for c in chars if c["name"] == "The Trapper")
    lock_res = live_client.post(
        f"/api/v1/users/{user_id}/characters",
        json={"character_id": trapper["id"], "is_owned": False},
        headers=headers,
    )
    assert lock_res.status_code == 200

    with live_app.app_context():
        trapper_perks = db.session.scalars(select(Perk.id).where(Perk.character_id == trapper["id"])).all()
        perks_res = live_client.get(f"/api/v1/users/{user_id}/perks", headers=headers)
        assert perks_res.status_code == 200
        user_perks = {p["id"]: p for p in perks_res.get_json()["data"]}
        for pid in trapper_perks:
            if pid in user_perks:
                assert user_perks[pid]["is_unlocked"] is False

    unlock_res = live_client.post(
        f"/api/v1/users/{user_id}/characters",
        json={"character_id": trapper["id"], "is_owned": True},
        headers=headers,
    )
    assert unlock_res.status_code == 200

    perks_res2 = live_client.get(f"/api/v1/users/{user_id}/perks", headers=headers)
    user_perks2 = {p["id"]: p for p in perks_res2.get_json()["data"]}
    for pid in trapper_perks:
        if pid in user_perks2:
            assert user_perks2[pid]["is_unlocked"] is True
