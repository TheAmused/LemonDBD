# backend/migrations/versions/0043_roster_portrait_offset_y.py
"""rosters.portrait_offset_y: pixels the portraits of a roster are shifted down on their cards (canon: 40)

Revision ID: 0043_roster_portrait_offset_y
Revises: 0042_drop_smash_taxonomies
Create Date: 2026-11-04
"""
import sqlalchemy as sa
from alembic import op

revision = "0043_roster_portrait_offset_y"
down_revision = "0042_drop_smash_taxonomies"
branch_labels = None
depends_on = None

TABLE = "rosters"
COLUMN = "portrait_offset_y"
#: Canon's cutouts fade out about 27 px (of 512) above their bottom edge; 40 card pixels push that out.
CANON_OFFSET = 40


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return
    if COLUMN not in {column["name"] for column in inspector.get_columns(TABLE)}:
        with op.batch_alter_table(TABLE) as batch:
            batch.add_column(sa.Column(COLUMN, sa.Integer(), nullable=False, server_default="0"))
    op.execute(sa.text(f"UPDATE {TABLE} SET {COLUMN} = :offset WHERE slug = 'canon'").bindparams(offset=CANON_OFFSET))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return
    if COLUMN in {column["name"] for column in inspector.get_columns(TABLE)}:
        with op.batch_alter_table(TABLE) as batch:
            batch.drop_column(COLUMN)
