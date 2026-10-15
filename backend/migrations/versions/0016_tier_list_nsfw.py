# backend/migrations/versions/0016_tier_list_nsfw.py
"""tier_lists: an NSFW flag, like the one smash or pass rosters already have

Revision ID: 0016_tier_list_nsfw
Revises: 0015_content_report_indexes
Create Date: 2026-10-15

Official tier lists can be marked as adult-oriented: the hub card gets an NSFW badge and the list
opens behind a confirmation. A database built after this change already has the column
(create_all() made the table), so the step only runs when it is still missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0016_tier_list_nsfw"
down_revision = "0015_content_report_indexes"
branch_labels = None
depends_on = None


def _columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if "tier_lists" not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns("tier_lists")}


def upgrade() -> None:
    columns = _columns()
    if not columns or "is_nsfw" in columns:
        return
    op.add_column("tier_lists", sa.Column("is_nsfw", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    if "is_nsfw" not in _columns():
        return
    with op.batch_alter_table("tier_lists") as batch:
        batch.drop_column("is_nsfw")
