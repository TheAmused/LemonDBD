# backend/tests/unit/content/test_content_identity_ranking.py
"""Ranking a tier list is using it, not making new content; saving an edit from the editor is.

A ban and an author stamp name the list itself (title, items, tiers...), not one ranking of it, so a
copy someone has re-ranked is still the banned list and still carries a valid stamp. A copy whose
content was edited is new content: the ban does not reach it and the old stamp no longer fits.
Stamps and bans made before the ranking was left out (whole-document hashes) keep matching.
"""
import pytest
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

from app.core.security import generate_token
from app.models.content_moderation import ContentRevocation
from app.models.user import User
from app.services.content_crypto import canonicalize_payload, compute_content_hash
from app.services.content_moderation_service import content_identity

CHECK = "/api/v1/content/revocations/check-document"
LIST = {
    "format": "lemondbd-tier-list",
    "version": 1,
    "title": "Chase partners",
    "template": None,
    "tiers": [{"id": "s", "label": "S", "color": "s"}, {"id": "a", "label": "A", "color": "a"}],
    "items": [{"id": "dwight", "name": "Dwight"}, {"id": "meg", "name": "Meg"}],
    "placements": {"s": ["dwight"], "a": ["meg"]},
}
RERANKED = {**LIST, "placements": {"s": ["meg"], "a": ["dwight"]}}
EDITED = {**LIST, "title": "Chase partners, reworked"}


@pytest.fixture
def author(db_session: Session) -> User:
    user = User(login="rank_author", username="Rank", email="rank@example.com", password_hash="x", role="user")
    db_session.add(user)
    db_session.commit()
    return user


def _sign(client: FlaskClient, user: User, payload: dict) -> dict:
    res = client.post(
        "/api/v1/content/sign",
        headers={"Authorization": f"Bearer {generate_token(user.id, user.role)}"},
        json={"content_type": "tier_list", "payload": payload},
    )
    assert res.status_code == 200
    return res.get_json()


def _full_hash(payload: dict) -> str:
    return compute_content_hash(canonicalize_payload(payload))


def _ban(db_session: Session, content_hash: str) -> None:
    db_session.add(ContentRevocation(content_hash=content_hash, content_type="tier_list", reason="spam"))
    db_session.commit()


def _check(client: FlaskClient, payload: dict, manifest: dict | None = None) -> dict:
    return client.post(CHECK, json={"payload": payload, "manifest": manifest}).get_json()


def test_identity_leaves_out_the_ranking_only() -> None:
    assert "placements" not in content_identity(LIST)
    assert content_identity(LIST) == content_identity(RERANKED)
    assert content_identity(LIST) != content_identity(EDITED)
    other = {"title": "Trial", "rounds": [], "placements": {"x": 1}}
    assert content_identity(other) is other, "only tier lists have a ranking to leave out"


def test_reranking_keeps_the_stamp_valid(client: FlaskClient, author: User) -> None:
    manifest = _sign(client, author, LIST)
    assert _check(client, RERANKED, manifest)["signed"] is True


def test_editing_the_content_invalidates_the_stamp(client: FlaskClient, author: User) -> None:
    manifest = _sign(client, author, LIST)
    assert _check(client, EDITED, manifest)["signed"] is False


def test_a_ban_reaches_every_ranking_of_the_list(client: FlaskClient, db_session: Session) -> None:
    _ban(db_session, _check(client, LIST)["content_hash"])
    assert _check(client, RERANKED)["revoked"] is True
    assert _check(client, {**LIST, "placements": {}})["revoked"] is True


def test_a_ban_does_not_reach_an_edited_list(client: FlaskClient, db_session: Session) -> None:
    _ban(db_session, _check(client, LIST)["content_hash"])
    assert _check(client, EDITED)["revoked"] is False


def test_bans_and_stamps_from_before_keep_matching(client: FlaskClient, author: User, db_session: Session) -> None:
    from app.services.content_crypto import sign_content

    _ban(db_session, _full_hash(LIST))
    assert _check(client, LIST)["revoked"] is True

    secret = client.application.config["SECRET_KEY"]
    old_stamp = {
        "content_type": "tier_list",
        "content_hash": _full_hash(LIST),
        "author_id": author.id,
        "author_login": author.login,
        "signature": sign_content(author.id, _full_hash(LIST), secret),
        "created_at": "2026-10-01T00:00:00+00:00",
    }
    assert _check(client, LIST, old_stamp)["signed"] is True


def test_a_report_of_a_reranked_copy_is_attributed_and_filed_under_the_list(
    client: FlaskClient, author: User, db_session: Session
) -> None:
    manifest = _sign(client, author, LIST)
    reporter = User(login="rank_reporter", username="Rep", email="rep@example.com", password_hash="x", role="user")
    db_session.add(reporter)
    db_session.commit()
    res = client.post(
        "/api/v1/content/reports",
        headers={"Authorization": f"Bearer {generate_token(reporter.id, reporter.role)}"},
        json={
            "content_type": "tier_list",
            "payload": RERANKED,
            "reason": "spam",
            "content_hash": manifest["content_hash"],
            "author_id": manifest["author_id"],
            "author_login": manifest["author_login"],
            "signature": manifest["signature"],
        },
    )
    assert res.status_code == 201, res.get_json()
    body = res.get_json()
    assert body["attributed"] is True
    assert body["content_hash"] == manifest["content_hash"] == _check(client, LIST)["content_hash"]
