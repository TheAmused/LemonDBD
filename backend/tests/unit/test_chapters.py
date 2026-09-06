# backend/tests/unit/test_chapters.py
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Chapter


def test_chapter_upsert_and_to_dict(db_session: Session) -> None:
    ch = Chapter(name="Test Chapter", banner_url="https://example.com/banner.png", banner_local_path="chapters/test_chapter.png")
    db_session.add(ch)
    db_session.flush()

    found = db_session.scalars(select(Chapter).where(Chapter.name == "Test Chapter")).first()
    assert found is not None
    d = found.to_dict()
    assert d == {
        "name": "Test Chapter",
        "banner_url": "https://example.com/banner.png",
        "banner_local_path": "chapters/test_chapter.png",
    }


def test_chapter_name_is_unique(db_session: Session) -> None:
    db_session.add(Chapter(name="Dup"))
    db_session.flush()
    db_session.add(Chapter(name="Dup"))
    import pytest
    from sqlalchemy.exc import IntegrityError
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_list_chapters_route(client: FlaskClient, db_session: Session) -> None:
    from app.models import Chapter
    db_session.add(Chapter(name="Route Test Chapter", banner_url="https://example.com/b.png", banner_local_path="chapters/route_test.png"))
    db_session.commit()

    res = client.get("/api/v1/chapters")
    assert res.status_code == 200
    data = res.get_json()["chapters"]
    assert any(c["name"] == "Route Test Chapter" and c["banner_url"] == "https://example.com/b.png" for c in data)
