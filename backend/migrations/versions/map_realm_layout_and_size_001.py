# backend/migrations/versions/map_realm_layout_and_size_001.py
"""add layout_type, pallet_density, jungle_gyms_count, totem_spawns_count,
shack_has_basement, size_sq_tiles and size_sq_meters to map_realms

Revision ID: map_realm_layout_size_001
Revises: roster_created_at_001
Create Date: 2026-09-14 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect so that create_app()'s
unconditional db.create_all() (which already creates these columns on a
fresh database via the updated model) doesn't cause upgrade() to fail with
a duplicate column error.

Without this, an existing database's `map_realms` table keeps its old shape
forever -- create_all() only ever CREATEs tables that are absent, it never
ALTERs one that already exists -- so every map keeps reading back the
column's Python-side default (or NULL, for the two size fields, which have
none) instead of the real per-map values `app/seeds/data/content/maps.json`
now carries.
"""
from alembic import op
import sqlalchemy as sa


revision = "map_realm_layout_size_001"
down_revision = "roster_created_at_001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _columns() -> set[str]:
    return {c["name"] for c in _inspector().get_columns("map_realms")}


def upgrade():
    existing = _columns()
    to_add = []

    if "layout_type" not in existing:
        to_add.append(
            sa.Column(
                "layout_type", sa.String(length=50), server_default="Outdoor", nullable=False
            )
        )
    if "pallet_density" not in existing:
        to_add.append(
            sa.Column(
                "pallet_density", sa.String(length=50), server_default="Medium", nullable=False
            )
        )
    if "jungle_gyms_count" not in existing:
        to_add.append(
            sa.Column("jungle_gyms_count", sa.Integer(), server_default="3", nullable=False)
        )
    if "totem_spawns_count" not in existing:
        to_add.append(
            sa.Column("totem_spawns_count", sa.Integer(), server_default="5", nullable=False)
        )
    if "shack_has_basement" not in existing:
        to_add.append(
            sa.Column(
                "shack_has_basement", sa.Boolean(), server_default=sa.true(), nullable=False
            )
        )
    if "size_sq_tiles" not in existing:
        to_add.append(sa.Column("size_sq_tiles", sa.Float(), nullable=True))
    if "size_sq_meters" not in existing:
        to_add.append(sa.Column("size_sq_meters", sa.Integer(), nullable=True))

    if to_add:
        with op.batch_alter_table("map_realms", schema=None) as batch_op:
            for column in to_add:
                batch_op.add_column(column)


def downgrade():
    existing = _columns()
    to_drop = [
        name
        for name in (
            "size_sq_meters",
            "size_sq_tiles",
            "shack_has_basement",
            "totem_spawns_count",
            "jungle_gyms_count",
            "pallet_density",
            "layout_type",
        )
        if name in existing
    ]
    if to_drop:
        with op.batch_alter_table("map_realms", schema=None) as batch_op:
            for name in to_drop:
                batch_op.drop_column(name)
