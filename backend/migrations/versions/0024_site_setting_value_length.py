# backend/migrations/versions/0024_site_setting_value_length.py
"""site_settings.value: room for an encrypted secret

Revision ID: 0024_site_setting_value_length
Revises: 0023_sanction_drop_message
Create Date: 2026-10-17

Admin-set webhook URLs are stored encrypted (a Fernet token is roughly twice as long as the URL it
hides), which does not fit in the original 255 characters. The column grows to 1024; nothing else
changes. A database built after this change already has the wider column (create_all() made it), so
the step only widens a column that is still narrower.
"""
import sqlalchemy as sa
from alembic import op

revision = "0024_site_setting_value_length"
down_revision = "0023_sanction_drop_message"
branch_labels = None
depends_on = None

TABLE = "site_settings"
COLUMN = "value"
WIDE = 1024
NARROW = 255


def _current_length() -> int | None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return None
    for column in inspector.get_columns(TABLE):
        if column["name"] == COLUMN:
            return getattr(column["type"], "length", None)
    return None


def upgrade() -> None:
    length = _current_length()
    if length is None or length >= WIDE:
        return
    with op.batch_alter_table(TABLE) as batch:
        batch.alter_column(COLUMN, existing_type=sa.String(NARROW), type_=sa.String(WIDE), existing_nullable=False)


def downgrade() -> None:
    """Narrowing again would truncate stored secrets, so a downgrade leaves the wider column in place."""
