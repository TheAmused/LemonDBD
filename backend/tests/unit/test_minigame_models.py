# backend/tests/unit/test_minigame_models.py
from datetime import date, datetime, timezone
import pytest
from app.core.extensions import db
from app.models.minigame import (
    MinigameDailyChallenge,
    MinigameRepeatableChallenge,
    MinigameUserStat,
)

def test_create_minigame_daily_challenge(app, test_db):
    challenge = MinigameDailyChallenge(
        challenge_date=date(2026, 9, 29),
        game_mode="fog_trial",
        title="The Fog Infiltration Trial",
        description="4-stage realm, audio, and killer trial.",
        rounds=[
            {
                "round_number": 1,
                "mode": "realm_guesser",
                "target_type": "realm",
                "target_id": 1,
                "max_attempts": 6,
                "config": {"starting_zoom": 400}
            }
        ],
        is_active=True,
    )
    db.session.add(challenge)
    db.session.commit()

    retrieved = db.session.query(MinigameDailyChallenge).filter_by(
        challenge_date=date(2026, 9, 29), game_mode="fog_trial"
    ).first()
    assert retrieved is not None
    assert retrieved.title == "The Fog Infiltration Trial"
    assert len(retrieved.rounds) == 1
    assert retrieved.rounds[0]["mode"] == "realm_guesser"

def test_minigame_repeatable_challenge(app, test_db):
    rep = MinigameRepeatableChallenge(
        session_id="sess_12345",
        game_mode="classic_character",
        title="Repeatable Classic",
        rounds=[{"round_number": 1, "mode": "classic_character", "target_id": 1}],
        expires_at=datetime.now(timezone.utc),
    )
    db.session.add(rep)
    db.session.commit()

    retrieved = db.session.query(MinigameRepeatableChallenge).filter_by(session_id="sess_12345").first()
    assert retrieved is not None
    assert retrieved.title == "Repeatable Classic"
