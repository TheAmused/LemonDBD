# backend/migrations/versions/0007_smash_user_preferences.py
"""smash_user_preferences: a signed-in viewer's effects and music choice for Smash or Pass

Revision ID: 0007_smash_user_preferences
Revises: 0006_entity_media_display
Create Date: 2026-10-09

One row per user: whether the page's visual and sound effects and its music are on, and when the
viewer chose (milliseconds, from their device) so a choice made signed out and one stored on the
account can be reconciled by recency when they sign in.

A database built after this change already has the table (create_all() made it), so it is only
created when it is missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0007_smash_user_preferences"
down_revision = "0006_entity_media_display"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "smash_user_preferences" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "smash_user_preferences",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("effects_enabled", sa.Boolean(), nullable=False),
        sa.Column("music_enabled", sa.Boolean(), nullable=False),
        sa.Column("chosen_at", sa.BigInteger(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    if "smash_user_preferences" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_table("smash_user_preferences")
