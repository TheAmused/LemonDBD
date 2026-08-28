# backend/migrations/versions/email_verification_reset_001.py
"""add email verification and password reset fields to users

Revision ID: email_verification_reset_001
Revises: admin_perk_control_001
Create Date: 2026-08-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "email_verification_reset_001"
down_revision = "admin_perk_control_001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        # server_default=true grandfathers every pre-existing account as verified
        # (they already proved ownership by using the app before this feature
        # existed); the default is flipped to false below for accounts created
        # from this point on.
        batch_op.add_column(
            sa.Column("is_verified", sa.Boolean(), server_default=sa.true(), nullable=False)
        )
        batch_op.add_column(
            sa.Column("verification_code", sa.String(length=6), nullable=True)
        )
        batch_op.add_column(
            sa.Column("verification_code_expires_at", sa.DateTime(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("verification_attempts", sa.Integer(), server_default="0", nullable=False)
        )
        batch_op.add_column(
            sa.Column("reset_token", sa.String(length=255), nullable=True)
        )
        batch_op.add_column(
            sa.Column("reset_token_expires_at", sa.DateTime(), nullable=True)
        )
        batch_op.create_index(
            "ix_users_reset_token", ["reset_token"], unique=True
        )
        batch_op.alter_column("is_verified", server_default=sa.false())


def downgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_index("ix_users_reset_token")
        batch_op.drop_column("reset_token_expires_at")
        batch_op.drop_column("reset_token")
        batch_op.drop_column("verification_attempts")
        batch_op.drop_column("verification_code_expires_at")
        batch_op.drop_column("verification_code")
        batch_op.drop_column("is_verified")
