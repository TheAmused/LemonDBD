# backend/tests/unit/api/test_character_disable_audit.py
"""Disabling a character is audited with its side, so survivor 7 and killer 7 never share an entry."""
import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import AdminAuditLog, User
from tests.unit.conftest import make_killer, make_survivor


@pytest.mark.unit
def test_the_audit_entry_names_the_side(client: FlaskClient, db_session) -> None:
    admin = User(login="boss", username="boss", email="boss@example.com", password_hash=hash_password("password123"), role="admin", is_verified=True)
    db.session.add(admin)
    make_survivor(db_session, "Ace Visconti", id=7)
    make_killer(db_session, "The Doctor", id=7)
    db.session.commit()
    headers = {"Authorization": f"Bearer {generate_token(admin.id, role='admin')}"}

    assert client.put("/api/v1/admin/characters/7/disable", json={"is_disabled": True, "role": "killer"}, headers=headers).status_code == 200
    assert client.put("/api/v1/admin/characters/7/disable", json={"is_disabled": True, "role": "survivor"}, headers=headers).status_code == 200
    targets = [row.target_id for row in db.session.query(AdminAuditLog).filter_by(target_type="character").order_by(AdminAuditLog.id)]
    assert targets == ["killer:7", "survivor:7"]
