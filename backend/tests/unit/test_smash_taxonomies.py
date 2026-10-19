# backend/tests/unit/test_smash_taxonomies.py
import pytest
from sqlalchemy.orm import Session

from app.core.security import generate_token
from tests.unit.smash_api_support import create_user, setup_smash_data  # noqa: F401


def test_get_taxonomies_default(client):
    """GET /taxonomies returns predefined roles and genders."""
    res = client.get("/api/v1/smash-or-pass/taxonomies")
    assert res.status_code == 200
    payload = res.get_json()
    assert "data" in payload
    data = payload["data"]
    assert "roles" in data
    assert "genders" in data
    assert "Survivor" in data["roles"]
    assert "Killer" in data["roles"]
    assert "female" in data["genders"]
    assert "male" in data["genders"]
    assert "monster_other" in data["genders"]


def test_register_taxonomy_unauthenticated_rejected(client):
    """POST /taxonomies requires authentication."""
    res = client.post(
        "/api/v1/smash-or-pass/taxonomies",
        json={"type": "gender", "name": "ABC"},
    )
    assert res.status_code == 401


def test_register_taxonomy_is_admin_only(client, db_session: Session):
    """A regular account's custom terms stay in its own roster (the creator keeps
    them locally); only an admin adds a term everyone's filter list shows."""
    user = create_user(db_session, username="tax_user0", email="tax0@example.com")
    headers = {"Authorization": f"Bearer {generate_token(user.id, role='user')}"}
    res = client.post("/api/v1/smash-or-pass/taxonomies", headers=headers, json={"type": "gender", "name": "Spam"})
    assert res.status_code == 403
    assert "Spam" not in client.get("/api/v1/smash-or-pass/taxonomies").get_json()["data"]["genders"]


def test_register_taxonomy_does_not_bust_the_catalog(client, db_session: Session):
    from app.core import redis_cache

    user = create_user(db_session, username="tax_user4", email="tax4@example.com", role="admin")
    headers = {"Authorization": f"Bearer {generate_token(user.id, role='admin')}"}
    before = redis_cache.catalog_version()
    client.post("/api/v1/smash-or-pass/taxonomies", headers=headers, json={"type": "role", "name": "Hero2"})
    assert redis_cache.catalog_version() == before


def test_register_taxonomy_custom_gender(client, db_session: Session):
    """POST /taxonomies registers a custom gender like 'ABC' and reflects in GET."""
    user = create_user(db_session, username="tax_user1", email="tax1@example.com", role="admin")
    token = generate_token(user.id, role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/v1/smash-or-pass/taxonomies",
        headers=headers,
        json={"type": "gender", "name": "ABC"},
    )
    assert res.status_code == 201
    payload = res.get_json()
    assert payload["data"]["name"] == "ABC"
    assert payload["data"]["slug"] == "abc"
    assert payload["data"]["type"] == "gender"

    # GET /taxonomies should now include ABC in genders
    res2 = client.get("/api/v1/smash-or-pass/taxonomies")
    assert res2.status_code == 200
    data = res2.get_json()["data"]
    assert "ABC" in data["genders"]


def test_register_taxonomy_custom_role(client, db_session: Session):
    """POST /taxonomies registers a custom role like 'Hero'."""
    user = create_user(db_session, username="tax_user2", email="tax2@example.com", role="admin")
    token = generate_token(user.id, role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/v1/smash-or-pass/taxonomies",
        headers=headers,
        json={"type": "role", "name": "Hero"},
    )
    assert res.status_code == 201
    payload = res.get_json()
    assert payload["data"]["name"] == "Hero"
    assert payload["data"]["slug"] == "hero"

    # Idempotent re-registration
    res_repeat = client.post(
        "/api/v1/smash-or-pass/taxonomies",
        headers=headers,
        json={"type": "role", "name": "Hero"},
    )
    assert res_repeat.status_code == 201
    assert res_repeat.get_json()["data"]["name"] == "Hero"


def test_register_taxonomy_validation(client, db_session: Session):
    """POST /taxonomies rejects invalid type or empty name."""
    user = create_user(db_session, username="tax_user3", email="tax3@example.com", role="admin")
    token = generate_token(user.id, role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    res1 = client.post(
        "/api/v1/smash-or-pass/taxonomies",
        headers=headers,
        json={"type": "invalid_type", "name": "Test"},
    )
    assert res1.status_code == 400

    res2 = client.post(
        "/api/v1/smash-or-pass/taxonomies",
        headers=headers,
        json={"type": "role", "name": "   "},
    )
    assert res2.status_code == 400

