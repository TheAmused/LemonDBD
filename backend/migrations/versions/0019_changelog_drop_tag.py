# backend/migrations/versions/0019_changelog_drop_tag.py
"""changelog_posts: no per-post tag any more

Revision ID: 0019_changelog_drop_tag
Revises: 0018_banned_email_hashes
Create Date: 2026-10-16

One patch ships new content, fixes and balance changes together, so a post is no longer filed under a
single category: the "What's New" editor offers ready-made sections to fill in instead. The `tag`
column (and its index) goes away. A database built after this change never had it (create_all()
made the table), so the step only runs when the column is still there.
"""
import sqlalchemy as sa
from alembic import op

revision = "0019_changelog_drop_tag"
down_revision = "0018_banned_email_hashes"
branch_labels = None
depends_on = None

TABLE = "changelog_posts"
TAG_INDEX = "ix_changelog_posts_tag"


def _inspector() -> sa.Inspector:
    return sa.inspect(op.get_bind())


def _columns() -> set[str]:
    inspector = _inspector()
    if TABLE not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(TABLE)}


def upgrade() -> None:
    if "tag" not in _columns():
        return
    if TAG_INDEX in {index["name"] for index in _inspector().get_indexes(TABLE)}:
        op.drop_index(TAG_INDEX, table_name=TABLE)
    with op.batch_alter_table(TABLE) as batch:
        batch.drop_column("tag")


def downgrade() -> None:
    columns = _columns()
    if not columns or "tag" in columns:
        return
    op.add_column(TABLE, sa.Column("tag", sa.String(30), nullable=False, server_default="feature"))
    op.create_index(TAG_INDEX, TABLE, ["tag"])
