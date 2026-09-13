# backend/migrations/versions/page_streak_roster_milestone_unique_001.py
"""add full_roster to challenge_completion_records, plus a partial unique
index guarding the page-streak roster-complete milestone

Revision ID: roster_milestone_unique_001
Revises: character_created_at_001
Create Date: 2026-09-13 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect so that create_app()'s
unconditional db.create_all() (which already creates this column/index on a
fresh database via the updated model) doesn't cause upgrade() to fail with a
duplicate column/index error.

`full_roster` is set on every mode's completion row (gauntlet/chaos/history/
page_streak) when that run's frozen owned-character pool matched the whole
(role- and roster-limit-bounded) game roster at the time. Only the
page-streak "roster_complete" variant is constrained to one row per user --
every other row in this table stays append-only history, which is why this
is a partial index rather than a full unique constraint.
"""
from alembic import op
import sqlalchemy as sa


revision = "roster_milestone_unique_001"
down_revision = "character_created_at_001"
branch_labels = None
depends_on = None

_WHERE = "mode = 'page_streak' AND variant = 'roster_complete'"


def _inspector():
    return sa.inspect(op.get_bind())


def _existing_index_names():
    return {idx["name"] for idx in _inspector().get_indexes("challenge_completion_records")}


def upgrade():
    columns = {c["name"] for c in _inspector().get_columns("challenge_completion_records")}
    if "full_roster" not in columns:
        with op.batch_alter_table("challenge_completion_records", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column("full_roster", sa.Boolean(), server_default=sa.false(), nullable=False)
            )

    if "uq_page_streak_roster_complete" not in _existing_index_names():
        op.create_index(
            "uq_page_streak_roster_complete",
            "challenge_completion_records",
            ["user_id", "mode", "variant"],
            unique=True,
            postgresql_where=sa.text(_WHERE),
            sqlite_where=sa.text(_WHERE),
        )


def downgrade():
    if "uq_page_streak_roster_complete" in _existing_index_names():
        op.drop_index("uq_page_streak_roster_complete", table_name="challenge_completion_records")

    columns = {c["name"] for c in _inspector().get_columns("challenge_completion_records")}
    if "full_roster" in columns:
        with op.batch_alter_table("challenge_completion_records", schema=None) as batch_op:
            batch_op.drop_column("full_roster")
