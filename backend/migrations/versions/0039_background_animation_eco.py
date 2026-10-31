# backend/migrations/versions/0039_background_animation_eco.py
"""new user_preferences rows start on the eco background animation (saved choices are kept)

Revision ID: 0039_background_animation_eco
Revises: 0038_user_preference_gifs
Create Date: 2026-10-31
"""
import sqlalchemy as sa
from alembic import op

revision = "0039_background_animation_eco"
down_revision = "0038_user_preference_gifs"
branch_labels = None
depends_on = None

TABLE = "user_preferences"
COLUMN = "background_animation"


def _set_default(value: str) -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return
    with op.batch_alter_table(TABLE) as batch:
        batch.alter_column(COLUMN, existing_type=sa.String(16), existing_nullable=False, server_default=value)


def upgrade() -> None:
    _set_default("eco")


def downgrade() -> None:
    _set_default("on")
