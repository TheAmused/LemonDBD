# backend/migrations/versions/0027_user_code_sent_at.py
"""users: remember when the last verification code and reset link were sent

Revision ID: 0027_user_code_sent_at
Revises: 0026_cover_image_url_text
Create Date: 2026-10-20

The resend cooldown used to work out the send time as `expires_at - <current lifetime>`. Once an
admin changed the lifetime in Settings, that subtraction used the new value against an expiry made
with the old one: shortening reset links from 60 to 5 minutes blocked new reset mails for most of
an hour. The send time is now stored. Rows sent before this change have none and fall back to the
old estimate. A database built after this change already has the columns (create_all() made the
table), so each step only runs when its column is still missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0027_user_code_sent_at"
down_revision = "0026_cover_image_url_text"
branch_labels = None
depends_on = None

TABLE = "users"
NEW_COLUMNS = ("verification_sent_at", "reset_sent_at")


def _columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(TABLE)}


def upgrade() -> None:
    columns = _columns()
    if not columns:
        return
    for name in NEW_COLUMNS:
        if name not in columns:
            op.add_column(TABLE, sa.Column(name, sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    columns = _columns()
    present = [name for name in NEW_COLUMNS if name in columns]
    if not present:
        return
    with op.batch_alter_table(TABLE) as batch:
        for name in present:
            batch.drop_column(name)
