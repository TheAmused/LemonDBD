# backend/tests/unit/smash_api_support.py
"""Shared fixtures and helpers for the Smash or Pass API test modules."""
from typing import Generator

import pytest
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.routes.smash_or_pass import vote_rate_limiter
from app.seeds.smash_roster_seeder import seed_smash_rosters


@pytest.fixture(autouse=True)
def setup_smash_data(db_session: Session) -> Generator[None, None, None]:
    seed_smash_rosters()
    vote_rate_limiter.reset()
    yield
    vote_rate_limiter.reset()


def create_user(
    db_session: Session,
    username: str = "testuser",
    email: str = "test@example.com",
    role: str = "user",
) -> User:
    user = User(
        username=username,
        email=email,
        password_hash=hash_password("password123"),
        role=role,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user
