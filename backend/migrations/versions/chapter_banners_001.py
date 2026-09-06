"""add chapters table for DLC banner images

Revision ID: chapter_banners_001
Revises: onboarding_flag_001
Create Date: 2026-09-06 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect so that create_app()'s
unconditional db.create_all() (which will have already created this table
via the Chapter model before this migration ever runs) doesn't cause
upgrade() to fail on a table that already exists.
"""
from alembic import op
import sqlalchemy as sa


revision = "chapter_banners_001"
down_revision = "onboarding_flag_001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    inspector = _inspector()

    if not inspector.has_table("chapters"):
        op.create_table(
            "chapters",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=150), nullable=False, unique=True),
            sa.Column("banner_url", sa.String(length=500), nullable=True),
            sa.Column("banner_local_path", sa.String(length=255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )


def downgrade():
    inspector = _inspector()
    if inspector.has_table("chapters"):
        op.drop_table("chapters")
