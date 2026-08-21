"""add frozen pool snapshot columns to gauntlet/chaos/history runs

Revision ID: freeze_pools_001
Revises: add_perk_aliases_001
Create Date: 2026-08-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "freeze_pools_001"
down_revision = "add_perk_aliases_001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("gauntlet_runs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("owned_characters_json", sa.Text(), server_default="[]", nullable=False)
        )
    with op.batch_alter_table("chaos_runs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("owned_killers_json", sa.Text(), server_default="[]", nullable=False)
        )
        batch_op.add_column(
            sa.Column("unlocked_perks_json", sa.Text(), server_default="[]", nullable=False)
        )
    with op.batch_alter_table("history_runs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("owned_killers_json", sa.Text(), server_default="[]", nullable=False)
        )


def downgrade():
    with op.batch_alter_table("history_runs", schema=None) as batch_op:
        batch_op.drop_column("owned_killers_json")
    with op.batch_alter_table("chaos_runs", schema=None) as batch_op:
        batch_op.drop_column("unlocked_perks_json")
        batch_op.drop_column("owned_killers_json")
    with op.batch_alter_table("gauntlet_runs", schema=None) as batch_op:
        batch_op.drop_column("owned_characters_json")
