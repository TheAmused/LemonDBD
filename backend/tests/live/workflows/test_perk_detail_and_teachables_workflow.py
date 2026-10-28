# backend/tests/live/workflows/test_perk_detail_and_teachables_workflow.py
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestPerkDetailAndTeachablesWorkflow:
    """A character's detail page lists exactly its three teachable perks."""

    @pytest.mark.parametrize(
        ("slug", "name", "teachables"),
        [
            ("Meg_Thomas", "Meg Thomas", {"Adrenaline", "Quick & Quiet", "Sprint Burst"}),
            ("The_Trapper", "The Trapper", {"Agitation", "Brutal Strength", "Unnerving Presence"}),
        ],
    )
    def test_perk_detail_and_teachables_association_workflow(
        self, live_client: FlaskClient, slug: str, name: str, teachables: set[str]
    ) -> None:
        res = live_client.get(f"/api/v1/characters/{slug}/detail")
        assert res.status_code == 200
        data = res.get_json()["data"]
        assert data["character"]["name"] == name
        assert {p["name"] for p in data["perks"]} == teachables
        assert all(p["character"] == name and p["is_teachable"] for p in data["perks"])
