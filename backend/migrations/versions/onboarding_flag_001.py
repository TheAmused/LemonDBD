# backend/migrations/versions/onboarding_flag_001.py
"""add onboarding_completed_at to users

Revision ID: onboarding_flag_001
Revises: user_showcase_001
Create Date: 2026-09-05 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect so that create_app()'s
unconditional db.create_all() (which already creates this column on a fresh
database via the User model) doesn't cause upgrade() to fail with a
duplicate column error.
"""
from alembic import op
import sqlalchemy as sa


revision = "onboarding_flag_001"
down_revision = "user_showcase_001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    columns = {c["name"] for c in _inspector().get_columns("users")}
    if "onboarding_completed_at" not in columns:
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column("onboarding_completed_at", sa.DateTime(timezone=True), nullable=True)
            )


def downgrade():
    columns = {c["name"] for c in _inspector().get_columns("users")}
    if "onboarding_completed_at" in columns:
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.drop_column("onboarding_completed_at")

