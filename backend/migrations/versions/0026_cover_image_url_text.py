# backend/migrations/versions/0026_cover_image_url_text.py
"""tier_lists, rosters, entities: widen image URLs from VARCHAR to TEXT

Revision ID: 0026_cover_image_url_text
Revises: 0025_changelog_edited_discord
Create Date: 2026-10-19

Base64 data URIs can be up to 131,072 characters, which overflows VARCHAR(500)
and VARCHAR(512). Widen cover_image_url on tier_lists and rosters, plus media_url
on entities, to TEXT.
"""
import sqlalchemy as sa
from alembic import op

revision = "0026_cover_image_url_text"
down_revision = "0025_changelog_edited_discord"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    tables = inspector.get_table_names()

    if "tier_lists" in tables:
        with op.batch_alter_table("tier_lists") as batch:
            batch.alter_column(
                "cover_image_url",
                type_=sa.Text(),
                existing_type=sa.String(500),
                existing_nullable=True,
            )

    if "rosters" in tables:
        with op.batch_alter_table("rosters") as batch:
            batch.alter_column(
                "cover_image_url",
                type_=sa.Text(),
                existing_type=sa.String(512),
                existing_nullable=True,
            )

    if "entities" in tables:
        with op.batch_alter_table("entities") as batch:
            batch.alter_column(
                "media_url",
                type_=sa.Text(),
                existing_type=sa.String(512),
                existing_nullable=True,
            )


def downgrade() -> None:
    # Downgrade is a no-op to avoid truncating existing data URIs.
    pass
