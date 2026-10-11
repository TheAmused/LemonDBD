# backend/migrations/versions/0011_two_factor.py
"""optional two-factor sign-in: `user_two_factor` and `user_recovery_codes`

Revision ID: 0011_two_factor
Revises: 0010_user_token_version
Create Date: 2026-10-10

Two new tables, nothing changes on `users` and nobody has 2FA until they switch it on from their
profile. A database built after this change already has both tables (create_all() made them), so
each table and index is only created when it is missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0011_two_factor"
down_revision = "0010_user_token_version"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    tables = _tables()

    if "user_two_factor" not in tables:
        op.create_table(
            "user_two_factor",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("secret_encrypted", sa.Text(), nullable=False),
            sa.Column("enabled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_used_step", sa.BigInteger(), nullable=False, server_default="0"),
            sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_user_two_factor_user_id", "user_two_factor", ["user_id"], unique=True)

    if "user_recovery_codes" not in tables:
        op.create_table(
            "user_recovery_codes",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("code_hash", sa.String(length=255), nullable=False),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_user_recovery_codes_user_id", "user_recovery_codes", ["user_id"])


def downgrade() -> None:
    tables = _tables()
    if "user_recovery_codes" in tables:
        op.drop_table("user_recovery_codes")
    if "user_two_factor" in tables:
        op.drop_table("user_two_factor")
