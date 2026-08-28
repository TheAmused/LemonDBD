# backend/tests/live/test_live_smoke.py
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import func, select
from app.core.extensions import db
from app.models import Addon, Character, Item, Perk


@pytest.mark.live
class TestLiveSmoke:
    """Smoke tests verifying real PostgreSQL clone data volume, tables, and API health."""

    def test_live_postgres_clone_integrity(self, live_app: Flask) -> None:
        """Verify live test clone contains real DBD data and functions under real PostgreSQL."""
        with live_app.app_context():
            char_count = db.session.scalar(select(func.count(Character.id)))
            perk_count = db.session.scalar(select(func.count(Perk.id)))
            item_count = db.session.scalar(select(func.count(Item.id)))
            addon_count = db.session.scalar(select(func.count(Addon.id)))

            assert char_count is not None and char_count > 50, f"Expected >50 characters, got {char_count}"
            assert perk_count is not None and perk_count > 200, f"Expected >200 perks, got {perk_count}"
            assert item_count is not None and item_count >= 5, f"Expected >=5 items, got {item_count}"
            assert addon_count is not None and addon_count >= 20, f"Expected >=20 addons, got {addon_count}"

    def test_live_api_health_endpoint(self, live_client: FlaskClient) -> None:
        """Verify Flask API health endpoint returns healthy status on live database."""
        res = live_client.get("/api/v1/health")
        assert res.status_code == 200
        data = res.get_json()
        assert data.get("status") == "healthy"
        assert data.get("service") == "dbd-backend-api"
