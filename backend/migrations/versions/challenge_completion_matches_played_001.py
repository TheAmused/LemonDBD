# backend/migrations/versions/challenge_completion_matches_played_001.py
"""add matches_played to challenge_completion_records

Revision ID: challenge_completion_matches_001
Revises: challenge_attempts_001
Create Date: 2026-09-12 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect so that create_app()'s
unconditional db.create_all() (which already creates this column on a fresh
database via the updated model) doesn't cause upgrade() to fail with a
duplicate column error.
"""
from alembic import op
import sqlalchemy as sa


revision = "challenge_completion_matches_001"
down_revision = "challenge_attempts_001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    columns = {c["name"] for c in _inspector().get_columns("challenge_completion_records")}
    if "matches_played" not in columns:
        with op.batch_alter_table("challenge_completion_records", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column("matches_played", sa.Integer(), server_default="0", nullable=False)
            )


def downgrade():
    columns = {c["name"] for c in _inspector().get_columns("challenge_completion_records")}
    if "matches_played" in columns:
        with op.batch_alter_table("challenge_completion_records", schema=None) as batch_op:
            batch_op.drop_column("matches_played")
