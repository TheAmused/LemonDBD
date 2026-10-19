# backend/tests/unit/test_smash_vote_privacy.py
"""Who may read, reset and overwrite smash-or-pass votes.

Regression tests for the 2026-10-19 review: an anonymous `?user_id=` read
another account's votes (with its session id), the guest session reset wiped
signed-in votes, and a signed-in user's reset only reached the votes cast
under this browser's session.
"""
import pytest
from flask import Flask
from sqlalchemy.orm import Session

from app.core.security import generate_token
from app.routes.smash_or_pass import vote_rate_limiter
from tests.unit.smash_api_support import create_user as _create_user, setup_smash_data  # noqa: F401 (autouse fixture)


def _auth(user) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user.id, role='user')}"}


@pytest.fixture(autouse=True)
def _fresh_limiter():
    vote_rate_limiter.reset()
    yield
    vote_rate_limiter.reset()


@pytest.mark.unit
class TestSmashVotePrivacy:
    def test_anonymous_cannot_read_another_accounts_votes(self, app: Flask, db_session: Session) -> None:
        client = app.test_client()
        victim = _create_user(db_session, username="victim", email="victim@example.com")
        client.post(
            "/api/v1/smash-or-pass/vote",
            headers={**_auth(victim), "X-Session-ID": "victim-device"},
            json={"character_slug": "ada_wong", "vote_type": "smash", "roster_slug": "canon"},
        )

        res = client.get(f"/api/v1/smash-or-pass/user-votes?user_id={victim.id}&edition=canon")
        assert res.status_code == 401

        feed = client.get(f"/api/v1/smash-or-pass/rosters/canon/feed?user_id={victim.id}")
        assert feed.status_code == 401

    def test_other_user_gets_403_and_admin_may_look(self, app: Flask, db_session: Session) -> None:
        client = app.test_client()
        victim = _create_user(db_session, username="victim2", email="victim2@example.com")
        other = _create_user(db_session, username="other2", email="other2@example.com")
        client.post(
            "/api/v1/smash-or-pass/vote",
            headers=_auth(victim),
            json={"character_slug": "ada_wong", "vote_type": "smash", "roster_slug": "canon"},
        )
        res = client.get(
            f"/api/v1/smash-or-pass/user-votes?user_id={victim.id}&edition=canon", headers=_auth(other)
        )
        assert res.status_code == 403

        admin = _create_user(db_session, username="admin2", email="admin2@example.com")
        admin.role = "admin"
        db_session.commit()
        admin_headers = {"Authorization": f"Bearer {generate_token(admin.id, role='admin')}"}
        res_admin = client.get(
            f"/api/v1/smash-or-pass/user-votes?user_id={victim.id}&edition=canon", headers=admin_headers
        )
        assert res_admin.status_code == 200
        assert res_admin.get_json()["count"] == 1

    def test_vote_payloads_never_carry_the_session_id(self, app: Flask, db_session: Session) -> None:
        client = app.test_client()
        client.post(
            "/api/v1/smash-or-pass/vote",
            json={"character_slug": "ada_wong", "vote_type": "smash", "session_id": "guest-secret"},
        )
        res = client.get("/api/v1/smash-or-pass/user-votes?edition=canon&session_id=guest-secret")
        assert res.status_code == 200
        body = res.get_json()
        assert body["count"] == 1
        assert "guest-secret" not in res.get_data(as_text=True)
        assert all("session_id" not in v for v in body["data"])

    def test_signed_in_vote_is_not_tied_to_the_browser_session(self, app: Flask, db_session: Session) -> None:
        """The next person on a shared browser (same guest session id) neither
        sees nor resets the signed-in owner's votes."""
        client = app.test_client()
        owner = _create_user(db_session, username="owner", email="owner@example.com")
        client.post(
            "/api/v1/smash-or-pass/vote",
            headers={**_auth(owner), "X-Session-ID": "shared-browser"},
            json={"character_slug": "ada_wong", "vote_type": "smash", "session_id": "shared-browser"},
        )

        guest_votes = client.get("/api/v1/smash-or-pass/user-votes?edition=canon&session_id=shared-browser")
        assert guest_votes.get_json()["count"] == 0

        reset = client.post("/api/v1/smash-or-pass/session/reset", json={"session_id": "shared-browser"})
        assert reset.get_json()["data"]["reset_count"] == 0

        mine = client.get("/api/v1/smash-or-pass/user-votes?edition=canon", headers=_auth(owner))
        assert mine.get_json()["count"] == 1

    def test_signed_in_user_cannot_take_over_a_guest_session(self, app: Flask, db_session: Session) -> None:
        client = app.test_client()
        client.post(
            "/api/v1/smash-or-pass/vote",
            json={"character_slug": "ada_wong", "vote_type": "smash", "session_id": "someone-else"},
        )
        attacker = _create_user(db_session, username="attacker", email="attacker@example.com")
        client.post(
            "/api/v1/smash-or-pass/vote",
            headers=_auth(attacker),
            json={"character_slug": "ada_wong", "vote_type": "pass", "session_id": "someone-else"},
        )
        guest = client.get("/api/v1/smash-or-pass/user-votes?edition=canon&session_id=someone-else")
        assert [v["vote_type"] for v in guest.get_json()["data"]] == ["smash"]

    def test_user_reset_clears_votes_from_every_device(self, app: Flask, db_session: Session) -> None:
        client = app.test_client()
        user = _create_user(db_session, username="multi", email="multi@example.com")
        for slug, device in (("ada_wong", "laptop"), ("meg_thomas", "phone")):
            client.post(
                "/api/v1/smash-or-pass/vote",
                headers={**_auth(user), "X-Session-ID": device},
                json={"character_slug": slug, "vote_type": "smash", "roster_slug": "canon"},
            )

        reset = client.post(
            "/api/v1/smash-or-pass/user-votes/reset",
            headers={**_auth(user), "X-Session-ID": "laptop"},
            json={"roster_slug": "canon"},
        )
        assert reset.get_json()["data"]["reset_count"] == 2
        after = client.get("/api/v1/smash-or-pass/user-votes?edition=canon", headers=_auth(user))
        assert after.get_json()["count"] == 0
