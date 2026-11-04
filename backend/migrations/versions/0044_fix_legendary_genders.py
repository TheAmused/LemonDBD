# backend/migrations/versions/0044_fix_legendary_genders.py
"""Legendary Characters: Miss Fuchi is female, True Form Dracula is a monster/eldritch (monster_other)

Revision ID: 0044_fix_legendary_genders
Revises: 0043_roster_portrait_offset_y
Create Date: 2026-11-04
"""
import sqlalchemy as sa
from alembic import op

revision = "0044_fix_legendary_genders"
down_revision = "0043_roster_portrait_offset_y"
branch_labels = None
depends_on = None

ROSTER = "legendary_characters"
#: entity slug -> (gender before, gender after)
CHANGES = {
    "artist_miss_fuchi": ("monster_other", "female"),
    "true_form_dracula": ("male", "monster_other"),
}


def _set_genders(to_new: bool) -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if not {"rosters", "entities"} <= tables:
        return
    for slug, (before, after) in CHANGES.items():
        old, new = (before, after) if to_new else (after, before)
        op.execute(
            sa.text(
                "UPDATE entities SET gender = :new WHERE slug = :slug AND gender = :old "
                "AND roster_id IN (SELECT id FROM rosters WHERE slug = :roster)"
            ).bindparams(new=new, old=old, slug=slug, roster=ROSTER)
        )


def upgrade() -> None:
    _set_genders(to_new=True)


def downgrade() -> None:
    _set_genders(to_new=False)
