# backend/tests/live/workflows/test_character_perks_addons_equipment_workflow.py
from collections.abc import Callable
from typing import Any

import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestCharacterPerksAddonsEquipmentWorkflow:
    """Character details, an item category, and a bulk ownership change that locks the characters' perks."""

    def test_full_character_perks_addons_and_equipment_workflow(
        self,
        live_client: FlaskClient,
        db_count: Callable[..., int],
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        nurse_res = live_client.get("/api/v1/characters/The_Nurse/detail")
        assert nurse_res.status_code == 200
        nurse = nurse_res.get_json()["data"]
        assert nurse["character"]["name"] == "The Nurse"
        assert {p["name"] for p in nurse["perks"]} == {"A Nurse's Calling", "Stridor", "Thanatophobia"}
        assert len(nurse["addons"]) == db_count(
            "SELECT count(*) FROM killer_addons a JOIN killers k ON k.id = a.killer_id WHERE k.name = 'The Nurse'"
        )

        medkits = live_client.get("/api/v1/items?category=Med-Kit").get_json()["data"]
        assert {i["category"] for i in medkits} == {"Med-Kit"}
        assert len(medkits) == db_count(
            "SELECT count(*) FROM items i JOIN item_categories c ON c.id = i.category_id WHERE c.name = 'Med-Kit'"
        )

        client, headers, user = auth_client_factory("bulk_owner_user", "bulk@example.com", "pass123")
        user_id = user["id"]
        chars = client.get(f"/api/v1/users/{user_id}/characters", headers=headers).get_json()["data"]
        survivors = [c for c in chars if c["role"] == "Survivor" and c["is_owned"]][:10]
        bulk_res = client.post(
            f"/api/v1/users/{user_id}/characters/bulk",
            json={"updates": [{"character_id": c["id"], "role": c["role"], "is_owned": False} for c in survivors]},
            headers=headers,
        )
        assert bulk_res.status_code == 200
        result = bulk_res.get_json()["data"]
        assert result["characters_updated_count"] == 10
        # Each survivor teaches three perks, and those lock with the character.
        assert result["auto_locked_perks_count"] == 30
        assert result["summary"]["owned_survivor_characters_count"] == result["summary"]["total_survivor_characters_count"] - 10

        # Without its role a change cannot tell survivor 3 from killer 3, so the bulk call skips it.
        skipped = client.post(
            f"/api/v1/users/{user_id}/characters/bulk",
            json={"updates": [{"character_id": c["id"], "is_owned": True} for c in survivors]},
            headers=headers,
        )
        assert skipped.get_json()["data"]["characters_updated_count"] == 0
