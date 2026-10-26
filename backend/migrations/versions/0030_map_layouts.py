# backend/migrations/versions/0030_map_layouts.py
"""map_realms.layout: each map's footprint in metres, drawn by the frontend

Revision ID: 0030_map_layouts
Revises: 0029_hash_reset_tokens
Create Date: 2026-10-24

`layout` is a nullable JSON column holding one entry per floor: outline rings in metres traced
from the current wiki.gg outline on the 8 m (sqT) grid. Maps without a published to-scale
outline keep NULL and the frontend falls back to the callout image. The rows themselves arrive
from `maps.json` through the seed update on the next boot.

A database built after this change already has the column (create_all() made the table), so it
is only added when the table still lacks it.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0030_map_layouts"
down_revision = "0029_hash_reset_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("map_realms")}
    if "layout" not in existing:
        op.add_column(
            "map_realms",
            sa.Column("layout", sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=True),
        )


def downgrade() -> None:
    existing = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("map_realms")}
    if "layout" in existing:
        op.drop_column("map_realms", "layout")
