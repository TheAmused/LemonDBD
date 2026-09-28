# backend/tests/unit/test_smash_taxonomies.py
import pytest
from app.models.smash_or_pass import SmashTaxonomy
from app.core.extensions import db


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


def test_register_taxonomy_custom_gender(client):
    """POST /taxonomies registers a custom gender like 'ABC' and reflects in GET."""
    res = client.post(
        "/api/v1/smash-or-pass/taxonomies",
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


def test_register_taxonomy_custom_role(client):
    """POST /taxonomies registers a custom role like 'Hero'."""
    res = client.post(
        "/api/v1/smash-or-pass/taxonomies",
        json={"type": "role", "name": "Hero"},
    )
    assert res.status_code == 201
    payload = res.get_json()
    assert payload["data"]["name"] == "Hero"
    assert payload["data"]["slug"] == "hero"

    # Idempotent re-registration
    res_repeat = client.post(
        "/api/v1/smash-or-pass/taxonomies",
        json={"type": "role", "name": "Hero"},
    )
    assert res_repeat.status_code == 201
    assert res_repeat.get_json()["data"]["name"] == "Hero"


def test_register_taxonomy_validation(client):
    """POST /taxonomies rejects invalid type or empty name."""
    res1 = client.post(
        "/api/v1/smash-or-pass/taxonomies",
        json={"type": "invalid_type", "name": "Test"},
    )
    assert res1.status_code == 400

    res2 = client.post(
        "/api/v1/smash-or-pass/taxonomies",
        json={"type": "role", "name": "   "},
    )
    assert res2.status_code == 400
