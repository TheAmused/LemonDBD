# backend/migrations/versions/0020_changelog_published_at.py
"""changelog_posts: when a post went live

Revision ID: 0020_changelog_published_at
Revises: 0019_changelog_drop_tag
Create Date: 2026-10-16

`created_at` is when the draft was started, which is not what readers should see as the date, nor
what "new since your last visit" should compare against: a draft written on Monday and published on
Friday would never light the dot for someone who opened the feed on Wednesday. Posts already live
get their creation time as the publication time. A database built after this change already has the
column (create_all() made the table), so the step only runs when it is still missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0020_changelog_published_at"
down_revision = "0019_changelog_drop_tag"
branch_labels = None
depends_on = None

TABLE = "changelog_posts"


def _columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(TABLE)}


def upgrade() -> None:
    columns = _columns()
    if not columns or "published_at" in columns:
        return
    op.add_column(TABLE, sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    posts = sa.table(
        TABLE,
        sa.column("published_at", sa.DateTime(timezone=True)),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("is_published", sa.Boolean),
    )
    op.execute(posts.update().where(posts.c.is_published.is_(True)).values(published_at=posts.c.created_at))


def downgrade() -> None:
    if "published_at" not in _columns():
        return
    with op.batch_alter_table(TABLE) as batch:
        batch.drop_column("published_at")
