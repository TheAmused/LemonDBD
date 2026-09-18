# backend/migrations/versions/perk_curse_category_001.py
"""add curse_category to perks

Revision ID: perk_curse_category_001
Revises: map_drop_pallets_totems_001
Create Date: 2026-09-18 00:00:00.000000

Adds a nullable `curse_category` column to `perks`, classifying each perk
into exactly one Chaos Wheel curse bucket (exhaustion, gen_slowdown, hex,
boon, chase, aura_reading, altruism_healing, handicap, meme, general). This
replaces the frontend's hardcoded perk-name lists / description-keyword
matching in the Chaos Wheel curse system with a real, server-owned field.

Idempotent: guarded with sqlalchemy.inspect so create_app()'s unconditional
db.create_all() (which already creates this column on a fresh database via
the updated model) doesn't cause upgrade() to fail with a duplicate column
error.
"""
from alembic import op
import sqlalchemy as sa


revision = "perk_curse_category_001"
down_revision = "map_drop_pallets_totems_001"
branch_labels = None
depends_on = None

_CHECK_NAME = "ck_perks_curse_category"
_ALLOWED = (
    "exhaustion", "gen_slowdown", "hex", "boon", "chase",
    "aura_reading", "altruism_healing", "handicap", "meme", "general",
)


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    columns = {c["name"] for c in _inspector().get_columns("perks")}
    if "curse_category" not in columns:
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.add_column(sa.Column("curse_category", sa.String(length=30), nullable=True))

    existing_checks = {c["name"] for c in _inspector().get_check_constraints("perks")}
    if _CHECK_NAME not in existing_checks:
        allowed_sql = ", ".join(f"'{value}'" for value in _ALLOWED)
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.create_check_constraint(
                _CHECK_NAME,
                f"curse_category IS NULL OR curse_category IN ({allowed_sql})",
            )


def downgrade():
    existing_checks = {c["name"] for c in _inspector().get_check_constraints("perks")}
    if _CHECK_NAME in existing_checks:
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.drop_constraint(_CHECK_NAME, type_="check")

    columns = {c["name"] for c in _inspector().get_columns("perks")}
    if "curse_category" in columns:
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.drop_column("curse_category")
