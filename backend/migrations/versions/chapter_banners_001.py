"""add chapters table for DLC banner images

Revision ID: chapter_banners_001
Revises: onboarding_flag_001
Create Date: 2026-09-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "chapter_banners_001"
down_revision = "onboarding_flag_001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "chapters",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False, unique=True),
        sa.Column("banner_url", sa.String(length=500), nullable=True),
        sa.Column("banner_local_path", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("chapters")
