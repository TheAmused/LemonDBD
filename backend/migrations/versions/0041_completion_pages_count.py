# backend/migrations/versions/0041_completion_pages_count.py
"""how many pages of perks a Page Streak clear was played on

Revision ID: 0041_completion_pages_count
Revises: 0040_attempt_matches
Create Date: 2026-11-06

The pool of a Page Streak run grows as the player unlocks perks, so a killer cleared on 3 pages and one cleared on 8
are different clears. The record keeps the count. Clears from before it was kept stay empty: the number cannot be
recovered. A database built after this change already has the column (create_all() made the table), so it is only
added when it is missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0041_completion_pages_count"
down_revision = "0040_attempt_matches"
branch_labels = None
depends_on = None

TABLE = "challenge_completion_records"
COLUMN = "pages_count"


def _has_column() -> bool:
    return COLUMN in {column["name"] for column in sa.inspect(op.get_bind()).get_columns(TABLE)}


def upgrade() -> None:
    if not _has_column():
        op.add_column(TABLE, sa.Column(COLUMN, sa.Integer(), nullable=True))


def downgrade() -> None:
    if _has_column():
        op.drop_column(TABLE, COLUMN)
