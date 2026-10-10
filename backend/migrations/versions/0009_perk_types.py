# backend/migrations/versions/0009_perk_types.py
"""perks: `perk_type` (one string) becomes `perk_types` (an ordered list)

Revision ID: 0009_perk_types
Revises: 0008_smash_preference_sounds
Create Date: 2026-10-10

A perk can be several things at once -- Deja Vu reads auras and speeds up repairs -- so the single
`perk_type` string is replaced by `perk_types`, a JSON array of one to three types whose first
entry is the primary one. Every existing perk becomes a one-entry list holding its old type (no
type at all meant the catch-all, so it becomes ['entity']); the CHECK on the old column goes with
it. The list's own rules (valid types, no repeats, 'entity' only alone, role-only types) cannot be
a portable CHECK on a JSON array and are enforced by pydantic -- see app/models/perk_types.py.

A database built after this change already has `perk_types` and never had `perk_type` (create_all()
made the table), so each step only runs when it is needed.

Downgrade keeps the first entry as `perk_type`; any further types are lost.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0009_perk_types"
down_revision = "0008_smash_preference_sounds"
branch_labels = None
depends_on = None

_CHECK_NAME = "ck_perks_perk_type"
_CHECK_SQL = (
    "perk_type IS NULL OR perk_type IN ("
    "'hex', 'boon', 'sacrifice', 'exhaustion', 'obsession', "
    "'aura', 'generator', 'healing', 'chase', 'stealth', 'entity', 'hooks')"
)


def _json() -> sa.types.TypeEngine:
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def _perk_columns() -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns("perks")}


def _check_names() -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_check_constraints("perks") if c.get("name")}


def upgrade() -> None:
    bind = op.get_bind()
    columns = _perk_columns()

    if "perk_types" not in columns:
        op.add_column("perks", sa.Column("perk_types", _json(), nullable=True))

    perks = sa.table("perks", sa.column("perk_type", sa.String), sa.column("perk_types", _json()))
    if "perk_type" in columns:
        old_values = [row[0] for row in bind.execute(sa.select(perks.c.perk_type).distinct())]
        for old in old_values:
            where = perks.c.perk_type.is_(None) if old is None else perks.c.perk_type == old
            bind.execute(
                perks.update()
                .where(where, perks.c.perk_types.is_(None))
                .values(perk_types=[old] if old else ["entity"])
            )
    bind.execute(perks.update().where(perks.c.perk_types.is_(None)).values(perk_types=["entity"]))

    drop_check = _CHECK_NAME in _check_names()
    with op.batch_alter_table("perks") as batch:
        batch.alter_column("perk_types", existing_type=_json(), nullable=False)
        if drop_check:
            batch.drop_constraint(_CHECK_NAME, type_="check")
        if "perk_type" in columns:
            batch.drop_column("perk_type")


def downgrade() -> None:
    bind = op.get_bind()
    columns = _perk_columns()

    if "perk_type" not in columns:
        op.add_column("perks", sa.Column("perk_type", sa.String(30), nullable=True))

    if "perk_types" in columns:
        perks = sa.table(
            "perks", sa.column("id", sa.Integer), sa.column("perk_type", sa.String), sa.column("perk_types", _json())
        )
        for perk_id, types in bind.execute(sa.select(perks.c.id, perks.c.perk_types)).all():
            bind.execute(perks.update().where(perks.c.id == perk_id).values(perk_type=(types or ["entity"])[0]))

    with op.batch_alter_table("perks") as batch:
        if _CHECK_NAME not in _check_names():
            batch.create_check_constraint(_CHECK_NAME, _CHECK_SQL)
        if "perk_types" in columns:
            batch.drop_column("perk_types")
