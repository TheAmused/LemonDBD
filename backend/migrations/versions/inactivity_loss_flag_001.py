# backend/migrations/versions/inactivity_loss_flag_001.py
"""add triggered_by to gauntlet/chaos/history/page-streak match logs

Revision ID: inactivity_loss_001
Revises: freeze_pools_001
Create Date: 2026-08-21 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "inactivity_loss_001"
down_revision = "freeze_pools_001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("gauntlet_match_logs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("triggered_by", sa.String(length=20), server_default="player", nullable=False)
        )
    with op.batch_alter_table("chaos_match_logs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("triggered_by", sa.String(length=20), server_default="player", nullable=False)
        )
    with op.batch_alter_table("history_match_logs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("triggered_by", sa.String(length=20), server_default="player", nullable=False)
        )
    with op.batch_alter_table("page_streak_page_logs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("triggered_by", sa.String(length=20), server_default="player", nullable=False)
        )


def downgrade():
    with op.batch_alter_table("page_streak_page_logs", schema=None) as batch_op:
        batch_op.drop_column("triggered_by")
    with op.batch_alter_table("history_match_logs", schema=None) as batch_op:
        batch_op.drop_column("triggered_by")
    with op.batch_alter_table("chaos_match_logs", schema=None) as batch_op:
        batch_op.drop_column("triggered_by")
    with op.batch_alter_table("gauntlet_match_logs", schema=None) as batch_op:
        batch_op.drop_column("triggered_by")
