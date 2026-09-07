# backend/migrations/versions/drop_legacy_smash_pass_tables_001.py
"""drop legacy smash_pass_stats and smash_pass_votes tables

Revision ID: drop_legacy_smash_pass_001
Revises: preferred_language_001
Create Date: 2026-09-07 00:00:00.000000

Both tables were write-only leftovers from the pre-Entity/EntityStat/Vote
smash-or-pass model: smash_pass_stats was updated on every vote but never
read by any route or service method (the real read path is Entity/EntityStat),
and smash_pass_votes was never written to at all. Confirmed via a full-repo
grep before removing the SQLAlchemy models (app/models/smash_or_pass.py) and
their call sites (cast_vote, reset_user_votes, reset_stats, the roster seeder).

Idempotent: guarded with sqlalchemy.inspect, matching this project's
convention.
"""
from alembic import op
import sqlalchemy as sa


revision = "drop_legacy_smash_pass_001"
down_revision = "preferred_language_001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    inspector = _inspector()
    if inspector.has_table("smash_pass_votes"):
        op.drop_table("smash_pass_votes")
    if inspector.has_table("smash_pass_stats"):
        op.drop_table("smash_pass_stats")


def downgrade():
    inspector = _inspector()
    if not inspector.has_table("smash_pass_stats"):
        op.create_table(
            "smash_pass_stats",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("character_slug", sa.String(length=100), nullable=False, index=True),
            sa.Column("character_name", sa.String(length=150), nullable=False, index=True),
            sa.Column("role", sa.String(length=20), server_default="Survivor", nullable=False),
            sa.Column("gender", sa.String(length=20), server_default="female", nullable=False),
            sa.Column("edition", sa.String(length=50), server_default="canon", nullable=False, index=True),
            sa.Column("smash_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("pass_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("super_smash_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("total_votes", sa.Integer(), server_default="0", nullable=False),
            sa.Column("smash_rate", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
    if not inspector.has_table("smash_pass_votes"):
        op.create_table(
            "smash_pass_votes",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("character_slug", sa.String(length=100), nullable=False, index=True),
            sa.Column("vote_type", sa.String(length=20), nullable=False),
            sa.Column("edition", sa.String(length=50), server_default="canon", nullable=False, index=True),
            sa.Column("user_id", sa.Integer(), nullable=True, index=True),
            sa.Column("session_id", sa.String(length=100), nullable=True, index=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
