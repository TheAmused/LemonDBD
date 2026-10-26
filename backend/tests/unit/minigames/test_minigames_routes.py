# backend/tests/unit/minigames/test_minigames_routes.py
from datetime import date
import pytest
from app.core.extensions import db
from app.core.security import generate_token
from app.models.chapter import Chapter
from app.models.character import Killer, Survivor
from app.models.map import Realm
from app.models.minigame import MinigameDailyChallenge, MinigameRepeatableChallenge
from app.models.user import User
from sqlalchemy import select


@pytest.fixture
def auth_tokens(app, test_db):
    """Create test admin and standard user tokens."""
    admin_user = User(
        login="admin_lemon", username="admin_lemon",
        email="admin@lemondbd.com",
        password_hash="mock_admin_hash",
        role="admin",
        is_verified=True,
    )
    db.session.add(admin_user)

    normal_user = User(
        login="regular_user", username="regular_user",
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


def test_self_reported_stats_endpoints_are_gone(app, test_db, auth_tokens):
    """The client-reported win/streak endpoints were removed: nothing called them
    and anything they stored was whatever the client claimed."""
    client = app.test_client()
    headers = {"Authorization": f"Bearer {auth_tokens['user']}"}
    assert client.post("/api/v1/minigames/stats", headers=headers, json={"won": True}).status_code in (404, 405)
    assert client.get("/api/v1/minigames/stats", headers=headers).status_code in (404, 405)


def test_submit_guess_with_custom_round_config(app, test_db):
    client = app.test_client()
    res = client.post(
        "/api/v1/minigames/guess",
        json={
            "guess_id": 1,
            "guess_type": "realm",
            "challenge_type": "custom",
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


def test_list_official_challenges_pagination_boundaries(app, test_db):
    client = app.test_client()
    res = client.get("/api/v1/minigames/official?page=-5&per_page=99999")
    assert res.status_code == 200
    assert isinstance(res.get_json(), list)



def test_daily_rejects_future_dates_and_unknown_modes(app, test_db, auth_tokens):
    client = app.test_client()
    assert client.get("/api/v1/minigames/daily?mode=classic&date=2999-01-01").status_code == 404
    assert client.get("/api/v1/minigames/daily?mode=made_up_mode&date=2026-09-29").status_code == 404
    # An admin may preview a scheduled day.
    admin = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    assert client.get("/api/v1/minigames/daily?mode=classic&date=2999-01-01", headers=admin).status_code == 200


def test_repeatable_rejects_unknown_modes(app, test_db):
    assert app.test_client().get("/api/v1/minigames/repeatable?mode=nope").status_code == 400


def test_classic_daily_withholds_the_answer_and_grades_the_stored_round(app, test_db, auth_tokens):
    client = app.test_client()
    daily = client.get("/api/v1/minigames/daily?mode=classic&date=2026-09-29").get_json()
    assert "target_id" not in daily["rounds"][0]

    stored = db.session.get(MinigameDailyChallenge, daily["id"]).rounds[0]
    wrong_type = "survivor" if stored["target_type"] == "killer" else "killer"
    # The client claims a round whose answer is its own guess; the server must
    # grade against what it stored instead.
    res = client.post(
        "/api/v1/minigames/guess",
        json={
            "challenge_id": daily["id"],
            "challenge_type": "daily",
            "round_index": 0,
            "guess_id": stored["target_id"],
            "guess_type": wrong_type,
            "custom_round_config": {"mode": "classic_character", "target_type": wrong_type, "target_id": stored["target_id"]},
            "attempt_number": 1,
        },
    )
    assert res.status_code == 200
    body = res.get_json()
    assert body["is_correct"] is False
    assert "answer" not in body  # attempts left: the answer stays on the server

    give_up = client.post(
        "/api/v1/minigames/guess",
        json={"challenge_id": daily["id"], "challenge_type": "daily", "round_index": 0, "give_up": True},
    ).get_json()
    assert give_up["answer"] == {"target_type": stored["target_type"], "target_id": stored["target_id"]}


def test_official_listing_hides_scheduled_days_and_answers(app, test_db, auth_tokens):
    client = app.test_client()
    admin = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    for day in ("2026-09-01", "2999-01-01"):
        client.post(
            "/api/v1/minigames/official",
            headers=admin,
            json={"challenge_date": day, "game_mode": "classic", "title": f"T {day}",
                  "rounds": [{"round_number": 1, "mode": "classic_character", "target_type": "killer", "target_id": 1}]},
        )
    public = client.get("/api/v1/minigames/official").get_json()
    assert [c["challenge_date"] for c in public] == ["2026-09-01"]
    assert "target_id" not in public[0]["rounds"][0]
    assert len(client.get("/api/v1/minigames/official", headers=admin).get_json()) == 2


def test_expired_practice_sessions_are_purged(app, test_db):
    from datetime import datetime, timedelta, timezone
    from app.services.minigames import purge_expired_repeatables

    db.session.add(MinigameRepeatableChallenge(
        session_id="s", game_mode="classic", rounds=[], expires_at=datetime.now(timezone.utc) - timedelta(minutes=1)
    ))
    db.session.add(MinigameRepeatableChallenge(
        session_id="s", game_mode="classic", rounds=[], expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
    ))
    db.session.commit()
    assert purge_expired_repeatables() == 1
    assert len(db.session.scalars(select(MinigameRepeatableChallenge)).all()) == 1
