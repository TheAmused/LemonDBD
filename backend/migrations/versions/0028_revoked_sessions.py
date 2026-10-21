# backend/migrations/versions/0028_revoked_sessions.py
"""revoked_sessions: session tokens signed out before they expired

Revision ID: 0028_revoked_sessions
Revises: 0027_user_code_sent_at
Create Date: 2026-10-21

Logging out used to delete only the cookie; a copied token stayed valid until it expired. Signing
out now stores the token's random id (`jti`) here until its expiry. A database built after this
change already has the table (create_all() made it), so the step only runs when it is missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0028_revoked_sessions"
down_revision = "0027_user_code_sent_at"
branch_labels = None
depends_on = None

TABLE = "revoked_sessions"


def upgrade() -> None:
    if TABLE in set(sa.inspect(op.get_bind()).get_table_names()):
        return
    op.create_table(
        TABLE,
        sa.Column("jti", sa.String(64), primary_key=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_revoked_sessions_expires_at", TABLE, ["expires_at"])


def downgrade() -> None:
    if TABLE in set(sa.inspect(op.get_bind()).get_table_names()):
        op.drop_table(TABLE)
