# backend/migrations/versions/minigames_001.py
"""add minigames: daily challenges, repeatable generators, shared links, and user stats

Revision ID: minigames_001
Revises: merge_tier_lists_perk_tarot_001
Create Date: 2026-09-29 00:00:00.000000

Idempotent: DatabaseService().init_db() runs create_all() on fresh boots,
so if tables already exist, this upgrade is a safe no-op.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "minigames_001"
down_revision = "perk_type_hooks_001"
branch_labels = None
depends_on = None


def _json_type():
    return postgresql.JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade():
    inspector = sa.inspect(op.get_bind())
    existing_tables = set(inspector.get_table_names())

    if "minigame_daily_challenges" not in existing_tables:
        op.create_table(
            "minigame_daily_challenges",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("challenge_date", sa.Date(), nullable=False),
            sa.Column("game_mode", sa.String(length=50), nullable=False),
            sa.Column("title", sa.String(length=150), nullable=False),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("rounds", _json_type(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("challenge_date", "game_mode", name="uq_minigame_daily_date_mode"),
        )
        op.create_index("ix_minigame_daily_challenges_challenge_date", "minigame_daily_challenges", ["challenge_date"])
        op.create_index("ix_minigame_daily_challenges_game_mode", "minigame_daily_challenges", ["game_mode"])
        op.create_index("ix_minigame_daily_date_active", "minigame_daily_challenges", ["challenge_date", "is_active"])

    if "minigame_repeatable_challenges" not in existing_tables:
        op.create_table(
            "minigame_repeatable_challenges",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("session_id", sa.String(length=64), nullable=False),
            sa.Column("game_mode", sa.String(length=50), nullable=False),
            sa.Column("title", sa.String(length=150), nullable=False, server_default="Repeatable Challenge"),
            sa.Column("rounds", _json_type(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_minigame_repeatable_challenges_session_id", "minigame_repeatable_challenges", ["session_id"])
        op.create_index("ix_minigame_repeatable_challenges_expires_at", "minigame_repeatable_challenges", ["expires_at"])

    if "minigame_shared_links" not in existing_tables:
        op.create_table(
            "minigame_shared_links",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("short_code", sa.String(length=16), nullable=False),
            sa.Column("creator_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("payload", _json_type(), nullable=False),
            sa.Column("views_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_minigame_shared_links_short_code", "minigame_shared_links", ["short_code"], unique=True)
        op.create_index("ix_minigame_shared_links_creator_user_id", "minigame_shared_links", ["creator_user_id"])

    if "minigame_user_stats" not in existing_tables:
        op.create_table(
            "minigame_user_stats",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("game_mode", sa.String(length=50), nullable=False),
            sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("max_streak", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("total_played", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("total_won", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("guess_distribution", _json_type(), nullable=False),
            sa.Column("last_played_date", sa.Date(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("user_id", "game_mode", name="uq_minigame_user_mode_stat"),
        )
        op.create_index("ix_minigame_user_stats_user_id", "minigame_user_stats", ["user_id"])


def downgrade():
    op.drop_table("minigame_user_stats")
    op.drop_table("minigame_shared_links")
    op.drop_table("minigame_repeatable_challenges")
    op.drop_table("minigame_daily_challenges")
