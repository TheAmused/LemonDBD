# backend/migrations/versions/roster_created_at_and_full_roster_001.py
"""add created_at to survivors/killers and full_roster to challenge_completion_records

Revision ID: roster_created_at_001
Revises: challenge_completion_matches_001
Create Date: 2026-09-13 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect so that create_app()'s
unconditional db.create_all() (which already creates these columns on a
fresh database via the updated models) doesn't cause upgrade() to fail with
a duplicate column error.

Replaces the old `character_created_at_001` / `page_streak_roster_milestone_
unique_001` / `drop_page_streak_roster_complete_index_001` chain, written
against the single `characters` table and a two-variant page-streak unique
index. Both are gone: `characters` split into `survivors`/`killers`, and
Page Streak's roster badge is computed live rather than stored, so the
partial unique index those two migrations added and then dropped again never
needs to exist at all.
"""
from alembic import op
import sqlalchemy as sa


revision = "roster_created_at_001"
down_revision = "challenge_completion_matches_001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _add_created_at(table_name: str) -> None:
    columns = {c["name"] for c in _inspector().get_columns(table_name)}
    if "created_at" not in columns:
        with op.batch_alter_table(table_name, schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "created_at",
                    sa.DateTime(timezone=True),
                    server_default=sa.func.now(),
                    nullable=False,
                )
            )


def _drop_created_at(table_name: str) -> None:
    columns = {c["name"] for c in _inspector().get_columns(table_name)}
    if "created_at" in columns:
        with op.batch_alter_table(table_name, schema=None) as batch_op:
            batch_op.drop_column("created_at")


def upgrade():
    _add_created_at("survivors")
    _add_created_at("killers")

    columns = {c["name"] for c in _inspector().get_columns("challenge_completion_records")}
    if "full_roster" not in columns:
        with op.batch_alter_table("challenge_completion_records", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column("full_roster", sa.Boolean(), server_default=sa.false(), nullable=False)
            )


def downgrade():
    columns = {c["name"] for c in _inspector().get_columns("challenge_completion_records")}
    if "full_roster" in columns:
        with op.batch_alter_table("challenge_completion_records", schema=None) as batch_op:
            batch_op.drop_column("full_roster")

    _drop_created_at("killers")
    _drop_created_at("survivors")
