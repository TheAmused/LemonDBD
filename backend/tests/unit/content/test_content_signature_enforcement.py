# backend/tests/unit/content/test_content_signature_enforcement.py
"""Custom content must come from an account: the document check only calls a document `signed`
when its stamp is a genuine HMAC stamp for exactly that document from an existing user."""
import pytest
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

from app.core.security import generate_token
from app.models.user import User

URL = "/api/v1/content/revocations/check-document"
DOC = {"title": "My list", "tiers": [{"id": "s", "label": "S"}], "items": [{"name": "Nurse"}]}


@pytest.fixture
def author(db_session: Session) -> User:
    user = User(login="stamp_author", username="Stamp", email="stamp@example.com", password_hash="x", role="user")
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


def test_signing_requires_an_account(client: FlaskClient) -> None:
    res = client.post("/api/v1/content/sign", json={"content_type": "tier_list", "payload": DOC})
    assert res.status_code == 401


def test_genuine_stamp_is_signed(client: FlaskClient, author: User) -> None:
    manifest = _sign(client, author, DOC)
    res = client.post(URL, json={"payload": DOC, "manifest": manifest})
    assert res.get_json()["signed"] is True


def test_missing_stamp_is_not_signed(client: FlaskClient) -> None:
    assert client.post(URL, json={"payload": DOC}).get_json()["signed"] is False


def test_edited_document_loses_its_stamp(client: FlaskClient, author: User) -> None:
    manifest = _sign(client, author, DOC)
    edited = {**DOC, "title": "Edited after signing"}
    assert client.post(URL, json={"payload": edited, "manifest": manifest}).get_json()["signed"] is False


def test_forged_or_foreign_stamp_is_not_signed(client: FlaskClient, author: User) -> None:
    manifest = _sign(client, author, DOC)
    forged = {**manifest, "signature": "0" * 64}
    other_author = {**manifest, "author_id": author.id + 999}
    for bad in (forged, other_author, "stamp", {"content_hash": manifest["content_hash"]}):
        assert client.post(URL, json={"payload": DOC, "manifest": bad}).get_json()["signed"] is False


def test_stamp_of_a_deleted_account_is_not_signed(client: FlaskClient, author: User, db_session: Session) -> None:
    manifest = _sign(client, author, DOC)
    db_session.delete(author)
    db_session.commit()
    assert client.post(URL, json={"payload": DOC, "manifest": manifest}).get_json()["signed"] is False
