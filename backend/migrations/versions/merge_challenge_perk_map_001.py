# backend/migrations/versions/merge_challenge_perk_map_001.py
"""merge heads: challenge_json_columns + merge_perk_map

`challenge_json_columns_001` (challenge run JSON->JSONB columns) and
`merge_perk_map_001` (itself a merge of `perk_type_001` and
`map_restore_pallet_density_001`) both branched off `perk_type_001`
independently -- one from the `develop` history, one from a feature
branch -- leaving two unmerged heads once the branches came together.
They touch unrelated tables (challenge run tables vs. perks/map_realms)
and don't conflict, so this is a plain no-op merge point with nothing
further to apply.

Revision ID: merge_challenge_perk_map_001
Revises: challenge_json_columns_001, merge_perk_map_001
Create Date: 2026-09-20 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "merge_challenge_perk_map_001"
down_revision = ("challenge_json_columns_001", "merge_perk_map_001")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
