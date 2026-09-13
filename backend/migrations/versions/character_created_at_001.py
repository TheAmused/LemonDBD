# backend/migrations/versions/character_created_at_001.py
"""add created_at to characters

Revision ID: character_created_at_001
Revises: challenge_completion_matches_001
Create Date: 2026-09-13 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect so that create_app()'s
unconditional db.create_all() (which already creates this column on a fresh
database via the updated model) doesn't cause upgrade() to fail with a
duplicate column error.
"""
from alembic import op
import sqlalchemy as sa


revision = "character_created_at_001"
down_revision = "challenge_completion_matches_001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    columns = {c["name"] for c in _inspector().get_columns("characters")}
    if "created_at" not in columns:
        with op.batch_alter_table("characters", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "created_at",
                    sa.DateTime(timezone=True),
                    server_default=sa.func.now(),
                    nullable=False,
                )
            )


def downgrade():
    columns = {c["name"] for c in _inspector().get_columns("characters")}
    if "created_at" in columns:
        with op.batch_alter_table("characters", schema=None) as batch_op:
            batch_op.drop_column("created_at")
