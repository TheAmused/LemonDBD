# backend/tests/live/conftest.py
"""Live suite: the real app against a throwaway PostgreSQL copy of the seeded `dbd_db`.

Once per session the source database is copied to `dbd_db_test_live`, the tests run against the copy
through Flask's test client, and the copy is dropped at the end. Nothing a test writes reaches the
real database.

The copy is made one of two ways:
  1. `CREATE DATABASE ... TEMPLATE dbd_db` over a plain connection. Fast and exact, and needs no
     Docker, but Postgres only allows it while nobody else is connected to the source -- true in CI
     and with the backend stopped, not while the dev stack is up.
  2. Otherwise `pg_dump | pg_restore` inside the compose `db` service (`docker compose exec`, run
     from the repository root, so the container name does not matter).
Either way the copy is checked against the source (Alembic revision and character/perk row counts)
before any test runs, so a broken restore fails loudly here instead of as 60 confusing test failures.

Connection settings come from the environment, falling back to the repository's env file
(`ENV_FILE`, default `.env.dev`) -- the same file the stack itself reads.
"""
import logging
import os
import subprocess
from pathlib import Path
from typing import Any, Callable, Generator

import psycopg
import pytest
from dotenv import dotenv_values
from flask import Flask
from flask.testing import FlaskClient
from psycopg import sql
from sqlalchemy import select, text

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]


def _setting(name: str, default: str) -> str:
    """The process environment first, then the stack's env file, then the default."""
    if os.getenv(name):
        return os.environ[name]
    env_file = REPO_ROOT / os.getenv("ENV_FILE", ".env.dev")
    if env_file.is_file():
        value = dotenv_values(env_file).get(name)
        if value:
            return value
    return default


TEST_DB_NAME = "dbd_db_test_live"
SRC_DB_NAME = _setting("POSTGRES_DB", "dbd_db")
POSTGRES_USER = _setting("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = _setting("POSTGRES_PASSWORD", "postgres")
# The tests run on the host, so the compose service name (`db`) in the env file is not reachable:
# only an explicit environment value overrides the published localhost port.
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "127.0.0.1")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

LIVE_TEST_DB_URL = f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{TEST_DB_NAME}"

#: Tables whose row counts must match between the source and the copy.
VERIFIED_TABLES = ("survivors", "killers", "perks")


def _connect(dbname: str) -> psycopg.Connection:
    return psycopg.connect(
        host=POSTGRES_HOST, port=POSTGRES_PORT, user=POSTGRES_USER, password=POSTGRES_PASSWORD,
        dbname=dbname, autocommit=True, connect_timeout=10,
    )


def _drop_test_database() -> None:
    with _connect("postgres") as conn:
        conn.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(TEST_DB_NAME)))


def _clone_with_template() -> bool:
    """Copy by template. False when the source has other connections (the dev stack is running)."""
    try:
        with _connect("postgres") as conn:
            conn.execute(
                sql.SQL("CREATE DATABASE {} TEMPLATE {}").format(
                    sql.Identifier(TEST_DB_NAME), sql.Identifier(SRC_DB_NAME)
                )
            )
        return True
    except psycopg.errors.ObjectInUse:
        return False


def _clone_with_dump() -> str:
    """Copy with pg_dump/pg_restore inside the compose `db` service. Returns pg_restore's output."""
    dump = f"/tmp/{TEST_DB_NAME}.dump"
    script = (
        f"pg_dump -U {POSTGRES_USER} -F c -b {SRC_DB_NAME} -f {dump} && "
        f"createdb -U {POSTGRES_USER} {TEST_DB_NAME} && "
        f"pg_restore -U {POSTGRES_USER} --no-owner --no-privileges -d {TEST_DB_NAME} {dump}; "
        f"status=$?; rm -f {dump}; exit $status"
    )
    result = subprocess.run(
        ["docker", "compose", "exec", "-T", "db", "sh", "-c", script],
        cwd=REPO_ROOT, capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=180,
    )
    output = f"{result.stdout}\n{result.stderr}".strip()
    if result.returncode != 0:
        # pg_restore exits 1 on ignorable warnings too, so the exit code alone does not decide:
        # the verification below does. The output is kept so a real failure can show it.
        logger.warning("pg_restore reported problems (exit %s):\n%s", result.returncode, output)
    return output


