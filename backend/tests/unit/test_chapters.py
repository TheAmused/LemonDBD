# backend/tests/unit/test_chapters.py
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
