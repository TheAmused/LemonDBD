# backend/migrations/versions/0032_user_preferences.py
"""create user_preferences table

Revision ID: 0032_user_preferences
Revises: 0031_extract_map_layouts
Create Date: 2026-10-25
"""
import sqlalchemy as sa
from alembic import op

revision = "0032_user_preferences"
down_revision = "0031_extract_map_layouts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "user_preferences" not in tables:
        op.create_table(
            "user_preferences",
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("effects_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("sounds_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("music_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("nsfw_enabled", sa.Boolean(), server_default=sa.false(), nullable=False),
            sa.Column("background_animation", sa.String(16), server_default="on", nullable=False),
            sa.Column("chosen_at", sa.BigInteger(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "user_preferences" in tables:
        op.drop_table("user_preferences")
