# backend/migrations/versions/map_realm_structures_001.py
"""replace map_realms.shack_has_basement with is_shack and is_main_building

Revision ID: map_realm_structures_001
Revises: map_realm_layout_size_001
Create Date: 2026-09-16 00:00:00.000000

Basement tracking is dropped entirely. The two new flags record which
landmark structures a map has. `is_shack` is backfilled from the old column
(every map without a basement shack has no shack at all); `is_main_building`
starts false and gets its real per-map values from
`app/seeds/data/content/maps.json` on the next seed sync.

Idempotent for the same reason as map_realm_layout_size_001: create_all()
may already have built the new shape on a fresh database.
"""
from alembic import op
import sqlalchemy as sa


revision = "map_realm_structures_001"
down_revision = "map_realm_layout_size_001"
branch_labels = None
depends_on = None


def _columns() -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns("map_realms")}


def upgrade():
    existing = _columns()

    with op.batch_alter_table("map_realms", schema=None) as batch_op:
        if "is_shack" not in existing:
            batch_op.add_column(
                sa.Column("is_shack", sa.Boolean(), server_default=sa.true(), nullable=False)
            )
        if "is_main_building" not in existing:
            batch_op.add_column(
                sa.Column(
                    "is_main_building", sa.Boolean(), server_default=sa.false(), nullable=False
                )
            )

    if "shack_has_basement" in existing:
        op.execute("UPDATE map_realms SET is_shack = shack_has_basement")
        with op.batch_alter_table("map_realms", schema=None) as batch_op:
            batch_op.drop_column("shack_has_basement")


def downgrade():
    existing = _columns()

    with op.batch_alter_table("map_realms", schema=None) as batch_op:
        if "shack_has_basement" not in existing:
            batch_op.add_column(
                sa.Column(
                    "shack_has_basement", sa.Boolean(), server_default=sa.true(), nullable=False
                )
            )

    if "is_shack" in existing:
        op.execute("UPDATE map_realms SET shack_has_basement = is_shack")

    with op.batch_alter_table("map_realms", schema=None) as batch_op:
        for name in ("is_main_building", "is_shack"):
            if name in existing:
                batch_op.drop_column(name)
