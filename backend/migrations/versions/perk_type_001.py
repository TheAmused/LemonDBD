# backend/migrations/versions/perk_type_001.py
"""add perk_type to perks

Revision ID: perk_type_001
Revises: map_restore_pallet_density_001
Create Date: 2026-09-18 00:00:00.000000

Adds a nullable `perk_type` column to `perks`, classifying each perk into
exactly one Chaos Wheel curse bucket (exhaustion, gen_slowdown, hex, boon,
chase, aura_reading, altruism_healing, handicap, meme, general). This
replaces the frontend's hardcoded perk-name lists / description-keyword
matching in the Chaos Wheel curse system with a real, server-owned field.

Named `perk_type` (not the internal working name this column briefly had
during development) to avoid confusion with the pre-existing `category` alias
`Perk.to_dict()` emits for `role` -- two unrelated concepts should not have
near-identical names.

Idempotent: guarded with sqlalchemy.inspect so create_app()'s unconditional
db.create_all() (which already creates this column on a fresh database via
the updated model) doesn't cause upgrade() to fail with a duplicate column
error.
"""
from alembic import op
import sqlalchemy as sa


revision = "perk_type_001"
down_revision = "map_restore_pallet_density_001"
branch_labels = None
depends_on = None

_CHECK_NAME = "ck_perks_perk_type"
_ALLOWED = (
    "exhaustion", "gen_slowdown", "hex", "boon", "chase",
    "aura_reading", "altruism_healing", "handicap", "meme", "general",
)


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    columns = {c["name"] for c in _inspector().get_columns("perks")}
    if "perk_type" not in columns:
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.add_column(sa.Column("perk_type", sa.String(length=30), nullable=True))

    existing_checks = {c["name"] for c in _inspector().get_check_constraints("perks")}
    if _CHECK_NAME not in existing_checks:
        allowed_sql = ", ".join(f"'{value}'" for value in _ALLOWED)
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.create_check_constraint(
                _CHECK_NAME,
                f"perk_type IS NULL OR perk_type IN ({allowed_sql})",
            )


def downgrade():
    existing_checks = {c["name"] for c in _inspector().get_check_constraints("perks")}
    if _CHECK_NAME in existing_checks:
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.drop_constraint(_CHECK_NAME, type_="check")

    columns = {c["name"] for c in _inspector().get_columns("perks")}
    if "perk_type" in columns:
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.drop_column("perk_type")
