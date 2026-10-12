# backend/migrations/versions/0012_google_login.py
"""users: `google_sub` for Google sign-in, and `password_hash` may now be empty

Revision ID: 0012_google_login
Revises: 0011_two_factor
Create Date: 2026-10-12

An account created through Google has no password until its owner sets one, so
`password_hash` becomes nullable. `google_sub` holds Google's stable account id; it is unique,
and NULL for every existing account. A database built after this change already has both (the
table came from create_all()), so each step only runs when it is still needed.
"""
import sqlalchemy as sa
from alembic import op

revision = "0012_google_login"
down_revision = "0011_two_factor"
branch_labels = None
depends_on = None


def _user_columns() -> dict[str, dict]:
    return {column["name"]: column for column in sa.inspect(op.get_bind()).get_columns("users")}


def upgrade() -> None:
    columns = _user_columns()
    if "google_sub" not in columns:
        op.add_column("users", sa.Column("google_sub", sa.String(length=64), nullable=True))
        op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)
    if not columns["password_hash"]["nullable"]:
        with op.batch_alter_table("users") as batch:
            batch.alter_column("password_hash", existing_type=sa.String(length=255), nullable=True)


def downgrade() -> None:
    columns = _user_columns()
    with op.batch_alter_table("users") as batch:
        if "google_sub" in columns:
            batch.drop_index("ix_users_google_sub")
            batch.drop_column("google_sub")
        # Accounts without a password get an unusable one back before the column is tightened.
        op.execute("UPDATE users SET password_hash = '!' WHERE password_hash IS NULL")
        batch.alter_column("password_hash", existing_type=sa.String(length=255), nullable=False)
