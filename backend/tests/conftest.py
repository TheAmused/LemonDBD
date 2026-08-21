# backend/tests/conftest.py
import os
import pytest

os.environ['TESTING'] = 'True'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db


@pytest.fixture(scope='session')
def app():
    app = create_app(TestingConfig)
    app.config['TESTING'] = True
    return app


@pytest.fixture(autouse=True)
def test_db(app):
    with app.app_context():
        db.create_all()
        yield db
        db.session.remove()
        db.drop_all()


@pytest.fixture
def db_session(test_db):
    return test_db.session

