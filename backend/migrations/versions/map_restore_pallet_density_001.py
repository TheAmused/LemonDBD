# backend/migrations/versions/map_restore_pallet_density_001.py
"""restore map_realms.pallet_density

Revision ID: map_restore_pallet_density_001
Revises: map_drop_pallets_totems_001
Create Date: 2026-09-17 00:00:00.000000

`map_drop_pallets_totems_001` dropped this column together with
`totem_spawns_count`, but only the totem count was meant to go. The value is
still hidden everywhere in the UI; it stays in the database and the API the
way `jungle_gyms_count` does. Rows come back at the "Medium" default and the
real per-map values are restored from `app/seeds/data/content/maps.json` on
the next seed sync, which runs on container start.

Idempotent for the same reason as the earlier map migrations: create_all()
may already have built the new shape on a fresh database.
"""
from alembic import op
import sqlalchemy as sa


revision = "map_restore_pallet_density_001"
down_revision = "map_drop_pallets_totems_001"
branch_labels = None
depends_on = None


def _columns() -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns("map_realms")}


def upgrade():
    if "pallet_density" not in _columns():
        with op.batch_alter_table("map_realms", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "pallet_density", sa.String(length=50), server_default="Medium", nullable=False
                )
            )


def downgrade():
    if "pallet_density" in _columns():
        with op.batch_alter_table("map_realms", schema=None) as batch_op:
            batch_op.drop_column("pallet_density")
