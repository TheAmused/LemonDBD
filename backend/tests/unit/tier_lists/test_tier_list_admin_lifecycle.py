# backend/tests/unit/tier_lists/test_tier_list_admin_lifecycle.py
from datetime import date
from pathlib import Path
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import generate_token
from app.models.minigame import MinigameDailyChallenge
from app.models.smash_or_pass import Entity, EntityStat, Roster, Vote
from app.models.tier_list import TierList
from app.models.user import User
from app.services import tier_list_service
from app.services.smash_or_pass_service import SmashOrPassService


@pytest.fixture
def admin_user(db_session: Session) -> User:
    user = User(
        login="admin_lifecycle",
        username="admin_lifecycle",
        email="admin_lifecycle@example.com",
        password_hash="hashed_pw",
        role="admin",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def plain_user(db_session: Session) -> User:
    user = User(
        login="plain_lifecycle",
        username="plain_lifecycle",
        email="plain_lifecycle@example.com",
        password_hash="hashed_pw",
        role="user",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def admin_headers(app: Flask, admin_user: User) -> dict[str, str]:
    with app.app_context():
        token = generate_token(admin_user.id, role="admin")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_headers(app: Flask, plain_user: User) -> dict[str, str]:
    with app.app_context():
        token = generate_token(plain_user.id, role="user")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def _sandbox_seeds(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    content_dir = tmp_path / "content"
    content_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr("app.seeds.static_db_seeder.SEEDS_DATA_DIR", tmp_path)
    monkeypatch.setattr("app.services.smash_or_pass_service.ROSTERS_DIR", tmp_path)
    monkeypatch.setattr("app.seeds.smash_roster_seeder.ROSTERS_DIR", tmp_path)


@pytest.mark.unit
def test_tier_list_model_summary_and_dict_includes_is_active(db_session: Session) -> None:
    row = TierList(
        slug="test-active-model",
        kind="custom",
        title="Active Model",
        is_active=False,
        tiers=[{"id": "s", "label": "S", "color": "s"}],
        custom_items=[{"id": "i1", "name": "Item 1"}],
    )
    db_session.add(row)
    db_session.commit()

    summary = row.to_summary_dict()
    assert "is_active" in summary
    assert summary["is_active"] is False

    full_dict = row.to_dict()
    assert "is_active" in full_dict
    assert full_dict["is_active"] is False


@pytest.mark.unit
def test_tier_list_service_draft_and_deletion(app: Flask, db_session: Session) -> None:
    # 1. Test draft creation
    tl = tier_list_service.create_tier_list(
        title="Draft Test List",
        description="Draft description",
        cover_image_url=None,
        tiers=[{"id": "s", "label": "S", "color": "s"}],
        custom_items=[{"id": "i1", "name": "Item 1"}],
        is_nsfw=False,
        is_active=False,
    )
    assert tl.is_active is False
    slug = tl.slug

    # 2. Public / anonymous list should not include draft
    public_lists = tier_list_service.list_tier_lists()
    assert not any(l["slug"] == slug for l in public_lists)

    # 3. Public get returns None for draft
    assert tier_list_service.get_tier_list(slug) is None

    # 4. Admin list includes draft
    admin_lists = tier_list_service.list_tier_lists(include_inactive=True)
    assert any(l["slug"] == slug for l in admin_lists)
    draft_item = next(l for l in admin_lists if l["slug"] == slug)
    assert draft_item["is_active"] is False

    # 5. Admin get retrieves draft
    admin_detail = tier_list_service.get_tier_list(slug, include_inactive=True)
    assert admin_detail is not None
    assert admin_detail["is_active"] is False

    # 6. Update draft to active
    updated = tier_list_service.update_tier_list(slug, is_active=True)
    assert updated is not None
    assert updated.is_active is True

    # Now public list and get include it
    assert any(l["slug"] == slug for l in tier_list_service.list_tier_lists())
    assert tier_list_service.get_tier_list(slug) is not None

    # 7. Deletion
    deleted = tier_list_service.delete_tier_list(slug)
    assert deleted is True
    assert tier_list_service.get_tier_list(slug, include_inactive=True) is None

    # Deleting non-existent returns False
    assert tier_list_service.delete_tier_list("non-existent-slug") is False


@pytest.mark.unit
def test_tier_list_routes_draft_and_deletion(
    client: FlaskClient,
    admin_headers: dict[str, str],
    user_headers: dict[str, str],
) -> None:
    # Create draft via POST
    payload = {
        "title": "Route Draft List",
        "description": "Created as draft",
        "tiers": [{"id": "s", "label": "S", "color": "s"}],
        "items": [{"id": "i1", "name": "Item 1"}],
        "is_active": False,
    }
    create_res = client.post("/api/v1/tier-lists", json=payload, headers=admin_headers)
    assert create_res.status_code == 201
    created_data = create_res.get_json()["data"]
    assert created_data["is_active"] is False
    slug = created_data["slug"]

    # Anonymous listing cannot see draft
    anon_list = client.get("/api/v1/tier-lists")
    assert anon_list.status_code == 200
    assert not any(l["slug"] == slug for l in anon_list.get_json()["data"])

    # Anonymous detail returns 404
    anon_detail = client.get(f"/api/v1/tier-lists/{slug}")
    assert anon_detail.status_code == 404

    # Admin listing CAN see draft
    admin_list = client.get("/api/v1/tier-lists", headers=admin_headers)
    assert admin_list.status_code == 200
    assert any(l["slug"] == slug for l in admin_list.get_json()["data"])

    # Admin detail returns 200
    admin_detail = client.get(f"/api/v1/tier-lists/{slug}", headers=admin_headers)
    assert admin_detail.status_code == 200
    assert admin_detail.get_json()["data"]["is_active"] is False

    # Publish draft via PATCH
    update_res = client.patch(f"/api/v1/tier-lists/{slug}", json={"is_active": True}, headers=admin_headers)
    assert update_res.status_code == 200
    assert update_res.get_json()["data"]["is_active"] is True

    # Now anonymous can see it
    anon_detail2 = client.get(f"/api/v1/tier-lists/{slug}")
    assert anon_detail2.status_code == 200

    # Delete permissions: anon 401, user 403, admin 200
    del_anon = client.delete(f"/api/v1/tier-lists/{slug}")
    assert del_anon.status_code == 401

    del_user = client.delete(f"/api/v1/tier-lists/{slug}", headers=user_headers)
    assert del_user.status_code == 403

    del_admin = client.delete(f"/api/v1/tier-lists/{slug}", headers=admin_headers)
    assert del_admin.status_code == 200

    # Deleted, now 404 even for admin
    assert client.get(f"/api/v1/tier-lists/{slug}", headers=admin_headers).status_code == 404
    assert client.delete(f"/api/v1/tier-lists/{slug}", headers=admin_headers).status_code == 404


@pytest.mark.unit
def test_smash_or_pass_admin_deletion_and_draft(
    client: FlaskClient,
    db_session: Session,
    admin_headers: dict[str, str],
    user_headers: dict[str, str],
) -> None:
    smash_service = SmashOrPassService()
    roster = smash_service.create_roster(
        name="Smash Admin Delete Me",
        description="To be deleted",
        cover_image_url=None,
        theme_color="#ff0055",
        category="DBD",
        is_nsfw=False,
        is_active=False,
        translations={},
        entities=[
            {"name": "Entity One", "role": "Survivor", "gender": "female"},
            {"name": "Entity Two", "role": "Killer", "gender": "male"},
        ],
    )
    assert roster.is_active is False
    slug = roster.slug
    roster_id = roster.id

    # Verify entities and stats exist
    entities = db_session.scalars(select(Entity).where(Entity.roster_id == roster_id)).all()
    assert len(entities) == 2
    entity_ids = [e.id for e in entities]
    stats = db_session.scalars(select(EntityStat).where(EntityStat.entity_id.in_(entity_ids))).all()
    assert len(stats) == 2

    # Add a vote record to verify Vote deletion
    vote = Vote(
        entity_id=entities[0].id,
        session_id="test-session-123",
        vote_type="smash",
    )
    db_session.add(vote)
    db_session.commit()
    assert db_session.scalar(select(Vote).where(Vote.entity_id == entities[0].id)) is not None

    # Delete permissions
    del_anon = client.delete(f"/api/v1/smash-or-pass/admin/rosters/{slug}")
    assert del_anon.status_code == 401

    del_user = client.delete(f"/api/v1/smash-or-pass/admin/rosters/{slug}", headers=user_headers)
    assert del_user.status_code == 403

    del_admin = client.delete(f"/api/v1/smash-or-pass/admin/rosters/{slug}", headers=admin_headers)
    assert del_admin.status_code == 200

    # Verify DB rows are gone
    assert db_session.scalar(select(Roster).where(Roster.slug == slug)) is None
    assert db_session.scalars(select(Entity).where(Entity.roster_id == roster_id)).all() == []
    assert db_session.scalars(select(EntityStat).where(EntityStat.entity_id.in_(entity_ids))).all() == []
    assert db_session.scalars(select(Vote).where(Vote.entity_id.in_(entity_ids))).all() == []

    # Subsequent delete gives 404
    assert client.delete(f"/api/v1/smash-or-pass/admin/rosters/{slug}", headers=admin_headers).status_code == 404


@pytest.mark.unit
def test_minigames_admin_deletion(
    client: FlaskClient,
    db_session: Session,
    admin_headers: dict[str, str],
    user_headers: dict[str, str],
) -> None:
    challenge = MinigameDailyChallenge(
        challenge_date=date(2026, 10, 18),
        game_mode="classic",
        title="Admin Delete Minigame",
        description="Minigame to be deleted",
        rounds=[{"round": 1}],
        is_active=True,
    )
    db_session.add(challenge)
    db_session.commit()
    challenge_id = challenge.id

    # Delete permissions
    del_anon = client.delete(f"/api/v1/minigames/official/{challenge_id}")
    assert del_anon.status_code == 401

    del_user = client.delete(f"/api/v1/minigames/official/{challenge_id}", headers=user_headers)
    assert del_user.status_code == 403

    del_admin = client.delete(f"/api/v1/minigames/official/{challenge_id}", headers=admin_headers)
    assert del_admin.status_code == 200

    # Verify DB row is gone
    assert db_session.get(MinigameDailyChallenge, challenge_id) is None

    # Subsequent delete gives 404
    assert client.delete(f"/api/v1/minigames/official/{challenge_id}", headers=admin_headers).status_code == 404


def test_invalid_cover_url_is_rejected_not_silently_cleared(app, db_session, monkeypatch, tmp_path):
    """2026-10-19 review L7: an unusable cover URL used to become None and wipe the cover."""
    from app.core.security import generate_token
    from app.models.user import User
    from app.services import tier_list_service

    monkeypatch.setattr(tier_list_service, "_rewrite_seed_file", lambda: None)
    admin = User(login="cover_admin", username="cover_admin", email="cover_admin@example.com",
                 password_hash="x", role="admin", is_active=True)
    db_session.add(admin)
    db_session.commit()
    headers = {"Authorization": f"Bearer {generate_token(admin.id, role='admin')}"}
    client = app.test_client()
    created = client.post("/api/v1/tier-lists", headers=headers, json={
        "title": "Cover test", "cover_image_url": "https://cdn.example/cover.png",
        "tiers": [{"id": "s", "label": "S", "color": "s"}], "items": [{"id": "a", "name": "A"}],
    })
    assert created.status_code == 201
    slug = created.get_json()["data"]["slug"]

    bad = client.put(f"/api/v1/tier-lists/{slug}", headers=headers, json={"cover_image_url": "javascript:alert(1)"})
    assert bad.status_code == 400
    assert client.get(f"/api/v1/tier-lists/{slug}", headers=headers).get_json()["data"]["cover_image_url"] == "https://cdn.example/cover.png"

    cleared = client.put(f"/api/v1/tier-lists/{slug}", headers=headers, json={"cover_image_url": ""})
    assert cleared.status_code == 200
    assert cleared.get_json()["data"]["cover_image_url"] == ""


def test_oversized_request_gets_a_json_413(app):
    app.config["MAX_CONTENT_LENGTH"] = 1024
    try:
        res = app.test_client().post("/api/v1/minigames/guess", data="x" * 4096, content_type="application/json")
        assert res.status_code == 413
        assert "too large" in res.get_json()["error"]
    finally:
        app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024
