# backend/migrations/versions/0040_attempt_matches.py
"""matches played in the current attempt, on every challenge run

Revision ID: 0040_attempt_matches
Revises: 0039_background_animation_eco
Create Date: 2026-11-03

An attempt only counts once a match was played in it, so the run keeps how many it has. Existing runs are
counted from the logs filed under their current attempt. A database built after this change already has
the column (create_all() made the table), so it is only added when it is missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0040_attempt_matches"
down_revision = "0039_background_animation_eco"
branch_labels = None
depends_on = None

COLUMN = "attempt_matches"

#: run table -> its match log table
RUN_LOG_TABLES = {
    "gauntlet_runs": "gauntlet_match_logs",
    "chaos_runs": "chaos_match_logs",
    "history_runs": "history_match_logs",
    "id_please_runs": "id_please_match_logs",
    "page_streak_runs": "page_streak_page_logs",
}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for run_table, log_table in RUN_LOG_TABLES.items():
        if COLUMN in {column["name"] for column in inspector.get_columns(run_table)}:
            continue
        op.add_column(run_table, sa.Column(COLUMN, sa.Integer(), nullable=False, server_default="0"))
        bind.execute(sa.text(f"""
            UPDATE {run_table} SET {COLUMN} =
              (SELECT COUNT(*) FROM {log_table} l WHERE l.run_id = {run_table}.id AND l.attempt = {run_table}.attempt)
        """))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for run_table in RUN_LOG_TABLES:
        if COLUMN in {column["name"] for column in inspector.get_columns(run_table)}:
            op.drop_column(run_table, COLUMN)
