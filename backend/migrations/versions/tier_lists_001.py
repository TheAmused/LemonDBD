# backend/migrations/versions/tier_lists_001.py
"""add tier_lists: official tier-list templates for the /tier-lists hub

Revision ID: tier_lists_001
Revises: merge_challenge_perk_map_001
Create Date: 2026-09-26 00:00:00.000000

Idempotent, like the rest of the chain: `create_app()` runs `db.create_all()`
before Alembic on every boot, so on a fresh volume the table already exists
(built from `app/models/tier_list.py`) by the time `upgrade()` runs, and this
must be a no-op rather than a duplicate-table error.

The five built-in rows are not inserted here. They are seed content
(`app/seeds/data/content/tier_lists.json`), and `apply_pending_updates()`
imports a new seed file on the next boot, on both fresh and existing
databases -- one writer for seed data, as everywhere else.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "tier_lists_001"
down_revision = "merge_challenge_perk_map_001"
branch_labels = None
depends_on = None


def _json_type():
    return postgresql.JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade():
    inspector = sa.inspect(op.get_bind())
    if "tier_lists" in inspector.get_table_names():
        return

    op.create_table(
        "tier_lists",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("cover_image_url", sa.String(length=500), nullable=True),
        sa.Column("tiers", _json_type(), nullable=True),
        sa.Column("item_ids", _json_type(), nullable=True),
        sa.Column("custom_items", _json_type(), nullable=True),
        sa.Column("default_placements", _json_type(), nullable=True),
        sa.Column("translations", _json_type(), nullable=True),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "kind IN ('survivor_perks', 'killer_perks', 'survivors', 'killers', 'maps', 'custom')",
            name="ck_tier_lists_kind",
        ),
    )
    op.create_index("ix_tier_lists_slug", "tier_lists", ["slug"], unique=True)
    op.create_index("ix_tier_lists_kind", "tier_lists", ["kind"])
    op.create_index("ix_tier_lists_is_active", "tier_lists", ["is_active"])


def downgrade():
    inspector = sa.inspect(op.get_bind())
    if "tier_lists" in inspector.get_table_names():
        op.drop_index("ix_tier_lists_is_active", table_name="tier_lists")
        op.drop_index("ix_tier_lists_kind", table_name="tier_lists")
        op.drop_index("ix_tier_lists_slug", table_name="tier_lists")
        op.drop_table("tier_lists")
