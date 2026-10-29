# backend/migrations/versions/0034_id_please.py
"""create the ID, Please run and match log tables (a run belongs to a lane: mixed, survivor or killer)

Revision ID: 0034_id_please
Revises: 0033_perk_type_redesign
Create Date: 2026-10-28
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0034_id_please"
down_revision = "0033_perk_type_redesign"
branch_labels = None
depends_on = None


def _json() -> sa.types.TypeEngine:
    return postgresql.JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    bind = op.get_bind()
    tables = sa.inspect(bind).get_table_names()

    if "id_please_runs" not in tables:
        op.create_table(
            "id_please_runs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("status", sa.String(20), nullable=False, server_default="in_progress"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("attempt", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("total_wins", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("total_losses", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("playthrough_matches", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("best_streak", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_checkpoint_streak", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("lane", sa.String(10), nullable=False, server_default="mixed"),
            sa.Column("difficulty", sa.String(20), nullable=False),
            sa.Column("algo_version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("opening_side", sa.String(10), nullable=False, server_default=""),
            sa.Column("opening_perk_ids", _json(), nullable=False, server_default="[]"),
            sa.Column("current_match", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("current_loadout", _json(), nullable=False, server_default="{}"),
            sa.Column("before_loadout", _json(), nullable=False, server_default="{}"),
            sa.Column("used_character_ids", _json(), nullable=False, server_default="{}"),
            sa.Column("checkpoint_loadout", _json(), nullable=False, server_default="{}"),
            sa.UniqueConstraint("user_id", "lane", "difficulty", name="uq_id_please_run_user_lane_difficulty"),
        )

    if "id_please_match_logs" not in tables:
        op.create_table(
            "id_please_match_logs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("run_id", sa.Integer(), sa.ForeignKey("id_please_runs.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("attempt", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("result", sa.String(20), nullable=False),
            sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), index=True),
            sa.Column("triggered_by", sa.String(20), nullable=False, server_default="player"),
            sa.Column("streak_before", sa.Integer(), nullable=False),
            sa.Column("streak_after", sa.Integer(), nullable=False),
            sa.Column("match_number", sa.Integer(), nullable=False),
            sa.Column("side", sa.String(10), nullable=False),
            sa.Column("character_id", sa.Integer(), nullable=False),
            sa.Column("perk_ids", _json(), nullable=False, server_default="[]"),
            sa.Column("roster_fingerprint", sa.String(64), nullable=False, server_default=""),
        )


def downgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "id_please_match_logs" in tables:
        op.drop_table("id_please_match_logs")
    if "id_please_runs" in tables:
        op.drop_table("id_please_runs")
