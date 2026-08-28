# backend/tests/live/test_live_smoke.py
import pytest
from sqlalchemy import func, select
from app.core.extensions import db
from app.models import Character, Perk


@pytest.mark.live
def test_live_postgres_clone_integrity(live_app):
    """Verify live test clone contains real DBD data and functions under real PostgreSQL."""
    with live_app.app_context():
        char_count = db.session.scalar(select(func.count(Character.id)))
        perk_count = db.session.scalar(select(func.count(Perk.id)))
        assert char_count > 50, f"Expected >50 characters, got {char_count}"
        assert perk_count > 200, f"Expected >200 perks, got {perk_count}"


@pytest.mark.live
def test_live_api_health_endpoint(live_client):
    """Verify Flask API health endpoint returns healthy status on live database."""
    res = live_client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data.get("status") == "healthy"
    assert data.get("service") == "dbd-backend-api"
