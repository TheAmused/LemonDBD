# backend/migrations/versions/0038_user_preference_gifs.py
"""add the gifs switch to user_preferences (animated pictures on, or a still frame instead)

Revision ID: 0038_user_preference_gifs
Revises: 0037_map_is_retired
Create Date: 2026-10-31
"""
import sqlalchemy as sa
from alembic import op

revision = "0038_user_preference_gifs"
down_revision = "0037_map_is_retired"
branch_labels = None
depends_on = None

TABLE = "user_preferences"
COLUMN = "gifs_enabled"


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return
    if COLUMN not in {column["name"] for column in inspector.get_columns(TABLE)}:
        with op.batch_alter_table(TABLE) as batch:
            batch.add_column(sa.Column(COLUMN, sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return
    if COLUMN in {column["name"] for column in inspector.get_columns(TABLE)}:
        with op.batch_alter_table(TABLE) as batch:
            batch.drop_column(COLUMN)
