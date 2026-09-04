# backend/migrations/versions/user_showcase_001.py
"""add user_showcases table for player profile campfire dossier

Revision ID: user_showcase_001
Revises: map_translations_001
Create Date: 2026-09-04 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect so that stamping at an earlier
baseline and re-running upgrade() against a database that already has this
table is a safe no-op.
"""
from alembic import op
import sqlalchemy as sa


revision = "user_showcase_001"
down_revision = "map_translations_001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    inspector = _inspector()

    if not inspector.has_table("user_showcases"):
        op.create_table(
            "user_showcases",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("player_title", sa.String(length=100), server_default="The Fogwalker", nullable=False),
            sa.Column("devotion_level", sa.Integer(), server_default="14", nullable=False),
            sa.Column("grade_rank", sa.String(length=50), server_default="Iridescent I", nullable=False),
            sa.Column("survivor_main_character", sa.String(length=100), server_default="Feng Min", nullable=False),
            sa.Column("survivor_main_prestige", sa.Integer(), server_default="9", nullable=False),
            sa.Column("survivor_perk_ids", sa.JSON(), server_default="[]", nullable=False),
            sa.Column("killer_main_character", sa.String(length=100), server_default="The Blight", nullable=False),
            sa.Column("killer_main_prestige", sa.Integer(), server_default="7", nullable=False),
            sa.Column("killer_perk_ids", sa.JSON(), server_default="[]", nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.UniqueConstraint("user_id", name="uq_user_showcases_user_id"),
        )
        inspector = _inspector()

    indexes = {ix["name"] for ix in inspector.get_indexes("user_showcases")}
    if "ix_user_showcases_user_id" not in indexes:
        op.create_index("ix_user_showcases_user_id", "user_showcases", ["user_id"])


def downgrade():
    inspector = _inspector()
    if inspector.has_table("user_showcases"):
        op.drop_table("user_showcases")
