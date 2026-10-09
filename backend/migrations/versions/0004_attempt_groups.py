# backend/migrations/versions/0004_attempt_groups.py
"""attempt groups: a run's attempt number and the attempt every match log belongs to

Revision ID: 0004_attempt_groups
Revises: 0003_gauntlet_tokens
Create Date: 2026-10-08

Page streak already numbered its attempts and filed its logs under them. The other
three modes get the same columns, and page streak gets the resettable `attempts`
counter the others already had. A database built after this change already has the
columns (create_all() made the table), so each one is only added when it is missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0004_attempt_groups"
down_revision = "0003_gauntlet_tokens"
branch_labels = None
depends_on = None

#: table -> columns to add when missing. Every log and run starts in attempt 1.
COLUMNS = {
    "gauntlet_runs": ("attempt",),
    "chaos_runs": ("attempt",),
    "history_runs": ("attempt",),
    "page_streak_runs": ("attempts",),
    "gauntlet_match_logs": ("attempt",),
    "chaos_match_logs": ("attempt",),
    "history_match_logs": ("attempt",),
}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for table, names in COLUMNS.items():
        existing = {column["name"] for column in inspector.get_columns(table)}
        for name in names:
            if name not in existing:
                default = "0" if name == "attempts" else "1"
                op.add_column(table, sa.Column(name, sa.Integer(), nullable=False, server_default=default))
                # Runs that already failed some attempts keep counting from where they were.
                if table == "page_streak_runs":
                    bind.execute(sa.text("UPDATE page_streak_runs SET attempts = attempt - 1"))
                elif table.endswith("_runs"):
                    bind.execute(sa.text(f"UPDATE {table} SET attempt = attempts + 1"))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for table, names in COLUMNS.items():
        existing = {column["name"] for column in inspector.get_columns(table)}
        for name in names:
            if name in existing:
                op.drop_column(table, name)
