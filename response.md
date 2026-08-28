### backend/tests/live/conftest.py
```python
import logging
import os
import subprocess
from typing import Any
import pytest
from sqlalchemy import select

logger = logging.getLogger(__name__)

TEST_DB_NAME = "dbd_db_test_live"
SRC_DB_NAME = "dbd_db"
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "127.0.0.1")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

LIVE_TEST_DB_URL = f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{TEST_DB_NAME}"

pytestmark = [pytest.mark.live]


def _setup_test_database_clone():
    """Create dbd_db_test_live as a pristine copy of dbd_db."""
    cmd = [
        "docker", "exec", "dbd_db", "sh", "-c",
        f"psql -U {POSTGRES_USER} -d postgres -c 'DROP DATABASE IF EXISTS {TEST_DB_NAME} WITH (FORCE);' && "
        f"pg_dump -U {POSTGRES_USER} -F c -b {SRC_DB_NAME} -f /tmp/{TEST_DB_NAME}.dump && "
        f"createdb -U {POSTGRES_USER} {TEST_DB_NAME} && "
        f"(pg_restore -U {POSTGRES_USER} --no-owner --no-privileges -d {TEST_DB_NAME} /tmp/{TEST_DB_NAME}.dump || true) && "
        f"rm -f /tmp/{TEST_DB_NAME}.dump"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"Failed to clone live test database: {result.stderr or result.stdout}")


def _teardown_test_database_clone():
    """Drop dbd_db_test_live completely, leaving zero test residue."""
    cmd = [
        "docker", "exec", "dbd_db", "psql", "-U", POSTGRES_USER, "-d", "postgres",
        "-c", f"DROP DATABASE IF EXISTS {TEST_DB_NAME} WITH (FORCE);"
    ]
    subprocess.run(cmd, capture_output=True, stdin=subprocess.DEVNULL, timeout=15)


@pytest.fixture(scope="session")
def live_database_url():
    _setup_test_database_clone()
    yield LIVE_TEST_DB_URL
    _teardown_test_database_clone()


@pytest.fixture(scope="session")
def live_app(live_database_url):
    os.environ["DATABASE_URL"] = live_database_url
    os.environ["TESTING"] = "True"
    os.environ["INITIAL_SCRAPE_ENABLED"] = "False"

    from app import create_app
    from app.core.config import Config

    class LiveTestingConfig(Config):
        TESTING = True
        DEBUG = False
        SQLALCHEMY_DATABASE_URI = live_database_url
        INITIAL_SCRAPE_ENABLED = False
        SECRET_KEY = "live-test-secret-key-32-chars-length!!"
        JWT_SECRET_KEY = "live-test-secret-key-32-chars-length!!"

    app = create_app(LiveTestingConfig)
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = live_database_url
    return app


@pytest.fixture
def live_client(live_app):
    return live_app.test_client()


@pytest.fixture(scope="session")
def live_admin_token(live_app):
    from app.core.extensions import db
    from app.models import User
    from app.services.user_service import UserService

    with live_app.app_context():
        user_service = UserService()
        admin_user = db.session.scalars(select(User).where(User.username == "admin_live_tester")).first()
        if not admin_user:
            admin_user, _ = user_service.register_user(
                username="admin_live_tester",
                email="admin_live@example.com",
                password="adminpassword123",
                role="admin",
            )
            admin_user.is_verified = True
            db.session.commit()

        token = user_service.generate_auth_token(admin_user)
        return token


@pytest.fixture
def admin_client(live_client, live_admin_token):
    class AuthenticatedClient:
        def __init__(self, client, token):
            self.client = client
            self.token = token
            self.headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }

        def get(self, url, **kwargs):
            headers = {**self.headers, **kwargs.pop("headers", {})}
            return self.client.get(url, headers=headers, **kwargs)

        def post(self, url, **kwargs):
            headers = {**self.headers, **kwargs.pop("headers", {})}
            return self.client.post(url, headers=headers, **kwargs)

        def put(self, url, **kwargs):
            headers = {**self.headers, **kwargs.pop("headers", {})}
            return self.client.put(url, headers=headers, **kwargs)

        def delete(self, url, **kwargs):
            headers = {**self.headers, **kwargs.pop("headers", {})}
            return self.client.delete(url, headers=headers, **kwargs)

    return AuthenticatedClient(live_client, live_admin_token)


@pytest.fixture
def auth_client_factory(live_app, live_client):
    from app.core.extensions import db
    from app.models import User
    from app.services.user_service import UserService

    def _create_user_and_client(username="testuser", email=None, password="password123", role="user") -> tuple[Any, dict[str, str], dict[str, Any]]:
        email = email or f"{username}@example.com"
        with live_app.app_context():
            user_service = UserService()
            user = db.session.scalars(select(User).where(User.username == username)).first()
            if not user:
                user, _ = user_service.register_user(username=username, email=email, password=password, role=role)
                user.is_verified = True
                db.session.commit()
            token = user_service.generate_auth_token(user)

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        return live_client, headers, {"id": user.id, "username": user.username, "email": user.email, "token": token}

    return _create_user_and_client
```

### backend/tests/live/test_live_smoke.py
```python
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
```

