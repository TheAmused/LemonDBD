# backend/migrations/versions/0013_login_and_username.py
"""users: the old `username` becomes the private `login`, `username` becomes the public name

Revision ID: 0013_login_and_username
Revises: 0012_google_login
Create Date: 2026-10-12

Sign-in now uses `login` (unique, never shown to other players). `username` is the name other
players see: not unique, editable. Every existing account keeps its old name as both, so nothing
changes for them until they pick a different public name. A database built after this change
already has both columns (create_all() made the table), so the step only runs when needed.
"""
import sqlalchemy as sa
from alembic import op

revision = "0013_login_and_username"
down_revision = "0012_google_login"
branch_labels = None
depends_on = None


def _user_columns() -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns("users")}


def upgrade() -> None:
    if "login" in _user_columns():
        return
    with op.batch_alter_table("users") as batch:
        batch.alter_column("username", new_column_name="login", existing_type=sa.String(length=50), existing_nullable=False)
    op.drop_index("ix_users_username", table_name="users")
    op.create_index("ix_users_login", "users", ["login"], unique=True)
    op.add_column("users", sa.Column("username", sa.String(length=50), nullable=True))
    op.execute("UPDATE users SET username = login")
    with op.batch_alter_table("users") as batch:
        batch.alter_column("username", existing_type=sa.String(length=50), nullable=False)


def downgrade() -> None:
    if "login" not in _user_columns():
        return
    with op.batch_alter_table("users") as batch:
        batch.drop_column("username")
    op.drop_index("ix_users_login", table_name="users")
    with op.batch_alter_table("users") as batch:
        batch.alter_column("login", new_column_name="username", existing_type=sa.String(length=50), existing_nullable=False)
    op.create_index("ix_users_username", "users", ["username"], unique=True)
