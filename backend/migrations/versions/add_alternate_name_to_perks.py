# backend/migrations/versions/add_alternate_name_to_perks.py
"""add alternate_name and is_generic_counterpart to perks

Revision ID: add_perk_aliases_001
Revises: 
Create Date: 2026-08-18 12:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "add_perk_aliases_001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("perks", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("alternate_name", sa.String(length=150), nullable=True)
        )
        batch_op.add_column(
            sa.Column("is_generic_counterpart", sa.Boolean(), server_default=sa.text("0"), nullable=False)
        )


def downgrade():
    with op.batch_alter_table("perks", schema=None) as batch_op:
        batch_op.drop_column("is_generic_counterpart")
        batch_op.drop_column("alternate_name")