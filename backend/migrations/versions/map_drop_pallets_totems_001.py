# backend/migrations/versions/map_drop_pallets_totems_001.py
"""drop map_realms.pallet_density and map_realms.totem_spawns_count

Revision ID: map_drop_pallets_totems_001
Revises: map_realm_structures_001
Create Date: 2026-09-17 00:00:00.000000

Neither value is shown anywhere in the app any more, and both held a single
seeded default for almost every map, so they carried no information worth
keeping. `jungle_gyms_count` stays: it is hidden in the UI but still served.

Idempotent for the same reason as the earlier map migrations: create_all()
may already have built the new shape on a fresh database.
"""
from alembic import op
import sqlalchemy as sa


revision = "map_drop_pallets_totems_001"
down_revision = "map_realm_structures_001"
branch_labels = None
depends_on = None


def _columns() -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns("map_realms")}


def upgrade():
    existing = _columns()

    with op.batch_alter_table("map_realms", schema=None) as batch_op:
        if "pallet_density" in existing:
            batch_op.drop_column("pallet_density")
        if "totem_spawns_count" in existing:
            batch_op.drop_column("totem_spawns_count")


def downgrade():
    existing = _columns()

    with op.batch_alter_table("map_realms", schema=None) as batch_op:
        if "pallet_density" not in existing:
            batch_op.add_column(
                sa.Column(
                    "pallet_density", sa.String(length=50), server_default="Medium", nullable=False
                )
            )
        if "totem_spawns_count" not in existing:
            batch_op.add_column(
                sa.Column(
                    "totem_spawns_count", sa.Integer(), server_default="5", nullable=False
                )
            )
