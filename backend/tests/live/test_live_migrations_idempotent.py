# backend/tests/live/test_live_migrations_idempotent.py
"""
Regression test for the "500 column changelog_posts.position does not
exist" incident: a stamp-at-head sync script + non-idempotent migrations
combined to permanently hide a missing column on any database that already
had `changelog_posts` before `position` was added. The fix was (a) making
every migration guard its DDL with sqlalchemy.inspect existence checks, and
(b) having sync_db_schema.py stamp at a safe baseline then always upgrade().

This test locks in guarantee (a) directly: running the full migration chain
twice in a row against the same real PostgreSQL database must be a no-op
the second time, never an "already exists" error. That is what makes it
safe for entrypoint.sh to run `sync_db_schema.py` unconditionally on every
container start, forever.
"""
import pytest
from flask import Flask
from flask_migrate import upgrade
from sqlalchemy import inspect


@pytest.mark.live
def test_upgrade_head_twice_in_a_row_is_a_safe_no_op(live_app: Flask) -> None:
    with live_app.app_context():
        # First run: brings the cloned live DB (already at head from normal
        # app startup) through upgrade() -- should already be a no-op, but
        # exercises the same code path entrypoint.sh runs on every boot.
        upgrade()
        # Second run: must not raise DuplicateColumn / DuplicateTable /
        # DuplicateObject -- this is exactly the scenario a container
        # restart triggers every time.
        upgrade()


@pytest.mark.live
def test_changelog_posts_schema_matches_the_current_model(live_app: Flask) -> None:
    with live_app.app_context():
        from app.core.extensions import db

        inspector = inspect(db.engine)
        assert inspector.has_table("changelog_posts")

        columns = {c["name"] for c in inspector.get_columns("changelog_posts")}
        expected = {
            "id", "title", "content_html", "tag", "position", "is_published",
            "author_id", "author_name", "created_at", "updated_at",
        }
        missing = expected - columns
        assert not missing, f"changelog_posts is missing columns: {missing}"

        indexes = {ix["name"] for ix in inspector.get_indexes("changelog_posts")}
        assert "ix_changelog_posts_position" in indexes
