# backend/migrations/versions/drop_generator_tables_001.py
"""drop obsolete generator_settings and generator_drawn_perks tables

Revision ID: drop_generator_tables_001
Revises: enable_unaccent_001
Create Date: 2026-09-10 00:00:00.000000

The perk randomizer now operates 100% client-side via localStorage, eliminating
unnecessary database latency and global DB locks. These two tables are no longer
written or read by any application feature.

Idempotent: guarded with sqlalchemy.inspect.
"""
from alembic import op
import sqlalchemy as sa


revision = "drop_generator_tables_001"
down_revision = "enable_unaccent_001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    inspector = _inspector()
    if inspector.has_table("generator_settings"):
        op.drop_table("generator_settings")
    if inspector.has_table("generator_drawn_perks"):
        op.drop_table("generator_drawn_perks")


def downgrade():
    inspector = _inspector()
    if not inspector.has_table("generator_settings"):
        op.create_table(
            "generator_settings",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("role", sa.String(length=20), server_default="Survivor", nullable=False),
            sa.Column("gen_mode", sa.String(length=20), server_default="instant", nullable=False),
            sa.Column("no_repeat_perks", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("total_pages", sa.Integer(), server_default="12", nullable=False),
            sa.Column("perks_per_page", sa.Integer(), server_default="15", nullable=False),
            sa.Column("last_page_perks", sa.Integer(), server_default="8", nullable=False),
            sa.Column("spin_duration_sec", sa.Float(), server_default="3.0", nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
    if not inspector.has_table("generator_drawn_perks"):
        op.create_table(
            "generator_drawn_perks",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("role", sa.String(length=20), nullable=False),
            sa.Column("perk_name", sa.String(length=150), nullable=False),
            sa.Column("drawn_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("role", "perk_name", name="uq_drawn_role_perk"),
        )