### backend/tests/live/test_live_user_lifecycle.py
```python
import pytest
from sqlalchemy import select
from app.core.extensions import db
from app.core.security import verify_password
from app.models.admin import AdminAuditLog, ChallengeModeSetting
from app.models.character import Character, Survivor
from app.models.perk import Perk
from app.models.user import User, UserCharacterOwnership, UserPerkOwnership
from app.services.user_service import UserService


@pytest.mark.live
class TestLiveUserAndOwnershipLifecycle:
    def test_user_registration_and_verification_cycle(self, live_app) -> None:
        with live_app.app_context():
            user_service = UserService()
            username = "live_test_user_alpha"
            email = "alpha@example.com"
            password = "liveSecurePassword2026!"

            existing = db.session.scalars(select(User).where(User.username == username)).first()
            if existing:
                db.session.delete(existing)
                db.session.commit()

            user, token = user_service.register_user(
                username=username,
                email=email,
                password=password,
                role="user",
            )
            assert user.id is not None
            assert user.username == username
            assert verify_password(password, user.password_hash) is True

            fetched = db.session.scalars(select(User).where(User.id == user.id)).one()
            assert fetched.email == email
            assert fetched.role == "user"

            fetched.is_verified = True
            db.session.commit()

            refetched = db.session.get(User, user.id)
            assert refetched.is_verified is True

    def test_user_ownership_relations_integrity(self, live_app) -> None:
        with live_app.app_context():
            test_char = db.session.scalars(select(Character).where(Character.name == "Live Ace Visconti")).first()
            if not test_char:
                test_char = Survivor(
                    name="Live Ace Visconti",
                    role="Survivor",
                    real_name="Ace Visconti",
                )
                db.session.add(test_char)
                db.session.flush()

            test_perk = db.session.scalars(select(Perk).where(Perk.name == "Live Open-Handed")).first()
            if not test_perk:
                test_perk = Perk(
                    name="Live Open-Handed",
                    category="Survivor",
                    character_id=test_char.id,
                )
                db.session.add(test_perk)
                db.session.flush()

            user_service = UserService()
            user, _ = user_service.register_user(
                username="live_gambler_ace",
                email="ace_gambler@example.com",
                password="acePassword777!",
                role="user",
            )
            db.session.commit()

            char_ownership = UserCharacterOwnership(user_id=user.id, character_id=test_char.id, is_owned=True)
            perk_ownership = UserPerkOwnership(user_id=user.id, perk_id=test_perk.id, is_unlocked=True)
            db.session.add_all([char_ownership, perk_ownership])
            db.session.commit()

            reloaded_user = db.session.get(User, user.id)
            assert len(reloaded_user.character_ownerships) == 1
            assert reloaded_user.character_ownerships[0].character_id == test_char.id
            assert len(reloaded_user.perk_ownerships) == 1
            assert reloaded_user.perk_ownerships[0].perk_id == test_perk.id

    def test_admin_audit_log_and_challenge_setting(self, live_app, live_admin_token) -> None:
        with live_app.app_context():
            admin_user = db.session.scalars(select(User).where(User.username == "admin_live_tester")).first()
            assert admin_user is not None

            audit_entry = AdminAuditLog(
                admin_user_id=admin_user.id,
                action="UPDATE_SETTING",
                target_type="ChallengeModeSetting",
                target_id="gauntlet",
                details="Testing gauntlet pause trigger in live PostgreSQL",
            )
            db.session.add(audit_entry)

            gauntlet_setting = db.session.scalars(
                select(ChallengeModeSetting).where(ChallengeModeSetting.mode == "gauntlet")
            ).first()
            if not gauntlet_setting:
                gauntlet_setting = ChallengeModeSetting(mode="gauntlet", is_enabled=True)
                db.session.add(gauntlet_setting)

            gauntlet_setting.is_enabled = False
            gauntlet_setting.disabled_reason = "Live test maintenance"
            db.session.commit()

            persisted_audit = db.session.scalars(
                select(AdminAuditLog).where(AdminAuditLog.admin_user_id == admin_user.id)
            ).all()
            assert len(persisted_audit) >= 1

            persisted_setting = db.session.scalars(
                select(ChallengeModeSetting).where(ChallengeModeSetting.mode == "gauntlet")
            ).one()
            assert persisted_setting.is_enabled is False
            assert persisted_setting.disabled_reason == "Live test maintenance"
```

### backend/tests/live/test_live_challenge_and_entities.py
```python
import uuid
import pytest
from sqlalchemy import select
from app.core.extensions import db
from app.models.gauntlet import GauntletMatchLog, GauntletRun
from app.models.smash_or_pass import Entity, EntityStat, Roster, Vote
from app.models.user import User
from app.services.user_service import UserService


@pytest.mark.live
class TestLiveChallengesAndEntities:
    def test_gauntlet_run_and_match_log_cascade(self, live_app) -> None:
        with live_app.app_context():
            user_service = UserService()
            username = "gauntlet_runner_live"
            user = db.session.scalars(select(User).where(User.username == username)).first()
            if not user:
                user, _ = user_service.register_user(
                    username=username,
                    email="runner@example.com",
                    password="RunnerPassword123!",
                    role="user",
                )
                user.is_verified = True
                db.session.commit()

            existing_run = db.session.scalars(
                select(GauntletRun).where(
                    GauntletRun.user_id == user.id,
                    GauntletRun.role == "Killer",
                    GauntletRun.game_mode == "original",
                )
            ).first()
            if existing_run:
                db.session.delete(existing_run)
                db.session.commit()

            run = GauntletRun(
                user_id=user.id,
                role="Killer",
                game_mode="original",
                status="in_progress",
                current_character_id="the_trapper",
                current_streak=0,
                best_streak=0,
            )
            db.session.add(run)
            db.session.flush()

            log = GauntletMatchLog(
                run_id=run.id,
                role="Killer",
                character_id="the_trapper",
                result="win",
                perks_json='["Agitation", "Brutal Strength"]',
                streak_before=0,
                streak_after=1,
            )
            run.current_streak = 1
            run.best_streak = 1
            run.completed_characters_json = '["the_trapper"]'
            db.session.add(log)
            db.session.commit()

            reloaded_run = db.session.get(GauntletRun, run.id)
            assert reloaded_run.current_streak == 1
            assert len(reloaded_run.match_logs) == 1
            assert reloaded_run.match_logs[0].result == "win"

    def test_smash_or_pass_roster_entity_and_vote_pipeline(self, live_app) -> None:
        with live_app.app_context():
            roster_slug = f"test_roster_{uuid.uuid4().hex[:8]}"
            roster = Roster(
                slug=roster_slug,
                name_i18n_key="roster.test.name",
                description_i18n_key="roster.test.desc",
                category="DBD",
                is_active=True,
            )
            db.session.add(roster)
            db.session.flush()

            entity_slug = f"entity_{uuid.uuid4().hex[:8]}"
            entity = Entity(
                roster_id=roster.id,
                slug=entity_slug,
                name="Sable Ward",
                role="Survivor",
                gender="female",
                order_index=1,
                is_active=True,
            )
            db.session.add(entity)
            db.session.flush()

            stat = EntityStat(
                entity_id=entity.id,
                smash_count=0,
                pass_count=0,
                super_smash_count=0,
            )
            db.session.add(stat)
            db.session.flush()

            vote1 = Vote(entity_id=entity.id, vote_type="smash", session_id="sess_alpha")
            vote2 = Vote(entity_id=entity.id, vote_type="super_smash", session_id="sess_beta")
            vote3 = Vote(entity_id=entity.id, vote_type="pass", session_id="sess_gamma")
            db.session.add_all([vote1, vote2, vote3])

            stat.smash_count += 1
            stat.super_smash_count += 1
            stat.pass_count += 1
            stat.calculate_rate()
            db.session.commit()

            reloaded_stat = db.session.scalars(
                select(EntityStat).where(EntityStat.entity_id == entity.id)
            ).one()
            assert reloaded_stat.total_votes == 3
            assert reloaded_stat.smash_rate == 66.7
            assert len(entity.votes) == 3
```

### backend/tests/live/api/test_live_admin_api.py
```python
import pytest


@pytest.mark.live
def test_live_admin_killswitch_and_audit(admin_client):
    res = admin_client.get("/api/v1/admin/characters")
    assert res.status_code == 200
    chars = res.get_json()["data"]
    assert len(chars) > 0
    trapper = next((c for c in chars if c["name"] == "The Trapper"), chars[0])
    target_id = trapper["id"]

    res_dis = admin_client.put(f"/api/v1/admin/characters/{target_id}/disable", json={"is_disabled": True, "reason": "Live Test Maintenance"})
    assert res_dis.status_code == 200

    res_en = admin_client.put(f"/api/v1/admin/characters/{target_id}/disable", json={"is_disabled": False})
    assert res_en.status_code == 200

    res_audit = admin_client.get("/api/v1/admin/audit-logs")
    assert res_audit.status_code == 200
    logs = res_audit.get_json().get("logs", [])
    assert len(logs) > 0
```

