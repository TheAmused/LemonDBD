# backend/tests/unit/test_minigames_routes.py
from datetime import date
import pytest
from app.core.extensions import db
from app.core.security import generate_token
from app.models.chapter import Chapter
from app.models.character import Killer, Survivor
from app.models.map import Realm
from app.models.user import User


@pytest.fixture
def auth_tokens(app, test_db):
    """Create test admin and standard user tokens."""
    admin_user = User(
        username="admin_lemon",
        email="admin@lemondbd.com",
        password_hash="mock_admin_hash",
        role="admin",
        is_verified=True,
    )
    db.session.add(admin_user)

    normal_user = User(
        username="regular_user",
        email="user@lemondbd.com",
        password_hash="mock_user_hash",
        role="user",
        is_verified=True,
    )
    db.session.add(normal_user)

    # Seed catalog basics
    chap = Chapter(id=1, name="Base Game", release_date=date(2016, 6, 14), release_year=2016)
    db.session.add(chap)
    surv = Survivor(id=1, name="Dwight Fairfield", chapter_id=1)
    db.session.add(surv)
    killer = Killer(id=1, name="The Trapper", chapter_id=1, power_name="Bear Trap")
    db.session.add(killer)
    realm = Realm(id=1, name="The MacMillan Estate")
    db.session.add(realm)

    db.session.commit()

    admin_token = generate_token(admin_user.id, role="admin")
    user_token = generate_token(normal_user.id, role="user")
    return {"admin": admin_token, "user": user_token}


def test_get_catalog_endpoint(app, test_db, auth_tokens):
    client = app.test_client()
    res = client.get("/api/v1/minigames/catalog")
    assert res.status_code == 200
    data = res.get_json()
    assert "characters" in data
    assert "realms" in data
    assert len(data["characters"]) >= 2


def test_get_daily_challenge_endpoint(app, test_db, auth_tokens):
    client = app.test_client()
    res = client.get("/api/v1/minigames/daily?mode=classic&date=2026-09-29")
    assert res.status_code == 200
    data = res.get_json()
    assert data["game_mode"] == "classic"
    assert len(data["rounds"]) >= 1


def test_share_custom_challenge_and_retrieve(app, test_db, auth_tokens):
    client = app.test_client()
    payload = {
        "title": "My Custom Fog Trial",
        "description": "Multi-stage trial",
        "rounds": [
            {"round_number": 1, "mode": "realm_guesser", "target_id": 1}
        ]
    }
    # Share
    res = client.post("/api/v1/minigames/share", json=payload)
    assert res.status_code == 201
    data = res.get_json()
    assert "short_code" in data
    code = data["short_code"]

    # Retrieve by short_code
    res_get = client.get(f"/api/v1/minigames/share/{code}")
    assert res_get.status_code == 200
    retrieved = res_get.get_json()
    assert retrieved["title"] == "My Custom Fog Trial"
    assert retrieved["short_code"] == code


def test_admin_post_official_challenge_permissions(app, test_db, auth_tokens):
    client = app.test_client()
    admin_token = auth_tokens["admin"]
    user_token = auth_tokens["user"]

    official_payload = {
        "challenge_date": "2026-09-30",
        "game_mode": "fog_trial",
        "title": "Admin Fog Trial",
        "description": "Curated by admin",
        "rounds": [
            {"round_number": 1, "mode": "realm_guesser", "target_id": 1}
        ],
    }

    # Standard user cannot post official challenge
    res_forbidden = client.post(
        "/api/v1/minigames/official",
        headers={"Authorization": f"Bearer {user_token}"},
        json=official_payload,
    )
    assert res_forbidden.status_code == 403

    # Admin can post official challenge
    res_admin = client.post(
        "/api/v1/minigames/official",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=official_payload,
    )
    assert res_admin.status_code in (200, 201)
    admin_data = res_admin.get_json()
    assert admin_data["title"] == "Admin Fog Trial"


def test_user_stats_tracking(app, test_db, auth_tokens):
    client = app.test_client()
    user_token = auth_tokens["user"]

    # Post stats update
    res = client.post(
        "/api/v1/minigames/stats",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"game_mode": "classic", "won": True, "attempts_taken": 2},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["current_streak"] == 1
    assert data["max_streak"] == 1
    assert data["total_won"] == 1
    assert data["guess_distribution"]["2"] == 1

    # Get stats
    res_get = client.get(
        "/api/v1/minigames/stats",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert res_get.status_code == 200
    all_stats = res_get.get_json()
    assert "classic" in all_stats["stats"]
    assert all_stats["stats"]["classic"]["total_won"] == 1


def test_submit_guess_with_custom_round_config(app, test_db):
    client = app.test_client()
    res = client.post(
        "/api/v1/minigames/guess",
        json={
            "guess_id": 1,
            "guess_type": "realm",
            "custom_round_config": {
                "round_number": 1,
                "mode": "realm_guesser",
                "target_type": "realm",
                "target_id": 1,
                "max_attempts": 6,
            },
            "attempt_number": 1,
        },
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["is_correct"] is True


def test_get_daily_and_repeatable_with_mode(app, test_db):
    client = app.test_client()
    # Test mode=realm
    res_daily = client.get("/api/v1/minigames/daily?mode=realm")
    assert res_daily.status_code == 200
    data_daily = res_daily.get_json()
    assert data_daily["game_mode"] == "realm"
    assert data_daily["rounds"][0]["mode"] == "realm_guesser"

    # Test mode=perk for repeatable
    res_rep = client.get("/api/v1/minigames/repeatable?mode=perk")
    assert res_rep.status_code == 200
    data_rep = res_rep.get_json()
    assert data_rep["game_mode"] == "perk"
