# backend/migrations/versions/admin_character_kill_switch_001.py
"""add admin character disable flag, per-mode kill switch, and admin audit log

Revision ID: admin_control_001
Revises: inactivity_loss_001
Create Date: 2026-08-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "admin_control_001"
down_revision = "inactivity_loss_001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("characters", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("is_disabled", sa.Boolean(), server_default=sa.false(), nullable=False)
        )
        batch_op.add_column(
            sa.Column("disabled_reason", sa.String(length=255), nullable=True)
        )

    op.create_table(
        "challenge_mode_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("mode", sa.String(length=20), nullable=False, unique=True),
        sa.Column("is_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("disabled_reason", sa.String(length=255), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "admin_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "admin_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("target_type", sa.String(length=50), nullable=True),
        sa.Column("target_id", sa.String(length=100), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    with op.batch_alter_table("admin_audit_logs", schema=None) as batch_op:
        batch_op.create_index("ix_admin_audit_logs_admin_user_id", ["admin_user_id"])
        batch_op.create_index("ix_admin_audit_logs_created_at", ["created_at"])


def downgrade():
    with op.batch_alter_table("admin_audit_logs", schema=None) as batch_op:
        batch_op.drop_index("ix_admin_audit_logs_created_at")
        batch_op.drop_index("ix_admin_audit_logs_admin_user_id")
    op.drop_table("admin_audit_logs")

    op.drop_table("challenge_mode_settings")

    with op.batch_alter_table("characters", schema=None) as batch_op:
        batch_op.drop_column("disabled_reason")
        batch_op.drop_column("is_disabled")