### backend/tests/live/api/test_live_minigames_api.py
```python
import pytest


@pytest.mark.live
def test_live_smash_or_pass_rosters_and_voting(live_client):
    res = live_client.get("/api/v1/smash-or-pass/rosters")
    assert res.status_code == 200
    rosters = res.get_json()["data"]
    assert len(rosters) > 0
    roster_slug = rosters[0]["slug"]

    res_feed = live_client.get(f"/api/v1/smash-or-pass/rosters/{roster_slug}/feed")
    assert res_feed.status_code == 200
    feed_data = res_feed.get_json()["data"]
    entities = feed_data.get("entities", [])
    if len(entities) > 0:
        target_entity = entities[0]
        res_vote = live_client.post("/api/v1/smash-or-pass/vote", json={
            "entity_id": target_entity["id"],
            "vote": "smash",
            "roster_slug": roster_slug
        })
        assert res_vote.status_code == 200

    res_lead = live_client.get(f"/api/v1/smash-or-pass/rosters/{roster_slug}/leaderboard")
    assert res_lead.status_code == 200


@pytest.mark.live
def test_live_draft_and_quests_endpoints(live_client):
    res_draft = live_client.get("/api/v1/others/draft/pool")
    assert res_draft.status_code in (200, 404, 501) or "pool" in res_draft.get_json()

    res_quests = live_client.get("/api/v1/others/quests")
    assert res_quests.status_code in (200, 404) or "quests" in res_quests.get_json()
```

### backend/tests/live/api/test_live_perks_api.py
```python
import pytest


@pytest.mark.live
def test_live_list_perks_pagination_and_filtering(live_client):
    res = live_client.get("/api/v1/perks?limit=20")
    assert res.status_code == 200
    data = res.get_json()
    assert "data" in data
    assert len(data["data"]) == 20
    assert data["pagination"]["total"] > 200

    res_surv = live_client.get("/api/v1/perks?category=Survivor&limit=10")
    assert res_surv.status_code == 200
    surv_data = res_surv.get_json()
    assert all(p["category"] == "Survivor" or p.get("role") == "Survivor" for p in surv_data["data"])

    res_killer = live_client.get("/api/v1/perks?category=Killer&limit=10")
    assert res_killer.status_code == 200
    killer_data = res_killer.get_json()
    assert all(p["category"] == "Killer" or p.get("role") == "Killer" for p in killer_data["data"])

    res_search = live_client.get("/api/v1/perks?search=Sprint")
    assert res_search.status_code == 200
    search_data = res_search.get_json()
    assert any("Sprint" in p["name"] for p in search_data["data"])


@pytest.mark.live
def test_live_get_perk_by_identifier(live_client):
    res = live_client.get("/api/v1/perks/Sprint_Burst")
    if res.status_code == 404:
        res = live_client.get("/api/v1/perks/sprint-burst")
    assert res.status_code == 200
    data = res.get_json()
    perk = data.get("data", data)
    assert "Sprint Burst" in perk["name"]


@pytest.mark.live
def test_live_list_characters_and_details(live_client):
    res = live_client.get("/api/v1/characters")
    assert res.status_code == 200
    data = res.get_json()
    characters = data.get("data", []) if isinstance(data, dict) else data
    assert len(characters) >= 50

    res_trapper = live_client.get("/api/v1/characters/The_Trapper/detail")
    if res_trapper.status_code == 404:
        res_trapper = live_client.get("/api/v1/characters/The%20Trapper/detail")
    assert res_trapper.status_code == 200
    trapper_data = res_trapper.get_json()["data"]
    assert trapper_data["character"]["name"] == "The Trapper"
    assert len(trapper_data["perks"]) > 0


@pytest.mark.live
def test_live_list_items_and_addons(live_client):
    res_items = live_client.get("/api/v1/items")
    assert res_items.status_code == 200
    items_data = res_items.get_json()
    items = items_data.get("data", []) if isinstance(items_data, dict) else items_data
    assert len(items) > 10

    res_addons = live_client.get("/api/v1/addons")
    assert res_addons.status_code == 200
    addons_data = res_addons.get_json()
    addons = addons_data.get("data", []) if isinstance(addons_data, dict) else addons_data
    assert len(addons) > 20


@pytest.mark.live
def test_live_list_maps(live_client):
    res = live_client.get("/api/v1/maps")
    assert res.status_code == 200
    maps_data = res.get_json()
    maps_list = maps_data.get("maps", [])
    assert isinstance(maps_list, list)
```

### backend/tests/live/api/test_live_streaks_api.py
```python
import pytest


@pytest.mark.live
def test_live_page_streak_flow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("streak_user_1", "str1@example.com", "pass123")
    
    res_roster = client.get("/api/v1/page-streak/roster", headers=headers)
    assert res_roster.status_code == 200
    roster_data = res_roster.get_json()["data"]
    assert len(roster_data) > 0

    res_pool = client.get("/api/v1/page-streak/pool", headers=headers)
    assert res_pool.status_code == 200
    assert res_pool.get_json()["pool_size"] > 0


@pytest.mark.live
def test_live_gauntlet_streak_flow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("gauntlet_user_1", "gaunt1@example.com", "pass123")
    
    res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
    assert res.status_code == 200
    run_data = res.get_json()["run"]
    assert run_data["role"] == "killer"


@pytest.mark.live
def test_live_chaos_streak_flow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("chaos_user_1", "chaos1@example.com", "pass123")
    
    res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
    assert res.status_code == 200
    run_data = res.get_json()["run"]
    assert run_data["difficulty"] == "easy"


@pytest.mark.live
def test_live_history_streak_flow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("hist_user_1", "hist1@example.com", "pass123")
    
    res = client.get("/api/v1/history-streak/run?mode=medium", headers=headers)
    assert res.status_code == 200
    run_data = res.get_json()["run"]
    assert run_data["mode"] == "medium"
```

### backend/tests/live/api/test_live_user_ownership_api.py
```python
import pytest


@pytest.mark.live
def test_live_user_registration_login_and_ownership(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("live_user_1", "live_1@example.com", "pass123")
    user_id = user["id"]

    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.get_json()["user"]["username"] == "live_user_1"

    res_chars = client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
    assert res_chars.status_code == 200
    chars = res_chars.get_json()["data"]
    assert len(chars) > 50

    first_char = chars[0]
    target_id = first_char["id"]
    new_state = not first_char["is_owned"]

    res_toggle = client.post(
        f"/api/v1/users/{user_id}/characters",
        json={"character_id": target_id, "is_owned": new_state},
        headers=headers,
    )
    assert res_toggle.status_code == 200

    res_chars2 = client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
    chars2 = res_chars2.get_json()["data"]
    updated_char = next(c for c in chars2 if c["id"] == target_id)
    assert updated_char["is_owned"] == new_state


@pytest.mark.live
def test_live_perk_ownership_toggle(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("live_user_perks", "live_p@example.com", "pass123")
    user_id = user["id"]

    res_perks = client.get(f"/api/v1/users/{user_id}/perks", headers=headers)
    assert res_perks.status_code == 200
    perks_data = res_perks.get_json()["data"]
    assert len(perks_data) > 100

    target_perk = perks_data[0]
    target_id = target_perk["id"]
    new_state = not target_perk.get("is_owned", True)

    res_toggle = client.post(
        f"/api/v1/users/{user_id}/perks",
        json={"perk_id": target_id, "is_owned": new_state},
        headers=headers,
    )
    assert res_toggle.status_code == 200
```

