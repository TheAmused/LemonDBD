# backend/migrations/versions/0022_changelog_edited_discord.py
"""changelog_posts: mark edited entries and remember the Discord message

Revision ID: 0022_changelog_edited_discord
Revises: 0021_changelog_discord_announced
Create Date: 2026-10-17

`edited_at` drives the "Edited" note readers see; `discord_message_id` and `discord_synced_at` let an edit
be pushed to the Discord message in place. Entries announced before this change have no message id, so
they cannot be updated on Discord. A database built after this change already has the columns
(create_all() made the table), so each step only runs when its column is still missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0022_changelog_edited_discord"
down_revision = "0021_changelog_discord_announced"
branch_labels = None
depends_on = None

TABLE = "changelog_posts"

NEW_COLUMNS: tuple[tuple[str, sa.types.TypeEngine], ...] = (
    ("edited_at", sa.DateTime(timezone=True)),
    ("discord_message_id", sa.String(32)),
    ("discord_synced_at", sa.DateTime(timezone=True)),
)


def _columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(TABLE)}


def upgrade() -> None:
    columns = _columns()
    if not columns:
        return
    for name, column_type in NEW_COLUMNS:
        if name not in columns:
            op.add_column(TABLE, sa.Column(name, column_type, nullable=True))


def downgrade() -> None:
    columns = _columns()
    present = [name for name, _ in NEW_COLUMNS if name in columns]
    if not present:
        return
    with op.batch_alter_table(TABLE) as batch:
        for name in present:
            batch.drop_column(name)
