# backend/migrations/versions/0029_hash_reset_tokens.py
"""users.reset_token: store the SHA-256 of a password-reset token, not the token

Revision ID: 0029_hash_reset_tokens
Revises: 0028_revoked_sessions
Create Date: 2026-10-21

Reset links used to be looked up by the token itself, so anyone with a copy of the database could
reset any account that had a link outstanding. The column now holds `sha256(token)` (see
`hash_reset_token`). Links already sent keep working: their stored tokens are hashed here. A
stored value that is already a 64-character hex digest is left alone, so running this twice is safe.
"""
import hashlib
import re

import sqlalchemy as sa
from alembic import op

revision = "0029_hash_reset_tokens"
down_revision = "0028_revoked_sessions"
branch_labels = None
depends_on = None

_DIGEST = re.compile(r"[0-9a-f]{64}")


def upgrade() -> None:
    conn = op.get_bind()
    users = sa.table("users", sa.column("id", sa.Integer), sa.column("reset_token", sa.String))
    rows = conn.execute(sa.select(users.c.id, users.c.reset_token).where(users.c.reset_token.is_not(None))).all()
    for user_id, token in rows:
        if _DIGEST.fullmatch(token):
            continue
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        conn.execute(sa.update(users).where(users.c.id == user_id).values(reset_token=digest))


def downgrade() -> None:
    # A hash cannot be turned back into the token: outstanding links stop working instead.
    users = sa.table("users", sa.column("reset_token", sa.String), sa.column("reset_token_expires_at", sa.DateTime))
    op.get_bind().execute(sa.update(users).values(reset_token=None, reset_token_expires_at=None))
