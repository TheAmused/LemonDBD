# backend/migrations/versions/perk_type_hooks_001.py
"""add 'hooks' to the perk_type CHECK constraint

Revision ID: perk_type_hooks_001
Revises: merge_tier_lists_perk_tarot_001
Create Date: 2026-09-28 00:00:00.000000

Adds a twelfth Tarot archetype, 'hooks' (The Hanged Man), used by the Scourge Hook
killer perks. Only the CHECK constraint changes; perk rows are (re)classified
by the perks.json seed.

Idempotent: guarded with sqlalchemy.inspect so create_app()'s unconditional
db.create_all() does not cause upgrade() to fail on a fresh database.
"""
from alembic import op
import sqlalchemy as sa


revision = "perk_type_hooks_001"
down_revision = "merge_tier_lists_perk_tarot_001"
branch_labels = None
depends_on = None

_CHECK_NAME = "ck_perks_perk_type"

_OLD_ALLOWED = (
    "hex", "boon", "sacrifice", "exhaustion", "obsession",
    "aura", "generator", "healing", "chase", "stealth", "entity",
)
_NEW_ALLOWED = _OLD_ALLOWED + ("hooks",)


def _existing_checks() -> dict[str, str]:
    inspector = sa.inspect(op.get_bind())
    return {c["name"]: c.get("sqltext") or "" for c in inspector.get_check_constraints("perks")}


def _replace_check(allowed: tuple[str, ...]) -> None:
    if _CHECK_NAME in _existing_checks():
        with op.batch_alter_table("perks", schema=None) as batch_op:
            batch_op.drop_constraint(_CHECK_NAME, type_="check")
    allowed_sql = ", ".join(f"'{v}'" for v in allowed)
    with op.batch_alter_table("perks", schema=None) as batch_op:
        batch_op.create_check_constraint(
            _CHECK_NAME,
            f"perk_type IS NULL OR perk_type IN ({allowed_sql})",
        )


def upgrade():
    if "'hooks'" in _existing_checks().get(_CHECK_NAME, ""):
        return
    _replace_check(_NEW_ALLOWED)


def downgrade():
    op.get_bind().execute(sa.text("UPDATE perks SET perk_type = 'entity' WHERE perk_type = 'hooks'"))
    _replace_check(_OLD_ALLOWED)