def _snapshot(dbname: str) -> dict[str, Any]:
    with _connect(dbname) as conn:
        counts = {
            table: conn.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table))).fetchone()[0]
            for table in VERIFIED_TABLES
        }
        revision = conn.execute("SELECT version_num FROM alembic_version").fetchone()
    return {"alembic_revision": revision[0] if revision else None, **counts}


def _setup_test_database_clone() -> None:
    """Create dbd_db_test_live as a verified copy of dbd_db."""
    try:
        source = _snapshot(SRC_DB_NAME)
    except psycopg.OperationalError as exc:
        raise RuntimeError(
            f"Cannot reach PostgreSQL at {POSTGRES_HOST}:{POSTGRES_PORT} as {POSTGRES_USER}. "
            "Start the stack (./up.ps1) or point POSTGRES_HOST/POSTGRES_PORT/POSTGRES_PASSWORD at a "
            f"database that has been migrated and seeded.\n{exc}"
        ) from exc
    if source["survivors"] + source["killers"] == 0:
        raise RuntimeError(f"{SRC_DB_NAME} has no characters yet: wait for the first boot to finish seeding.")

    _drop_test_database()
    restore_output = ""
    if _clone_with_template():
        method = "template"
    else:
        method = "pg_dump/pg_restore"
        restore_output = _clone_with_dump()

    try:
        copy = _snapshot(TEST_DB_NAME)
    except psycopg.Error as exc:
        raise RuntimeError(
            f"The live test database could not be created ({method}): {exc}\n{restore_output}"
        ) from exc
    if copy != source:
        raise RuntimeError(
            f"The live test database ({method}) does not match {SRC_DB_NAME}: "
            f"source {source}, copy {copy}.\n{restore_output}"
        )
    logger.info("Live test database ready (%s): %s", method, copy)


def _teardown_test_database_clone() -> None:
    """Drop dbd_db_test_live completely, leaving zero test residue."""
    try:
        _drop_test_database()
    except psycopg.Error:
        logger.warning("Could not drop %s; the next run drops it first", TEST_DB_NAME, exc_info=True)


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

    from app import create_app
    from app.core.config import TestingConfig

    class LiveTestingConfig(TestingConfig):
        TESTING = True
        DEBUG = False
        SQLALCHEMY_DATABASE_URI = live_database_url
        SECRET_KEY = "live-test-secret-key-32-chars-length!!"
        JWT_SECRET_KEY = "live-test-secret-key-32-chars-length!!"
        ALTCHA_ENFORCED = False
        RATELIMIT_ENABLED = False

    app = create_app(LiveTestingConfig)
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = live_database_url
    return app


@pytest.fixture
def db_count(live_app: Flask) -> Callable[..., int]:
    """`db_count("SELECT count(*) FROM killers")`: a number straight from the live copy.

    The live tests compare what the API returns with the database it reads, so they can assert
    exact values ("every killer", "all six toolboxes") instead of "more than 30" -- and stay right
    when the seed grows.
    """
    from app.core.extensions import db

    def count(query: str, **params: Any) -> int:
        with live_app.app_context():
            return int(db.session.execute(text(query), params).scalar_one())

    return count


@pytest.fixture
def live_client(live_app: Flask) -> FlaskClient:
    """Provide a Flask test client for the live PostgreSQL test suite."""
    return live_app.test_client()


@pytest.fixture(scope="session")
def live_admin_token(live_app: Flask) -> str:
    """Ensure a verified admin account exists in PostgreSQL and return its JWT."""
    from app.core.extensions import db
    from app.models import User
    from app.services.user import UserService

    with live_app.app_context():
        user_service = UserService()
        admin_user = db.session.scalars(
            select(User).where(User.username == "admin_live_tester")
        ).first()
        if not admin_user:
            admin_user, _ = user_service.register_user(
                login="admin_live_tester", username="admin_live_tester",
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
    from app.services.user import UserService

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
                    login=username, username=username, email=email, password=password, role=role
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
