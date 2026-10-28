# backend/tests/live/workflows/test_character_catalog_and_filtering_workflow.py
from collections.abc import Callable

import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestCharacterCatalogAndFilteringWorkflow:
    """The full killer and survivor catalogues, each with only its own role and release metadata."""

    def test_character_catalog_and_filtering_workflow(self, live_client: FlaskClient, db_count: Callable[..., int]) -> None:
        for path, role, table in (("/api/v1/killers", "Killer", "killers"), ("/api/v1/survivors", "Survivor", "survivors")):
            res = live_client.get(path)
            assert res.status_code == 200
            body = res.get_json()
            characters = body["data"]
            assert body["count"] == len(characters) == db_count(f"SELECT count(*) FROM {table}")
            assert {c["role"] for c in characters} == {role}
            assert all(c["release_number"] is not None for c in characters), path
