# backend/migrations/versions/perk_type_tarot_001.py
"""unify perk_type to Tarot archetype values

Revision ID: perk_type_tarot_001
Revises: perk_type_001
Create Date: 2026-09-27 00:00:00.000000

Replaces the Chaos-Mutator-specific perk_type vocabulary with a unified set of
Tarot archetype values shared by both the Chaos Wheel curse system and the new
Tarot Deck randomizer card assignment.

Old values: exhaustion, gen_slowdown, hex, boon, chase, aura_reading,
            altruism_healing, handicap, meme, general
New values: hex, boon, sacrifice, exhaustion, obsession, aura, generator,
            healing, chase, stealth, entity

Renames applied:
  aura_reading     -> aura
  gen_slowdown     -> generator
  altruism_healing -> healing
  handicap         -> sacrifice
  meme / general / NULL -> entity
  hex, boon, exhaustion, chase (unchanged)

Idempotent: guarded with sqlalchemy.inspect so create_app()'s unconditional
db.create_all() (which already uses the new values via the updated model) does
not cause upgrade() to fail on a fresh database.
"""
from alembic import op
import sqlalchemy as sa


revision = "perk_type_tarot_001"
down_revision = "perk_type_001"
branch_labels = None
depends_on = None

_CHECK_NAME = "ck_perks_perk_type"

_OLD_ALLOWED = (
    "exhaustion", "gen_slowdown", "hex", "boon", "chase",
    "aura_reading", "altruism_healing", "handicap", "meme", "general",
)
_NEW_ALLOWED = (
    "hex", "boon", "sacrifice", "exhaustion", "obsession",
    "aura", "generator", "healing", "chase", "stealth", "entity",
)


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    # 1. Drop old CHECK constraint if still present.
    existing_checks = {c["name"] for c in _inspector().get_check_constraints("perks")}
    if _CHECK_NAME in existing_checks:
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.drop_constraint(_CHECK_NAME, type_="check")

    # 2. Rename old values to new Tarot archetype values.
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE perks SET perk_type = 'aura'      WHERE perk_type = 'aura_reading'"))
    conn.execute(sa.text("UPDATE perks SET perk_type = 'generator' WHERE perk_type = 'gen_slowdown'"))
    conn.execute(sa.text("UPDATE perks SET perk_type = 'healing'   WHERE perk_type = 'altruism_healing'"))
    conn.execute(sa.text("UPDATE perks SET perk_type = 'sacrifice' WHERE perk_type = 'handicap'"))
    conn.execute(sa.text(
        "UPDATE perks SET perk_type = 'entity' "
        "WHERE perk_type IN ('meme', 'general') OR perk_type IS NULL"
    ))
    # hex, boon, exhaustion, chase remain unchanged.

    # 3. Add new CHECK constraint if not already present.
    existing_checks = {c["name"] for c in _inspector().get_check_constraints("perks")}
    if _CHECK_NAME not in existing_checks:
        allowed_sql = ", ".join(f"'{v}'" for v in _NEW_ALLOWED)
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.create_check_constraint(
                _CHECK_NAME,
                f"perk_type IS NULL OR perk_type IN ({allowed_sql})",
            )


def downgrade():
    # 1. Drop new CHECK constraint if present.
    existing_checks = {c["name"] for c in _inspector().get_check_constraints("perks")}
    if _CHECK_NAME in existing_checks:
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.drop_constraint(_CHECK_NAME, type_="check")

    # 2. Reverse the renames.
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE perks SET perk_type = 'aura_reading'     WHERE perk_type = 'aura'"))
    conn.execute(sa.text("UPDATE perks SET perk_type = 'gen_slowdown'     WHERE perk_type = 'generator'"))
    conn.execute(sa.text("UPDATE perks SET perk_type = 'altruism_healing' WHERE perk_type = 'healing'"))
    conn.execute(sa.text("UPDATE perks SET perk_type = 'handicap'         WHERE perk_type = 'sacrifice'"))
    conn.execute(sa.text("UPDATE perks SET perk_type = 'general'          WHERE perk_type = 'entity'"))
    # obsession, stealth have no old equivalent — set to 'general' as the safest fallback.
    conn.execute(sa.text("UPDATE perks SET perk_type = 'general' WHERE perk_type IN ('obsession', 'stealth')"))

    # 3. Restore old CHECK constraint if missing.
    existing_checks = {c["name"] for c in _inspector().get_check_constraints("perks")}
    if _CHECK_NAME not in existing_checks:
        allowed_sql = ", ".join(f"'{v}'" for v in _OLD_ALLOWED)
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.create_check_constraint(
                _CHECK_NAME,
                f"perk_type IS NULL OR perk_type IN ({allowed_sql})",
            )
