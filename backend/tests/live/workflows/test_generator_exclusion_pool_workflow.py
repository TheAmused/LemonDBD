# backend/tests/live/workflows/test_generator_exclusion_pool_workflow.py
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestGeneratorExclusionPoolWorkflow:
    """Workflow asserting random perk wheel exclusions and drawn perk state resets."""

    def test_generator_exclusion_pool_workflow(self, live_client: FlaskClient) -> None:
        c_res = live_client.post(
            "/api/v1/generator/config",
            json={"role": "Killer", "mode": "random"},
        )
        assert c_res.status_code == 200

        draw1 = live_client.post(
            "/api/v1/generator/draw",
            json={
                "role": "Killer",
                "perks": [
                    "Hex: Ruin",
                    "Pop Goes The Weasel",
                    "Barbecue & Chilli",
                    "Scourge Hook: Pain Resonance",
                ],
            },
        )
        assert draw1.status_code == 200
        drawn = draw1.get_json()["drawn_perks"]
        assert len(drawn) == 4

        get_drawn = live_client.get("/api/v1/generator/drawn?role=Killer")
        assert get_drawn.status_code == 200
        assert len(get_drawn.get_json()["drawn_perks"]) == 4

        reset_res = live_client.post("/api/v1/generator/reset", json={"role": "Killer"})
        assert reset_res.status_code == 200
        assert len(reset_res.get_json()["drawn_perks"]) == 0
