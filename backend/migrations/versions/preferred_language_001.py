# backend/migrations/versions/preferred_language_001.py
"""add preferred_language column to users

Revision ID: preferred_language_001
Revises: chapter_banners_001
Create Date: 2026-09-06 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect, matching this project's
convention for a migration that could re-run against a database create_all()
already touched -- not actually reachable here since create_all() never
ALTERs an existing table to add a new column, but guarded anyway for safety
against a re-run of this migration itself.
"""
from alembic import op
import sqlalchemy as sa


revision = "preferred_language_001"
down_revision = "chapter_banners_001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    columns = {c["name"] for c in _inspector().get_columns("users")}
    if "preferred_language" not in columns:
        op.add_column("users", sa.Column("preferred_language", sa.String(length=5), nullable=True))


def downgrade():
    columns = {c["name"] for c in _inspector().get_columns("users")}
    if "preferred_language" in columns:
        op.drop_column("users", "preferred_language")
