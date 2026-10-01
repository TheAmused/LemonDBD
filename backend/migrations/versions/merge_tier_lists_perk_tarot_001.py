# backend/migrations/versions/merge_tier_lists_perk_tarot_001.py
"""merge heads: tier_lists + perk_type_tarot

`tier_lists_001` (new tier_lists table, from this branch) and
`perk_type_tarot_001` (unify perk_type to Tarot archetype values, from
`develop`) both branched off `perk_type_001`'s downstream chain
independently -- one adding a new table, the other rewriting the
`perks.perk_type` check constraint -- leaving two unmerged heads once the
branches came together. They touch unrelated tables (tier_lists vs. perks)
and don't conflict, so this is a plain no-op merge point with nothing
further to apply.

Revision ID: merge_tier_lists_perk_tarot_001
Revises: tier_lists_001, perk_type_tarot_001
Create Date: 2026-09-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "merge_tier_lists_perk_tarot_001"
down_revision = ("tier_lists_001", "perk_type_tarot_001")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
