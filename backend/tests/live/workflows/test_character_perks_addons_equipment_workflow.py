# backend/tests/live/workflows/test_character_perks_addons_equipment_workflow.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestCharacterPerksAddonsEquipmentWorkflow:
    """Workflow verifying character details, equipment queries, bulk ownership updates, and perk generation."""

    def test_full_character_perks_addons_and_equipment_workflow(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        surv_res = live_client.get("/api/v1/survivors")
        assert surv_res.status_code == 200
        survivors = surv_res.get_json()["data"]
        assert len(survivors) >= 20

        killer_res = live_client.get("/api/v1/killers")
        assert killer_res.status_code == 200
        killers = killer_res.get_json()["data"]
        assert len(killers) >= 20

        nurse_detail_res = live_client.get("/api/v1/characters/The_Nurse/detail")
        if nurse_detail_res.status_code == 404:
            nurse_detail_res = live_client.get("/api/v1/characters/The%20Nurse/detail")
        assert nurse_detail_res.status_code == 200
        nurse_data = nurse_detail_res.get_json()["data"]
        assert nurse_data["character"]["name"] == "The Nurse"
        assert len(nurse_data["perks"]) == 3
        assert len(nurse_data["addons"]) > 0

        medkits_res = live_client.get("/api/v1/items?category=Med-Kit")
        assert medkits_res.status_code == 200
        medkits = medkits_res.get_json()["data"]
        assert len(medkits) > 0

        client, headers, user = auth_client_factory(
            "bulk_owner_user", "bulk@example.com", "pass123"
        )
        user_id = user["id"]

        all_chars_res = client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
        assert all_chars_res.status_code == 200
        chars = all_chars_res.get_json()["data"]

        updates = [{"character_id": c["id"], "is_owned": True} for c in chars[:10]]
        bulk_res = client.post(
            f"/api/v1/users/{user_id}/characters/bulk",
            json={"updates": updates},
            headers=headers,
        )
        assert bulk_res.status_code == 200

        config_res = client.post(
            "/api/v1/generator/config",
            json={"role": "Killer", "mode": "random", "lock_perks": False},
        )
        assert config_res.status_code == 200

        draw_res = client.post(
            "/api/v1/generator/draw",
            json={"role": "Killer", "perks": ["A Nurse's Calling", "Thanatophobia"]},
        )
        assert draw_res.status_code == 200
        drawn = draw_res.get_json()["drawn_perks"]
        assert len(drawn) >= 2

        reset_res = client.post("/api/v1/generator/reset", json={"role": "Killer"})
        assert reset_res.status_code == 200
        assert len(reset_res.get_json()["drawn_perks"]) == 0
