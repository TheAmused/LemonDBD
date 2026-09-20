# backend/migrations/versions/merge_perk_map_001.py
"""merge heads: perk_type + map_restore_pallet_density

Revision ID: merge_perk_map_001
Revises: perk_type_001, map_restore_pallet_density_001
Create Date: 2026-09-19 00:00:00.000000

`perk_type_001` (adds `perks.perk_type`) and `map_restore_pallet_density_001`
(restores `map_realms.pallet_density`) were both branched off the same
parent (`map_drop_pallets_totems_001`) independently, leaving two unmerged
heads. They touch unrelated tables and don't conflict, so this is a plain
no-op merge point with nothing further to apply.
"""
from alembic import op
import sqlalchemy as sa


revision = "merge_perk_map_001"
down_revision = ("perk_type_001", "map_restore_pallet_density_001")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
