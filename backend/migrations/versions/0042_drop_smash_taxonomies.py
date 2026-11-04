# backend/migrations/versions/0042_drop_smash_taxonomies.py
"""drop smash_taxonomies: the shared role/gender list nothing reads any more

Revision ID: 0042_drop_smash_taxonomies
Revises: 0041_rename_cyberpunk_slug
Create Date: 2026-11-04

The Smash or Pass filters and the roster creator take their roles and genders from the roster
itself (official rosters use Survivor/Killer and female/male/monster_other), so the admin-only
term list and its /taxonomies endpoints are gone. Downgrade recreates the empty table; the old
service seeded its defaults on first read, so nothing else needs restoring.
"""
import sqlalchemy as sa
from alembic import op

revision = "0042_drop_smash_taxonomies"
down_revision = "0041_rename_cyberpunk_slug"
branch_labels = None
depends_on = None

TABLE = "smash_taxonomies"


def upgrade() -> None:
    if TABLE in sa.inspect(op.get_bind()).get_table_names():
        op.drop_table(TABLE)


def downgrade() -> None:
    if TABLE in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        TABLE,
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("type", sa.String(16), nullable=False),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("slug", sa.String(64), nullable=False),
        sa.Column("is_predefined", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("type", "slug", name="uq_smash_taxonomies_type_slug"),
    )
    op.create_index("idx_smash_taxonomies_type", TABLE, ["type"])
