# backend/tests/unit/api/test_maps_realms_route.py
import pytest
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

from app.models import Realm


@pytest.mark.unit
class TestMapsRealmsRoute:
    def test_returns_all_realms(self, client: FlaskClient, db_session: Session):
        db_session.add(Realm(name="Ormond", image_url="https://x/ormond.png", image_local_path="realms/ormond.png"))
        db_session.commit()

        res = client.get("/api/v1/maps/realms")

        assert res.status_code == 200
        data = res.get_json()
        names = [r["name"] for r in data["realms"]]
        assert "Ormond" in names

    def test_returns_empty_list_when_no_realms(self, client: FlaskClient):
        res = client.get("/api/v1/maps/realms")
        assert res.status_code == 200
        assert res.get_json()["realms"] == []
