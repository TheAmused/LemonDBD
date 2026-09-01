# backend/migrations/versions/map_realm_translations_001.py
"""add translations JSONB column to realms and map_realms

Revision ID: map_translations_001
Revises: changelog_position_001
Create Date: 2026-09-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "map_translations_001"
down_revision = "changelog_position_001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("realms", schema=None) as batch_op:
        batch_op.add_column(sa.Column("translations", postgresql.JSONB(), nullable=True))
    with op.batch_alter_table("map_realms", schema=None) as batch_op:
        batch_op.add_column(sa.Column("translations", postgresql.JSONB(), nullable=True))


def downgrade():
    with op.batch_alter_table("map_realms", schema=None) as batch_op:
        batch_op.drop_column("translations")
    with op.batch_alter_table("realms", schema=None) as batch_op:
        batch_op.drop_column("translations")