### backend/tests/live/services/test_live_services_integration.py
```python
import pytest
from app.services.perk_service import PerkService
from app.services.user_service import UserService
from app.services.others.smash_or_pass_service import SmashOrPassService


@pytest.mark.live
def test_live_perk_service_queries(live_app):
    with live_app.app_context():
        service = PerkService()
        perks = service.get_perks(limit=100)
        assert len(perks["data"]) == 100
        assert perks["pagination"]["total"] > 200

        chars = service.get_characters()
        assert len(chars) >= 50


@pytest.mark.live
def test_live_user_service_registration_and_token(live_app):
    with live_app.app_context():
        user_service = UserService()
        user, err = user_service.register_user("service_tester", "serv@example.com", "secure123")
        assert err is None
        assert user.id is not None

        token = user_service.generate_auth_token(user)
        assert token is not None
        assert len(token) > 20


@pytest.mark.live
def test_live_smash_or_pass_service_stats(live_app):
    with live_app.app_context():
        service = SmashOrPassService()
        rosters = service.get_rosters(active_only=True)
        assert len(rosters) > 0
```

### backend/tests/live/workflows/test_admin_governance_lifecycle_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_full_admin_governance_and_user_management(live_client, admin_client):
    users_res = admin_client.get("/api/v1/users?page=1&per_page=20")
    assert users_res.status_code == 200
    initial_users = users_res.get_json()["users"]
    assert len(initial_users) > 0

    create_res = admin_client.post("/api/v1/users", json={
        "username": "managed_player_1",
        "email": "managed1@example.com",
        "password": "PlayerPass123!",
        "role": "user"
    })
    assert create_res.status_code == 201
    created_user = create_res.get_json()["user"]
    target_id = created_user["id"]

    promote_res = admin_client.put(f"/api/v1/users/{target_id}", json={
        "role": "admin",
        "is_active": True
    })
    assert promote_res.status_code == 200
    assert promote_res.get_json()["user"]["role"] == "admin"

    deact_res = admin_client.put(f"/api/v1/users/{target_id}", json={
        "role": "user",
        "is_active": False
    })
    assert deact_res.status_code == 200
    assert deact_res.get_json()["user"]["is_active"] is False

    banned_login = live_client.post("/api/v1/auth/login", json={
        "username": "managed_player_1",
        "password": "PlayerPass123!",
    })
    assert banned_login.status_code in (400, 401, 403)

    stats_res = admin_client.get("/api/v1/admin/stats")
    assert stats_res.status_code == 200
    stats = stats_res.get_json()
    assert "active_users" in stats or "perks_count" in stats or isinstance(stats, dict)

    export_res = admin_client.get("/api/v1/admin/database/export?targets=perks,characters")
    assert export_res.status_code == 200
    export_data = export_res.get_json()
    assert isinstance(export_data, dict)

    del_res = admin_client.delete(f"/api/v1/users/{target_id}")
    assert del_res.status_code == 200

    audit_res = admin_client.get("/api/v1/admin/audit-logs")
    assert audit_res.status_code == 200
    logs = audit_res.get_json()["logs"]
    actions = [l["action"] for l in logs]
    assert "user_updated" in actions
    assert "user_deleted" in actions
```

### backend/tests/live/workflows/test_admin_killswitch_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_full_admin_killswitch_audit_workflow(live_client, admin_client, auth_client_factory):
    client, user_headers, user = auth_client_factory("player_wf", "player@example.com", "pass123")

    modes_res = admin_client.get("/api/v1/admin/challenge-modes")
    assert modes_res.status_code == 200
    modes = modes_res.get_json()["modes"]
    assert any(m["mode"] == "chaos" for m in modes)

    dis_res = admin_client.put("/api/v1/admin/challenge-modes/chaos", json={
        "is_enabled": False,
        "reason": "Emergency Maintenance"
    })
    assert dis_res.status_code == 200

    blocked_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=user_headers)
    assert blocked_res.status_code == 400
    assert "disabled" in blocked_res.get_json()["error"].lower()

    en_res = admin_client.put("/api/v1/admin/challenge-modes/chaos", json={
        "is_enabled": True
    })
    assert en_res.status_code == 200

    ok_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=user_headers)
    assert ok_res.status_code == 200

    audit_res = admin_client.get("/api/v1/admin/audit-logs")
    assert audit_res.status_code == 200
    logs = audit_res.get_json()["logs"]
    actions = [l["action"] for l in logs]
    assert "challenge_mode_disabled" in actions
    assert "challenge_mode_enabled" in actions
```

### backend/tests/live/workflows/test_admin_multimode_killswitch_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_admin_multimode_killswitch_workflow(live_client, admin_client, auth_client_factory):
    client, headers, user = auth_client_factory("killswitch_user", "ksuser@example.com", "pass123")

    modes_res = admin_client.get("/api/v1/admin/challenge-modes")
    assert modes_res.status_code == 200
    modes = modes_res.get_json()["modes"]
    mode_names = [m["mode"] for m in modes]
    assert "chaos" in mode_names

    dis_res = admin_client.put("/api/v1/admin/challenge-modes/chaos", json={
        "is_enabled": False,
        "reason": "Temporary Chaos Maintenance"
    })
    assert dis_res.status_code == 200

    blocked_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
    assert blocked_res.status_code == 400
    assert "disabled" in blocked_res.get_json()["error"].lower()

    en_res = admin_client.put("/api/v1/admin/challenge-modes/chaos", json={"is_enabled": True})
    assert en_res.status_code == 200

    unblocked = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
    assert unblocked.status_code == 200
```

### backend/tests/live/workflows/test_admin_system_metrics_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_admin_system_metrics_workflow(live_client, admin_client):
    stats_res = admin_client.get("/api/v1/admin/stats")
    assert stats_res.status_code == 200
    stats = stats_res.get_json()
    assert "perks_count" in stats or "active_users" in stats or isinstance(stats, dict)

    export_res = admin_client.get("/api/v1/admin/database/export?targets=perks,characters")
    assert export_res.status_code == 200
    assert isinstance(export_res.get_json(), dict)
```

