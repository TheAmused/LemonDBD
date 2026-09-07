# backend/migrations/versions/enable_unaccent_extension_001.py
"""enable the unaccent Postgres extension for accent-insensitive search

Revision ID: enable_unaccent_001
Revises: drop_legacy_smash_pass_001
Create Date: 2026-09-07 00:00:00.000000

Lets perk/character autocomplete filter accent- and punctuation-insensitively
at the SQL level (matching the existing Python-side normalize_search_key
behavior) instead of fetching the entire table and filtering in Python on
every request. No-op on SQLite (used by the unit test suite) -- the ORM code
that uses `unaccent()` only builds that expression when the active dialect is
postgresql, so SQLite never needs the extension.
"""
from alembic import op


revision = "enable_unaccent_001"
down_revision = "drop_legacy_smash_pass_001"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name in ("postgresql", "postgres"):
        op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name in ("postgresql", "postgres"):
        op.execute("DROP EXTENSION IF EXISTS unaccent")
