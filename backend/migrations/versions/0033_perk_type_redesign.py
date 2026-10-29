# backend/migrations/versions/0033_perk_type_redesign.py
"""perks: rename `aura` to `tracking`, merge `hex` and `boon` into `totem`

Revision ID: 0033_perk_type_redesign
Revises: 0032_user_preferences
Create Date: 2026-10-28

The category redesign renames two perk types and merges two others. The seed
file already carries the new assignment for every perk, so a boot re-imports it
by id; this migration exists so a database never holds a type the application
no longer knows, in between and for rows an admin edited by hand.

Only the three renames are applied here. The new types (`downed`, `items`,
`endgame`) and `entity` as a combinable type need no rewriting.

Known limit: `entity` used to be the "other" bucket and now means "blocks
things". A row that still holds it from before (a perk outside the seed, an old
backup) cannot be told apart from a blocking perk, so it keeps the type until
someone reclassifies it; perks in the seed file are rewritten on boot.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0033_perk_type_redesign"
down_revision = "0032_user_preferences"
branch_labels = None
depends_on = None

_RENAMES = {"aura": "tracking", "hex": "totem", "boon": "totem"}
# `totem` splits back by the perk's side, the way hex/boon were.
_TOTEM_BY_ROLE = {"Killer": "hex", "Survivor": "boon"}
_NEW_ONLY = {"downed", "items", "endgame"}


def _json() -> sa.types.TypeEngine:
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def _perks() -> sa.Table:
    return sa.table(
        "perks",
        sa.column("id", sa.Integer),
        sa.column("role", sa.String),
        sa.column("perk_types", _json()),
    )


def _rewrite(convert) -> None:
    bind = op.get_bind()
    perks = _perks()
    for row in bind.execute(sa.select(perks.c.id, perks.c.role, perks.c.perk_types)).all():
        old = list(row.perk_types or [])
        converted = convert(old, row.role)
        new = [t for i, t in enumerate(converted) if t not in converted[:i]] or ["entity"]
        if new != old:
            bind.execute(perks.update().where(perks.c.id == row.id).values(perk_types=new))


def upgrade() -> None:
    _rewrite(lambda types, _role: [_RENAMES.get(t, t) for t in types])


def downgrade() -> None:
    reverse = {"tracking": "aura"}

    def convert(types: list[str], role: str | None) -> list[str]:
        old = [
            _TOTEM_BY_ROLE.get(role or "Survivor", "boon") if t == "totem" else reverse.get(t, t)
            for t in types
            if t not in _NEW_ONLY and not (t == "hooks" and role != "Killer")  # hooks was Killer-only
        ]
        # `entity` could only stand alone before the redesign.
        return old if old == ["entity"] else [t for t in old if t != "entity"]

    _rewrite(convert)
