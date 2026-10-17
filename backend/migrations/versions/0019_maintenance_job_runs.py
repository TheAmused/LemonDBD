# backend/migrations/versions/0019_maintenance_job_runs.py
"""maintenance_job_runs: when each housekeeping job last ran

Revision ID: 0019_maintenance_job_runs
Revises: 0018_banned_email_hashes
Create Date: 2026-10-16

One row per job (streak inactivity, evidence purge, moderation emails, ban list, catalog cache),
written by the scheduler and by the admin's "Run now". A database built after this change already
has the table (create_all() made it), so the step only runs when it is missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0019_maintenance_job_runs"
down_revision = "0018_banned_email_hashes"
branch_labels = None
depends_on = None

TABLE = "maintenance_job_runs"


def upgrade() -> None:
    if TABLE in set(sa.inspect(op.get_bind()).get_table_names()):
        return
    op.create_table(
        TABLE,
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_affected", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_trigger", sa.String(16), nullable=False),
    )


def downgrade() -> None:
    if TABLE in set(sa.inspect(op.get_bind()).get_table_names()):
        op.drop_table(TABLE)
