# backend/migrations/versions/0047_roster_romance_archetypes.py
"""Add romance_archetypes JSON column to rosters

Revision ID: 0047_roster_romance_archetypes
Revises: 0046_map_photo_local_path
Create Date: 2026-11-14

A database built after this change already has the column (create_all() made the table), so it is only added when it
is missing.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0047_roster_romance_archetypes"
down_revision = "0046_map_photo_local_path"
branch_labels = None
depends_on = None

TABLE = "rosters"
COLUMN = "romance_archetypes"


def _has_column() -> bool:
    return COLUMN in {column["name"] for column in sa.inspect(op.get_bind()).get_columns(TABLE)}


def upgrade() -> None:
    if not _has_column():
        op.add_column(
            TABLE,
            sa.Column(
                COLUMN,
                postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
                nullable=True,
            ),
        )


def downgrade() -> None:
    if _has_column():
        op.drop_column(TABLE, COLUMN)