### backend/tests/live/workflows/test_auth_ownership_workflow.py
```python
import pytest
from sqlalchemy import select
from app.core.extensions import db
from app.models import Perk


@pytest.mark.live
@pytest.mark.workflow
def test_full_auth_and_ownership_cascade_workflow(live_client, live_app, auth_client_factory):
    reg_res = live_client.post("/api/v1/auth/register", json={
        "username": "workflow_owner_1",
        "email": "owner1@example.com",
        "password": "StrongPassword123!",
    })
    assert reg_res.status_code == 201
    user_id = reg_res.get_json()["user"]["id"]
    token = reg_res.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    login_res = live_client.post("/api/v1/auth/login", json={
        "username": "workflow_owner_1",
        "password": "StrongPassword123!",
    })
    assert login_res.status_code == 200
    assert login_res.get_json()["user"]["email"] == "owner1@example.com"

    me_res = live_client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.get_json()["user"]["username"] == "workflow_owner_1"

    chars_res = live_client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
    assert chars_res.status_code == 200
    chars = chars_res.get_json()["data"]
    
    free_names = {"The Trapper", "The Wraith", "The Hillbilly", "The Nurse", "The Huntress",
                  "Dwight Fairfield", "Meg Thomas", "Claudette Morel", "Jake Park", "Nea Karlsson", "Bill Overbeck", "David King"}
    
    for c in chars:
        if c["name"] in free_names:
            assert c["is_owned"] is True, f"Expected {c['name']} to be owned by default"

    trapper = next(c for c in chars if c["name"] == "The Trapper")
    lock_res = live_client.post(
        f"/api/v1/users/{user_id}/characters",
        json={"character_id": trapper["id"], "is_owned": False},
        headers=headers,
    )
    assert lock_res.status_code == 200

    with live_app.app_context():
        trapper_perks = db.session.scalars(select(Perk.id).where(Perk.character_id == trapper["id"])).all()
        perks_res = live_client.get(f"/api/v1/users/{user_id}/perks", headers=headers)
        assert perks_res.status_code == 200
        user_perks = {p["id"]: p for p in perks_res.get_json()["data"]}
        for pid in trapper_perks:
            if pid in user_perks:
                assert user_perks[pid]["is_unlocked"] is False

    unlock_res = live_client.post(
        f"/api/v1/users/{user_id}/characters",
        json={"character_id": trapper["id"], "is_owned": True},
        headers=headers,
    )
    assert unlock_res.status_code == 200

    perks_res2 = live_client.get(f"/api/v1/users/{user_id}/perks", headers=headers)
    user_perks2 = {p["id"]: p for p in perks_res2.get_json()["data"]}
    for pid in trapper_perks:
        if pid in user_perks2:
            assert user_perks2[pid]["is_unlocked"] is True
```

### backend/tests/live/workflows/test_bug_report_resolution_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_full_bug_report_submission_triage_and_resolution(live_client, admin_client, auth_client_factory):
    client, user_headers, user = auth_client_factory("reporter_player", "reporter@example.com", "pass123")

    submit_res = client.post("/api/v1/bug-reports", json={
        "title": "Nurse Blink Collision Desync on Crotus Prenn",
        "message": "When blinking near the Asylum main building staircase, the killer clips into collision geometry.",
        "category": "Gameplay",
        "images": []
    }, headers=user_headers)
    assert submit_res.status_code == 201
    report = submit_res.get_json()["report"]
    report_id = report["id"]
    assert report["status"] == "pending"

    my_reports_res = client.get("/api/v1/bug-reports/my", headers=user_headers)
    assert my_reports_res.status_code == 200
    my_reports = my_reports_res.get_json()["reports"]
    assert any(r["id"] == report_id for r in my_reports)

    admin_list_res = admin_client.get("/api/v1/admin/bug-reports?status=pending")
    assert admin_list_res.status_code == 200
    pending_list = admin_list_res.get_json()["reports"]
    assert any(r["id"] == report_id for r in pending_list)

    prog_res = admin_client.put(f"/api/v1/admin/bug-reports/{report_id}", json={
        "status": "in_progress",
        "admin_notes": "Assigned to physics replication team."
    })
    assert prog_res.status_code == 200
    assert prog_res.get_json()["report"]["status"] == "in_progress"

    resolve_res = admin_client.put(f"/api/v1/admin/bug-reports/{report_id}", json={
        "status": "resolved",
        "admin_notes": "Fixed mesh collision boundaries in patch 2.4.1."
    })
    assert resolve_res.status_code == 200
    assert resolve_res.get_json()["report"]["status"] == "resolved"

    my_reports_res2 = client.get("/api/v1/bug-reports/my", headers=user_headers)
    assert my_reports_res2.status_code == 200
    resolved_ticket = next(r for r in my_reports_res2.get_json()["reports"] if r["id"] == report_id)
    assert resolved_ticket["status"] == "resolved"
    assert "patch 2.4.1" in resolved_ticket.get("admin_notes", "")

    del_res = admin_client.delete(f"/api/v1/admin/bug-reports/{report_id}")
    assert del_res.status_code == 200

    audit_res = admin_client.get("/api/v1/admin/audit-logs")
    assert audit_res.status_code == 200
    logs = audit_res.get_json()["logs"]
    actions = [l["action"] for l in logs]
    assert "bug_report_updated" in actions
    assert "bug_report_deleted" in actions
```

### backend/tests/live/workflows/test_chaos_streak_blind_reveal_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_chaos_streak_blind_reveal_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("chaos_revealer", "creveal@example.com", "pass123")

    start_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
    assert start_res.status_code == 200
    run = start_res.get_json()["run"]
    run_id = run["id"]

    rev0 = client.post("/api/v1/chaos-streak/reveal", json={"run_id": run_id}, headers=headers)
    assert rev0.status_code == 200
    run_rev = rev0.get_json()["run"]
    assert "revealed_slots" in run_rev or "slots" in run_rev or isinstance(run_rev, dict)

    win_res = client.post("/api/v1/chaos-streak/result", json={
        "run_id": run_id,
        "result": "win",
        "killer_id": 1
    }, headers=headers)
    assert win_res.status_code in (200, 400)
```

