# backend/migrations/versions/onboarding_flag_001.py
"""add onboarding_completed_at to users

Revision ID: onboarding_flag_001
Revises: user_showcase_001
Create Date: 2026-09-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "onboarding_flag_001"
down_revision = "user_showcase_001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("onboarding_completed_at", sa.DateTime(timezone=True), nullable=True)
        )


def downgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("onboarding_completed_at")
