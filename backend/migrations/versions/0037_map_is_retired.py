# backend/migrations/versions/0037_map_is_retired.py
"""mark maps taken out of the game (Lampkin Lane, Haddonfield): listed but greyed out and not opened

Revision ID: 0037_map_is_retired
Revises: 0036_id_please_perk_seed
Create Date: 2026-10-31
"""
import sqlalchemy as sa
from alembic import op

revision = "0037_map_is_retired"
down_revision = "0036_id_please_perk_seed"
branch_labels = None
depends_on = None

TABLE = "map_realms"
COLUMN = "is_retired"
#: Lampkin Lane (Haddonfield): the id the seed data gives it, checked against its name.
LAMPKIN_LANE_ID = 44


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return
    if COLUMN not in {column["name"] for column in inspector.get_columns(TABLE)}:
        with op.batch_alter_table(TABLE) as batch:
            batch.add_column(sa.Column(COLUMN, sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute(
        sa.text(f"UPDATE {TABLE} SET {COLUMN} = true WHERE id = :id AND name = 'Lampkin Lane'").bindparams(
            id=LAMPKIN_LANE_ID
        )
    )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return
    if COLUMN in {column["name"] for column in inspector.get_columns(TABLE)}:
        with op.batch_alter_table(TABLE) as batch:
            batch.drop_column(COLUMN)