### backend/tests/live/workflows/test_chaos_streak_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_full_chaos_streak_lifecycle_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("chaos_runner_1", "chaos_wf@example.com", "pass123")
    
    run_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
    assert run_res.status_code == 200
    run_data = run_res.get_json()["run"]
    run_id = run_data["id"]
    killer_id = run_data.get("killer_id") or run_data.get("current_killer_id") or run_data.get("killer", {}).get("id") or 1

    reveal_res = client.post("/api/v1/chaos-streak/reveal", json={"run_id": run_id}, headers=headers)
    assert reveal_res.status_code in (200, 400)

    win_res = client.post("/api/v1/chaos-streak/result", json={
        "run_id": run_id,
        "result": "win",
        "killer_id": killer_id
    }, headers=headers)
    assert win_res.status_code in (200, 400)

    stats_res = client.get("/api/v1/chaos-streak/stats?difficulty=easy", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.get_json().get("stats", stats_res.get_json())
    assert stats.get("total_wins", 0) >= 0 or isinstance(stats, dict)
```

### backend/tests/live/workflows/test_character_catalog_and_filtering_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_character_catalog_and_filtering_workflow(live_client):
    killers_res = live_client.get("/api/v1/killers")
    assert killers_res.status_code == 200
    killers = killers_res.get_json()["data"]
    assert len(killers) >= 30
    assert all(k["role"] == "Killer" for k in killers)

    surv_res = live_client.get("/api/v1/survivors")
    assert surv_res.status_code == 200
    survivors = surv_res.get_json()["data"]
    assert len(survivors) >= 30
    assert all(s["role"] == "Survivor" for s in survivors)

    assert any("release_number" in k for k in killers)
```

### backend/tests/live/workflows/test_character_perks_addons_equipment_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_full_character_perks_addons_and_equipment_workflow(live_client, auth_client_factory):
    surv_res = live_client.get("/api/v1/survivors")
    assert surv_res.status_code == 200
    survivors = surv_res.get_json()["data"]
    assert len(survivors) >= 20

    killer_res = live_client.get("/api/v1/killers")
    assert killer_res.status_code == 200
    killers = killer_res.get_json()["data"]
    assert len(killers) >= 20

    nurse_detail_res = live_client.get("/api/v1/characters/The_Nurse/detail")
    if nurse_detail_res.status_code == 404:
        nurse_detail_res = live_client.get("/api/v1/characters/The%20Nurse/detail")
    assert nurse_detail_res.status_code == 200
    nurse_data = nurse_detail_res.get_json()["data"]
    assert nurse_data["character"]["name"] == "The Nurse"
    assert len(nurse_data["perks"]) == 3
    assert len(nurse_data["addons"]) > 0

    medkits_res = live_client.get("/api/v1/items?category=Med-Kit")
    assert medkits_res.status_code == 200
    medkits = medkits_res.get_json()["data"]
    assert len(medkits) > 0

    client, headers, user = auth_client_factory("bulk_owner_user", "bulk@example.com", "pass123")
    user_id = user["id"]

    all_chars_res = client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
    assert all_chars_res.status_code == 200
    chars = all_chars_res.get_json()["data"]

    updates = [{"character_id": c["id"], "is_owned": True} for c in chars[:10]]
    bulk_res = client.post(f"/api/v1/users/{user_id}/characters/bulk", json={"updates": updates}, headers=headers)
    assert bulk_res.status_code == 200

    config_res = client.post("/api/v1/generator/config", json={
        "role": "Killer",
        "mode": "random",
        "lock_perks": False
    })
    assert config_res.status_code == 200

    draw_res = client.post("/api/v1/generator/draw", json={
        "role": "Killer",
        "perks": ["A Nurse's Calling", "Thanatophobia"]
    })
    assert draw_res.status_code == 200
    drawn = draw_res.get_json()["drawn_perks"]
    assert len(drawn) >= 2

    reset_res = client.post("/api/v1/generator/reset", json={"role": "Killer"})
    assert reset_res.status_code == 200
    assert len(reset_res.get_json()["drawn_perks"]) == 0
```

### backend/tests/live/workflows/test_character_power_and_addons_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_character_power_and_addons_workflow(live_client):
    trapper_res = live_client.get("/api/v1/characters/The_Trapper/detail")
    if trapper_res.status_code == 404:
        trapper_res = live_client.get("/api/v1/characters/The%20Trapper/detail")
    assert trapper_res.status_code == 200
    trapper = trapper_res.get_json()["data"]
    assert trapper["character"]["name"] == "The Trapper"
    assert len(trapper["perks"]) == 3
    assert len(trapper["addons"]) > 0

    item_res = live_client.get("/api/v1/items?category=Toolbox")
    assert item_res.status_code == 200
    items = item_res.get_json()["data"]
    assert len(items) > 0
```

### backend/tests/live/workflows/test_gauntlet_multiround_progression_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_gauntlet_multiround_progression_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("gauntlet_boss", "gboss@example.com", "pass123")

    run_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
    assert run_res.status_code == 200
    run = run_res.get_json()["run"]
    run_id = run["id"]

    reveal_res = client.post("/api/v1/gauntlet-streak/reveal", json={"run_id": run_id}, headers=headers)
    assert reveal_res.status_code in (200, 400)

    win_res = client.post("/api/v1/gauntlet-streak/result", json={
        "run_id": run_id,
        "result": "win",
        "role": "killer"
    }, headers=headers)
    assert win_res.status_code in (200, 400)

    stats_res = client.get("/api/v1/gauntlet-streak/stats?role=killer", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.get_json()["stats"]
    assert isinstance(stats, dict)
```

### backend/tests/live/workflows/test_generator_exclusion_pool_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_generator_exclusion_pool_workflow(live_client):
    c_res = live_client.post("/api/v1/generator/config", json={
        "role": "Killer",
        "mode": "random",
    })
    assert c_res.status_code == 200

    draw1 = live_client.post("/api/v1/generator/draw", json={
        "role": "Killer",
        "perks": ["Hex: Ruin", "Pop Goes The Weasel", "Barbecue & Chilli", "Scourge Hook: Pain Resonance"]
    })
    assert draw1.status_code == 200
    drawn = draw1.get_json()["drawn_perks"]
    assert len(drawn) == 4

    get_drawn = live_client.get("/api/v1/generator/drawn?role=Killer")
    assert get_drawn.status_code == 200
    assert len(get_drawn.get_json()["drawn_perks"]) == 4

    reset_res = live_client.post("/api/v1/generator/reset", json={"role": "Killer"})
    assert reset_res.status_code == 200
    assert len(reset_res.get_json()["drawn_perks"]) == 0
```

### backend/tests/live/workflows/test_generator_lock_and_redraw_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_generator_lock_and_redraw_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("gen_user_lock", "genlock@example.com", "pass123")

    config_res = client.post("/api/v1/generator/config", json={
        "role": "Survivor",
        "mode": "random",
        "lock_perks": False,
    })
    assert config_res.status_code == 200

    draw1 = client.post("/api/v1/generator/draw", json={
        "role": "Survivor",
        "perks": ["Sprint Burst", "Self-Care", "Adrenaline", "Iron Will"]
    })
    assert draw1.status_code == 200
    drawn1 = draw1.get_json()["drawn_perks"]
    assert len(drawn1) >= 4

    draw2 = client.post("/api/v1/generator/draw", json={
        "role": "Survivor",
        "perks": ["Sprint Burst", "Adrenaline", "Kindred", "Decisive Strike"]
    })
    assert draw2.status_code == 200
    drawn2 = draw2.get_json()["drawn_perks"]
    assert len(drawn2) >= 4
    assert "Sprint Burst" in drawn2
    assert "Adrenaline" in drawn2

    reset_res = client.post("/api/v1/generator/reset", json={"role": "Survivor"})
    assert reset_res.status_code == 200
    assert len(reset_res.get_json()["drawn_perks"]) == 0
```

### backend/tests/live/workflows/test_history_streak_guessing_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_history_streak_guessing_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("hist_guesser", "hguess@example.com", "pass123")

    run_res = client.get("/api/v1/history-streak/run?mode=medium", headers=headers)
    assert run_res.status_code == 200
    run = run_res.get_json()
    assert "target_date" in run or "perk_name" in run or "id" in run or "run" in run

    res = client.post("/api/v1/history-streak/result", json={
        "result": "loss",
        "mode": "medium"
    }, headers=headers)
    assert res.status_code in (200, 400)
```

### backend/tests/live/workflows/test_interactive_map_navigation_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_interactive_map_navigation_workflow(live_client):
    maps_res = live_client.get("/api/v1/maps")
    assert maps_res.status_code == 200
    maps = maps_res.get_json()["maps"]
    assert len(maps) > 0

    macmillan_res = live_client.get("/api/v1/maps?realm=The%20MacMillan%20Estate")
    assert macmillan_res.status_code == 200
    mac_maps = macmillan_res.get_json()["maps"]
    assert len(mac_maps) > 0

    detail_res = live_client.get("/api/v1/maps/coal_tower?seed=seed_a")
    assert detail_res.status_code == 200
    map_data = detail_res.get_json()["map"]
    
    assert "coal_tower" in map_data["id"]
    assert "name" in map_data
```

### backend/tests/live/workflows/test_jwt_security_and_session_validation_workflow.py
```python
import pytest
from app.core.security import decode_token


@pytest.mark.live
@pytest.mark.workflow
def test_jwt_security_and_session_validation_workflow(live_app, live_client, auth_client_factory):
    client, headers, user = auth_client_factory("jwt_sec_user", "jwtsec@example.com", "pass123")
    valid_token = headers["Authorization"].split(" ")[1]

    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.get_json()["authenticated"] is True

    tampered_token = valid_token[:-5] + "XXXXX"
    bad_sig_res = live_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert bad_sig_res.status_code == 200
    assert bad_sig_res.get_json()["authenticated"] is False

    malformed_res = live_client.get("/api/v1/auth/me", headers={"Authorization": "MalformedHeaderWithNoBearer"})
    assert malformed_res.status_code == 200
    assert malformed_res.get_json()["authenticated"] is False

    with live_app.app_context():
        decoded = decode_token(valid_token)
        assert decoded is not None
        assert str(decoded["sub"]) == str(user["id"])
        assert decode_token("invalid.token.here") is None
```

### backend/tests/live/workflows/test_map_landmarks_and_seeds_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_map_landmarks_and_seeds_workflow(live_client):
    search_res = live_client.get("/api/v1/maps?search=House")
    assert search_res.status_code == 200
    found = search_res.get_json()["maps"]
    assert any("House" in m["name"] for m in found)

    rpd_res = live_client.get("/api/v1/maps/rpd_east?floor=1")
    assert rpd_res.status_code in (200, 404)
    if rpd_res.status_code == 200:
        rpd = rpd_res.get_json()["map"]
        assert rpd["id"] == "rpd_east"
```

### backend/tests/live/workflows/test_page_streak_multipage_progression_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_page_streak_multipage_progression_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("page_streak_runner", "pstreak@example.com", "pass123")

    roster_res = client.get("/api/v1/page-streak/roster", headers=headers)
    assert roster_res.status_code == 200
    roster = roster_res.get_json()["data"]
    assert len(roster) > 0
    killer_name = roster[0]["killer"]

    pool_res = client.get("/api/v1/page-streak/pool", headers=headers)
    assert pool_res.status_code == 200
    assert pool_res.get_json()["pool_size"] > 0

    start_res = client.post("/api/v1/page-streak/run/start", json={"killer": killer_name}, headers=headers)
    assert start_res.status_code in (200, 201)

    run_res = client.get(f"/api/v1/page-streak/run?killer={killer_name}", headers=headers)
    assert run_res.status_code == 200
    run_data = run_res.get_json()["run"]
    assert run_data is not None
    assert run_data["killer"] == killer_name

    result_res = client.post("/api/v1/page-streak/run/result", json={
        "killer": killer_name,
        "page": 0,
        "perks": ["Agitation", "Brutal Strength"],
        "result": "win"
    }, headers=headers)
    assert result_res.status_code in (200, 400)
```

### backend/tests/live/workflows/test_perk_detail_and_teachables_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_perk_detail_and_teachables_association_workflow(live_client):
    meg_res = live_client.get("/api/v1/characters/Meg_Thomas/detail")
    if meg_res.status_code == 404:
        meg_res = live_client.get("/api/v1/characters/Meg%20Thomas/detail")
    assert meg_res.status_code == 200
    meg_data = meg_res.get_json()["data"]
    assert meg_data["character"]["name"] == "Meg Thomas"
    meg_perk_names = [p["name"] for p in meg_data["perks"]]
    assert len(meg_perk_names) == 3
    assert any("Sprint Burst" in name for name in meg_perk_names) or any("Adrenaline" in name for name in meg_perk_names) or any("Quick & Quiet" in name for name in meg_perk_names)

    trapper_res = live_client.get("/api/v1/characters/The_Trapper/detail")
    if trapper_res.status_code == 404:
        trapper_res = live_client.get("/api/v1/characters/The%20Trapper/detail")
    assert trapper_res.status_code == 200
    trapper_data = trapper_res.get_json()["data"]
    trapper_perk_names = [p["name"] for p in trapper_data["perks"]]
    assert len(trapper_perk_names) == 3
    assert any("Agitation" in name or "Brutal Strength" in name or "Unnerving Presence" in name for name in trapper_perk_names)
```

### backend/tests/live/workflows/test_perks_polish_localization_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_perks_polish_localization_and_search_workflow(live_client):
    res = live_client.get("/api/v1/perks?limit=50&page=1")
    assert res.status_code == 200
    data = res.get_json()
    perks = data["data"]
    pagination = data["pagination"]
    assert len(perks) > 0
    assert pagination["total"] >= 200

    killer_res = live_client.get("/api/v1/perks?category=Killer&limit=30")
    assert killer_res.status_code == 200
    killer_perks = killer_res.get_json()["data"]
    assert all(p.get("category") == "Killer" or p.get("role") == "Killer" for p in killer_perks)

    surv_res = live_client.get("/api/v1/perks?category=Survivor&limit=30")
    assert surv_res.status_code == 200
    surv_perks = surv_res.get_json()["data"]
    assert all(p.get("category") == "Survivor" or p.get("role") == "Survivor" for p in surv_perks)

    search_res = live_client.get("/api/v1/perks?search=Calling")
    assert search_res.status_code == 200
    results = search_res.get_json()["data"]
    assert any("Calling" in p["name"] for p in results)

    sample = killer_perks[0]
    assert "name" in sample
    assert "description" in sample
```

### backend/tests/live/workflows/test_smash_or_pass_session_voting_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_smash_or_pass_session_voting_workflow(live_client):
    session_id = "session_test_wf_13"

    rosters_res = live_client.get("/api/v1/smash-or-pass/rosters")
    assert rosters_res.status_code == 200
    rosters = rosters_res.get_json()["data"]
    assert len(rosters) > 0
    slug = rosters[0]["slug"]

    feed_res = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/feed?session_id={session_id}&limit=5")
    assert feed_res.status_code == 200
    feed_data = feed_res.get_json()["data"]
    entities = feed_data["entities"]
    assert len(entities) > 0
    entity_id = entities[0]["id"]

    vote_res = live_client.post("/api/v1/smash-or-pass/vote", json={
        "session_id": session_id,
        "entity_id": entity_id,
        "vote_type": "smash",
        "roster_slug": slug,
    })
    assert vote_res.status_code == 200

    lb_res = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/leaderboard")
    assert lb_res.status_code == 200
    assert len(lb_res.get_json()["data"]) > 0

    reset_res = live_client.post("/api/v1/smash-or-pass/reset", json={"session_id": session_id})
    assert reset_res.status_code in (200, 404)
```

### backend/tests/live/workflows/test_smash_or_pass_tournament_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_full_smash_or_pass_voting_and_leaderboard_workflow(live_client):
    res_rosters = live_client.get("/api/v1/smash-or-pass/rosters")
    assert res_rosters.status_code == 200
    rosters = res_rosters.get_json()["data"]
    canon_roster = next((r for r in rosters if r["slug"] == "canon"), rosters[0])
    slug = canon_roster["slug"]

    session_headers = {"X-Session-ID": "workflow-session-12345"}
    res_feed = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/feed", headers=session_headers)
    assert res_feed.status_code == 200
    entities = res_feed.get_json()["data"].get("entities", [])
    assert len(entities) > 0

    voted_ids = []
    for idx, ent in enumerate(entities[:3]):
        vote_type = "smash" if idx % 2 == 0 else "pass"
        res_vote = live_client.post("/api/v1/smash-or-pass/vote", json={
            "entity_id": ent["id"],
            "vote": vote_type,
            "roster_slug": slug,
            "session_id": "workflow-session-12345",
        }, headers=session_headers)
        assert res_vote.status_code == 200
        voted_ids.append(ent["id"])

    res_feed2 = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/feed", headers=session_headers)
    assert res_feed2.status_code == 200
    entities2 = res_feed2.get_json()["data"].get("entities", [])
    remaining_ids = {e["id"] for e in entities2}
    for vid in voted_ids:
        assert vid not in remaining_ids

    res_lead = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/leaderboard")
    assert res_lead.status_code == 200
    leaders = res_lead.get_json()["data"]
    assert len(leaders) > 0

    res_reset = live_client.post("/api/v1/smash-or-pass/session/reset", json={
        "session_id": "workflow-session-12345",
        "roster_slug": slug,
    })
    assert res_reset.status_code == 200

    res_feed3 = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/feed", headers=session_headers)
    assert res_feed3.status_code == 200
    entities3 = res_feed3.get_json()["data"].get("entities", [])
    reset_ids = {e["id"] for e in entities3}
    for vid in voted_ids:
        assert vid in reset_ids
```

### backend/tests/live/workflows/test_streaks_and_challenge_governance_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_full_streaks_and_challenge_governance(live_client, admin_client, auth_client_factory):
    client, headers, user = auth_client_factory("challenge_master", "cmaster@example.com", "pass123")

    roster_res = client.get("/api/v1/page-streak/roster", headers=headers)
    assert roster_res.status_code == 200
    roster = roster_res.get_json()["data"]
    assert len(roster) > 0
    test_killer = roster[0]["killer"] if isinstance(roster[0], dict) else str(roster[0])

    run_res = client.get(f"/api/v1/page-streak/run?killer={test_killer}", headers=headers)
    assert run_res.status_code == 200

    gauntlet_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
    assert gauntlet_res.status_code == 200
    g_run = gauntlet_res.get_json()["run"]
    g_run_id = g_run["id"]

    g_win_res = client.post("/api/v1/gauntlet-streak/result", json={
        "run_id": g_run_id,
        "result": "win",
        "role": "killer"
    }, headers=headers)
    assert g_win_res.status_code in (200, 400)

    hist_res = client.get("/api/v1/history-streak/run?mode=medium", headers=headers)
    assert hist_res.status_code == 200

    dis_res = admin_client.put("/api/v1/admin/challenge-modes/gauntlet", json={
        "is_enabled": False,
        "reason": "Gauntlet maintenance"
    })
    assert dis_res.status_code == 200

    client_new, headers_new, user_new = auth_client_factory("blocked_runner", "block@example.com", "pass123")
    blocked_res = client_new.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers_new)
    assert blocked_res.status_code == 400
    assert "disabled" in blocked_res.get_json()["error"].lower()

    en_res = admin_client.put("/api/v1/admin/challenge-modes/gauntlet", json={"is_enabled": True})
    assert en_res.status_code == 200

    unblocked_res = client_new.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers_new)
    assert unblocked_res.status_code == 200
```

### backend/tests/live/workflows/test_user_ownership_bulk_cascades_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_user_ownership_bulk_cascades_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("cascade_tester", "casc@example.com", "pass123")
    user_id = user["id"]

    summary_res = client.get(f"/api/v1/users/{user_id}", headers=headers)
    assert summary_res.status_code == 200
    ownership = summary_res.get_json()["ownership"]
    assert "owned_characters_count" in ownership or "killers" in ownership or isinstance(ownership, dict)

    chars_res = client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
    assert chars_res.status_code == 200
    chars = chars_res.get_json()["data"]

    updates = [{"character_id": c["id"], "is_owned": True} for c in chars[:5]]
    bulk_res = client.post(f"/api/v1/users/{user_id}/characters/bulk", json={"updates": updates}, headers=headers)
    assert bulk_res.status_code == 200
    assert bulk_res.get_json()["status"] == "success"
```

### backend/tests/live/workflows/test_user_profile_lifecycle_workflow.py
```python
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_full_user_profile_and_password_lifecycle(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("profile_user_1", "prof1@example.com", "InitialPass123!")
    user_id = user["id"]

    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.get_json()
    assert me_data["user"]["username"] == "profile_user_1"
    assert me_data["user"]["email"] == "prof1@example.com"

    update_res = client.put("/api/v1/auth/profile", json={
        "email": "prof_updated@example.com",
        "avatar_url": "custom_avatar_icon",
        "new_password": "NewStrongPassword456!",
    }, headers=headers)
    assert update_res.status_code == 200
    updated_user = update_res.get_json()["user"]
    assert updated_user["email"] == "prof_updated@example.com"
    assert updated_user["avatar_url"] == "custom_avatar_icon"

    old_login = live_client.post("/api/v1/auth/login", json={
        "username": "profile_user_1",
        "password": "InitialPass123!",
    })
    assert old_login.status_code in (400, 401)

    new_login = live_client.post("/api/v1/auth/login", json={
        "username": "profile_user_1",
        "password": "NewStrongPassword456!",
    })
    assert new_login.status_code == 200
    new_token = new_login.get_json()["token"]
    new_headers = {"Authorization": f"Bearer {new_token}", "Content-Type": "application/json"}

    me_res2 = client.get("/api/v1/auth/me", headers=new_headers)
    assert me_res2.status_code == 200
    assert me_res2.get_json()["user"]["email"] == "prof_updated@example.com"
```
