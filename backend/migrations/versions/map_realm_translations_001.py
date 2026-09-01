# backend/migrations/versions/map_realm_translations_001.py
"""add translations JSONB column to realms and map_realms

Revision ID: map_translations_001
Revises: changelog_position_001
Create Date: 2026-09-01 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect so that stamping at an earlier
baseline and re-running upgrade() against a database that already has this
column (e.g. one originally built by db.create_all() before Alembic history
caught up) is a safe no-op instead of a "column already exists" error.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "map_translations_001"
down_revision = "changelog_position_001"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    return column in {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}


def upgrade():
    if not _has_column("realms", "translations"):
        with op.batch_alter_table("realms", schema=None) as batch_op:
            batch_op.add_column(sa.Column("translations", postgresql.JSONB(), nullable=True))
    if not _has_column("map_realms", "translations"):
        with op.batch_alter_table("map_realms", schema=None) as batch_op:
            batch_op.add_column(sa.Column("translations", postgresql.JSONB(), nullable=True))


def downgrade():
    if _has_column("map_realms", "translations"):
        with op.batch_alter_table("map_realms", schema=None) as batch_op:
            batch_op.drop_column("translations")
    if _has_column("realms", "translations"):
        with op.batch_alter_table("realms", schema=None) as batch_op:
            batch_op.drop_column("translations")
