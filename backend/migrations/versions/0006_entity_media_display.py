# backend/migrations/versions/0006_entity_media_display.py
"""entities: a per-entity picture placement; the per-entity active flag and media type go

Revision ID: 0006_entity_media_display
Revises: 0005_match_totals
Create Date: 2026-10-09

`media_display` is a nullable JSON column for the few portraits the default card crop does not
suit (`{"fit": "contain", "position": "50% 40%"}`); every other row stays NULL.

`entities.is_active` is dropped because activity belongs to the roster: a roster is switched off
as a whole and an entity never was on its own (all 287 seeded rows were true, and the seeder
reset it to true on every run). `entities.media_type` is dropped because it was `'image'` on all
287 rows and nothing ever read it; the picture's kind is its file extension.

A database built after this change already has this shape (create_all() made the table), so
each column is only added or dropped when the table still disagrees.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0006_entity_media_display"
down_revision = "0005_match_totals"
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("entities")}
    if "media_display" not in existing:
        op.add_column(
            "entities",
            sa.Column("media_display", sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=True),
        )
    for name in ("is_active", "media_type"):
        if name in existing:
            op.drop_column("entities", name)


def downgrade() -> None:
    existing = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("entities")}
    if "is_active" not in existing:
        op.add_column("entities", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    if "media_type" not in existing:
        op.add_column(
            "entities", sa.Column("media_type", sa.String(length=16), nullable=False, server_default="image")
        )
    if "media_display" in existing:
        op.drop_column("entities", "media_display")
