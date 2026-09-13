# backend/migrations/versions/challenge_attempts_and_completions_001.py
"""add attempts counter to gauntlet/chaos/history runs and a challenge_completion_records table

Revision ID: challenge_attempts_001
Revises: 0001_initial_schema
Create Date: 2026-09-12 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect so that create_app()'s
unconditional db.create_all() (which already creates these on a fresh
database via the updated models) doesn't cause upgrade() to fail with a
duplicate column/table error.

Rechained onto `0001_initial_schema` when develop squashed its prior chain
(`drop_generator_tables_001` and everything before it no longer exist).
"""
from alembic import op
import sqlalchemy as sa


revision = "challenge_attempts_001"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _add_attempts_column(table_name: str) -> None:
    columns = {c["name"] for c in _inspector().get_columns(table_name)}
    if "attempts" not in columns:
        with op.batch_alter_table(table_name, schema=None) as batch_op:
            batch_op.add_column(
                sa.Column("attempts", sa.Integer(), server_default="0", nullable=False)
            )


def _drop_attempts_column(table_name: str) -> None:
    columns = {c["name"] for c in _inspector().get_columns(table_name)}
    if "attempts" in columns:
        with op.batch_alter_table(table_name, schema=None) as batch_op:
            batch_op.drop_column("attempts")


def upgrade():
    _add_attempts_column("gauntlet_runs")
    _add_attempts_column("chaos_runs")
    _add_attempts_column("history_runs")

    if "challenge_completion_records" not in _inspector().get_table_names():
        op.create_table(
            "challenge_completion_records",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("mode", sa.String(length=20), nullable=False),
            sa.Column("variant", sa.String(length=30), nullable=False),
            sa.Column("attempts_taken", sa.Integer(), nullable=False),
            sa.Column("unlocked_characters_count", sa.Integer(), nullable=False),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index(
            "ix_challenge_completion_records_user_id",
            "challenge_completion_records",
            ["user_id"],
        )
        op.create_index(
            "ix_challenge_completion_records_completed_at",
            "challenge_completion_records",
            ["completed_at"],
        )


def downgrade():
    if "challenge_completion_records" in _inspector().get_table_names():
        op.drop_index("ix_challenge_completion_records_completed_at", table_name="challenge_completion_records")
        op.drop_index("ix_challenge_completion_records_user_id", table_name="challenge_completion_records")
        op.drop_table("challenge_completion_records")

    _drop_attempts_column("history_runs")
    _drop_attempts_column("chaos_runs")
    _drop_attempts_column("gauntlet_runs")
