# backend/migrations/versions/0036_id_please_perk_seed.py
"""store the hidden perk shuffle of an ID, Please run (Hardcore+ shuffles the order of the player's perks at every opening)

Revision ID: 0036_id_please_perk_seed
Revises: 0035_id_please_lanes
Create Date: 2026-10-28
"""
import sqlalchemy as sa
from alembic import op

revision = "0036_id_please_perk_seed"
down_revision = "0035_id_please_lanes"
branch_labels = None
depends_on = None

TABLE = "id_please_runs"
COLUMN = "perk_seed"


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return
    if COLUMN in {column["name"] for column in inspector.get_columns(TABLE)}:
        return
    with op.batch_alter_table(TABLE) as batch:
        batch.add_column(sa.Column(COLUMN, sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return
    if COLUMN not in {column["name"] for column in inspector.get_columns(TABLE)}:
        return
    with op.batch_alter_table(TABLE) as batch:
        batch.drop_column(COLUMN)
