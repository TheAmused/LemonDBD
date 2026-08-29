# backend/migrations/versions/admin_perk_kill_switch_001.py
"""add admin perk disable flag

Revision ID: admin_perk_control_001
Revises: admin_control_001
Create Date: 2026-08-22 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "admin_perk_control_001"
down_revision = "admin_control_001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("perks", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("is_disabled", sa.Boolean(), server_default=sa.false(), nullable=False)
        )
        batch_op.add_column(
            sa.Column("disabled_reason", sa.String(length=255), nullable=True)
        )


def downgrade():
    with op.batch_alter_table("perks", schema=None) as batch_op:
        batch_op.drop_column("disabled_reason")
        batch_op.drop_column("is_disabled")
