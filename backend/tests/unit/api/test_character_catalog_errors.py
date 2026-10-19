# backend/tests/unit/api/test_character_catalog_errors.py
"""A database error on the character catalog is a 5xx, never a cached empty list."""
import pytest
from flask import Flask
from flask.testing import FlaskClient

import app.services.perks.queries_character as queries
from app.core.extensions import db
from tests.unit.conftest import make_survivor


@pytest.fixture
def no_propagation(app: Flask):
    previous = app.config.get("PROPAGATE_EXCEPTIONS")
    app.config["PROPAGATE_EXCEPTIONS"] = False
    yield
    app.config["PROPAGATE_EXCEPTIONS"] = previous


@pytest.mark.unit
def test_db_error_is_a_5xx_and_is_not_cached(client: FlaskClient, db_session, monkeypatch, no_propagation) -> None:
    make_survivor(db_session, "Meg Thomas", id=2)
    db.session.commit()

    def boom(_stmt):
        raise RuntimeError("database went away")

    monkeypatch.setattr(queries, "_run_characters_query", boom)
    assert client.get("/api/v1/characters?lang=en").status_code >= 500

    monkeypatch.undo()
    rows = client.get("/api/v1/characters?lang=en").get_json()["data"]
    assert [r["name"] for r in rows] == ["Meg Thomas"]


@pytest.mark.unit
def test_detail_db_error_is_not_reported_as_not_found(client: FlaskClient, db_session, monkeypatch, no_propagation) -> None:
    def boom(*_args, **_kwargs):
        raise RuntimeError("database went away")

    monkeypatch.setattr(queries.db.session, "scalars", boom)
    assert client.get("/api/v1/characters/meg_thomas/detail").status_code >= 500
