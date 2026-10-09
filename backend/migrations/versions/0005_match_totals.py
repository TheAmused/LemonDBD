# backend/migrations/versions/0005_match_totals.py
"""lifetime match totals on challenge runs

Revision ID: 0005_match_totals
Revises: 0004_attempt_groups
Create Date: 2026-10-08

Old match logs are pruned (100 per run), so the win and loss totals and the matches of
the current playthrough move onto the run. Existing runs are counted from the logs they
still have, as the playthrough count always was. A database built after this change already has the columns (create_all() made
the table), so each one is only added when it is missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0005_match_totals"
down_revision = "0004_attempt_groups"
branch_labels = None
depends_on = None

#: run table -> its match log table
RUN_LOG_TABLES = {
    "gauntlet_runs": "gauntlet_match_logs",
    "chaos_runs": "chaos_match_logs",
    "history_runs": "history_match_logs",
    "page_streak_runs": "page_streak_page_logs",
}
COLUMNS = ("total_wins", "total_losses", "playthrough_matches")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for run_table, log_table in RUN_LOG_TABLES.items():
        existing = {column["name"] for column in inspector.get_columns(run_table)}
        if all(name in existing for name in COLUMNS):
            continue
        for name in COLUMNS:
            if name not in existing:
                op.add_column(run_table, sa.Column(name, sa.Integer(), nullable=False, server_default="0"))
        bind.execute(sa.text(f"""
            UPDATE {run_table} SET
              total_wins = (SELECT COUNT(*) FROM {log_table} l WHERE l.run_id = {run_table}.id AND l.result = 'win'),
              total_losses = (SELECT COUNT(*) FROM {log_table} l WHERE l.run_id = {run_table}.id AND l.result = 'loss'),
              playthrough_matches = (SELECT COUNT(*) FROM {log_table} l WHERE l.run_id = {run_table}.id)
        """))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for run_table in RUN_LOG_TABLES:
        existing = {column["name"] for column in inspector.get_columns(run_table)}
        for name in COLUMNS:
            if name in existing:
                op.drop_column(run_table, name)
