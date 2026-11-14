# backend/migrations/versions/0046_map_photo_local_path.py
"""in-game photo of a map, next to its callout image

Revision ID: 0046_map_photo_local_path
Revises: 0045_merge_challenge_smash
Create Date: 2026-11-14

Tier lists and the Maps page show a photo of the map. The callout image stays: the map viewer still draws it. The
column holds only a static path, so adding it is a metadata change: no default, no rewrite of the table. A database
built after this change already has the column (create_all() made the table), so it is only added when it is missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0046_map_photo_local_path"
down_revision = "0045_merge_challenge_smash"
branch_labels = None
depends_on = None

TABLE = "map_realms"
COLUMN = "photo_local_path"


def _has_column() -> bool:
    return COLUMN in {column["name"] for column in sa.inspect(op.get_bind()).get_columns(TABLE)}


def upgrade() -> None:
    if not _has_column():
        op.add_column(TABLE, sa.Column(COLUMN, sa.String(255), nullable=True))


def downgrade() -> None:
    if _has_column():
        op.drop_column(TABLE, COLUMN)
