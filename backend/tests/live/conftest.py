# backend/tests/live/conftest.py
import logging
import os
import subprocess
from typing import Any, Callable, Generator
import pytest
from flask import Flask
from flask.testing import FlaskClient
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


def _setup_test_database_clone() -> None:
    """Create dbd_db_test_live as a pristine copy of dbd_db."""
    cmd = [
        "docker",
        "exec",
        "dbd_db",
        "sh",
        "-c",
        f"psql -U {POSTGRES_USER} -d postgres -c 'DROP DATABASE IF EXISTS {TEST_DB_NAME} WITH (FORCE);' && "
        f"pg_dump -U {POSTGRES_USER} -F c -b {SRC_DB_NAME} -f /tmp/{TEST_DB_NAME}.dump && "
        f"createdb -U {POSTGRES_USER} {TEST_DB_NAME} && "
        f"(pg_restore -U {POSTGRES_USER} --no-owner --no-privileges -d {TEST_DB_NAME} /tmp/{TEST_DB_NAME}.dump || true) && "
        f"rm -f /tmp/{TEST_DB_NAME}.dump",
    ]
    result = subprocess.run(
        cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=30
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Failed to clone live test database: {result.stderr or result.stdout}"
        )


def _teardown_test_database_clone() -> None:
    """Drop dbd_db_test_live completely, leaving zero test residue."""
    cmd = [
        "docker",
        "exec",
        "dbd_db",
        "psql",
        "-U",
        POSTGRES_USER,
        "-d",
        "postgres",
        "-c",
        f"DROP DATABASE IF EXISTS {TEST_DB_NAME} WITH (FORCE);",
    ]
    subprocess.run(cmd, capture_output=True, stdin=subprocess.DEVNULL, timeout=15)


@pytest.fixture(scope="session")
def live_database_url() -> Generator[str, None, None]:
    """Provision a cloned PostgreSQL test database for the entire live test session."""
    _setup_test_database_clone()
    yield LIVE_TEST_DB_URL
    _teardown_test_database_clone()


@pytest.fixture(scope="session")
def live_app(live_database_url: str) -> Flask:
    """Create and configure the live Flask application connected to PostgreSQL clone."""
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
def live_client(live_app: Flask) -> FlaskClient:
    """Provide a Flask test client for the live PostgreSQL test suite."""
    return live_app.test_client()


@pytest.fixture(scope="session")
def live_admin_token(live_app: Flask) -> str:
    """Ensure a verified admin account exists in PostgreSQL and return its JWT."""
    from app.core.extensions import db
    from app.models import User
    from app.services.user_service import UserService

    with live_app.app_context():
        user_service = UserService()
        admin_user = db.session.scalars(
            select(User).where(User.username == "admin_live_tester")
        ).first()
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


class AuthenticatedClient:
    """Helper wrapper for authorized API calls with automatic Bearer token injection."""

    def __init__(self, client: FlaskClient, token: str) -> None:
        self.client = client
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def get(self, url: str, **kwargs: Any) -> Any:
        headers = {**self.headers, **kwargs.pop("headers", {})}
        return self.client.get(url, headers=headers, **kwargs)

    def post(self, url: str, **kwargs: Any) -> Any:
        headers = {**self.headers, **kwargs.pop("headers", {})}
        return self.client.post(url, headers=headers, **kwargs)

    def put(self, url: str, **kwargs: Any) -> Any:
        headers = {**self.headers, **kwargs.pop("headers", {})}
        return self.client.put(url, headers=headers, **kwargs)

    def delete(self, url: str, **kwargs: Any) -> Any:
        headers = {**self.headers, **kwargs.pop("headers", {})}
        return self.client.delete(url, headers=headers, **kwargs)

    def patch(self, url: str, **kwargs: Any) -> Any:
        headers = {**self.headers, **kwargs.pop("headers", {})}
        return self.client.patch(url, headers=headers, **kwargs)


@pytest.fixture
def admin_client(live_client: FlaskClient, live_admin_token: str) -> AuthenticatedClient:
    """Provide an authenticated admin client for live administrative endpoints."""
    return AuthenticatedClient(live_client, live_admin_token)


@pytest.fixture
def auth_client_factory(
    live_app: Flask, live_client: FlaskClient
) -> Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]]:
    """Factory fixture to register verified test users on the fly in PostgreSQL."""
    from app.core.extensions import db
    from app.models import User
    from app.services.user_service import UserService

    def _create_user_and_client(
        username: str = "testuser",
        email: str | None = None,
        password: str = "password123",
        role: str = "user",
    ) -> tuple[FlaskClient, dict[str, str], dict[str, Any]]:
        email = email or f"{username}@example.com"
        with live_app.app_context():
            user_service = UserService()
            user = db.session.scalars(select(User).where(User.username == username)).first()
            if not user:
                user, _ = user_service.register_user(
                    username=username, email=email, password=password, role=role
                )
                user.is_verified = True
                db.session.commit()
            token = user_service.generate_auth_token(user)

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        return live_client, headers, {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "token": token,
        }

    return _create_user_and_client
