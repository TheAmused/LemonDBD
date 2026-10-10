# backend/migrations/versions/0010_user_token_version.py
"""users: `token_version` so a password change can sign out every other session

Revision ID: 0010_user_token_version
Revises: 0009_perk_types
Create Date: 2026-10-10

Session tokens now carry the version of the account's credentials they were issued under
(`ver`); a password change or reset bumps `users.token_version`, which makes every older token
stop working. Existing rows start at 0, and tokens issued before this migration have no `ver`
claim, which is read as 0, so nobody is signed out by the upgrade itself.

A database built after this change already has the column (create_all() made the table), so the
step only runs when it is missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0010_user_token_version"
down_revision = "0009_perk_types"
branch_labels = None
depends_on = None


def _user_columns() -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns("users")}


def upgrade() -> None:
    if "token_version" not in _user_columns():
        op.add_column(
            "users",
            sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    if "token_version" in _user_columns():
        with op.batch_alter_table("users") as batch:
            batch.drop_column("token_version")
