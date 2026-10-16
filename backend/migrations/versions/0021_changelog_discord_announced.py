# backend/migrations/versions/0021_changelog_discord_announced.py
"""changelog_posts: remember that an entry was announced on Discord

Revision ID: 0021_changelog_discord_announced
Revises: 0020_changelog_published_at
Create Date: 2026-10-16

An entry is announced once: after it went out the editor no longer offers to do it again. A database
built after this change already has the column (create_all() made the table), so the step only runs
when it is still missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0021_changelog_discord_announced"
down_revision = "0020_changelog_published_at"
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
    if not columns or "discord_announced_at" in columns:
        return
    op.add_column(TABLE, sa.Column("discord_announced_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    if "discord_announced_at" not in _columns():
        return
    with op.batch_alter_table(TABLE) as batch:
        batch.drop_column("discord_announced_at")
