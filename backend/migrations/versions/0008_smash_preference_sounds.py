# backend/migrations/versions/0008_smash_preference_sounds.py
"""smash_user_preferences: sound effects get their own switch

Revision ID: 0008_smash_preference_sounds
Revises: 0007_smash_user_preferences
Create Date: 2026-10-09

The page's "Effects" choice covered visual and sound effects together; sound effects now have a
switch of their own. A row saved before this keeps its viewer's intent: its sound switch takes the
value the single effects switch had.

A database built after this change already has the column (create_all() made the table), so it is
only added when it is missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0008_smash_preference_sounds"
down_revision = "0007_smash_user_preferences"
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("smash_user_preferences")}
    if "sounds_enabled" in existing:
        return
    op.add_column(
        "smash_user_preferences",
        sa.Column("sounds_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.execute("UPDATE smash_user_preferences SET sounds_enabled = effects_enabled")


def downgrade() -> None:
    existing = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("smash_user_preferences")}
    if "sounds_enabled" in existing:
        op.drop_column("smash_user_preferences", "sounds_enabled")
