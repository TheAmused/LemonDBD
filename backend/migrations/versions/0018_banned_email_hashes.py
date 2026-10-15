# backend/migrations/versions/0018_banned_email_hashes.py
"""banned_email_hashes: the ban-evasion e-mail list

Revision ID: 0018_banned_email_hashes
Revises: 0017_user_sanctions
Create Date: 2026-10-15

One keyed hash (HMAC-SHA256, 64 hex chars) per permanent ban; never the address itself. A database
built after this change already has the table (create_all() made it), so the step only runs when it
is missing. Nothing is backfilled here: existing bans are added with
`python scripts/backfill_ban_list.py` once BAN_LIST_PEPPERS is configured.
"""
import sqlalchemy as sa
from alembic import op

revision = "0018_banned_email_hashes"
down_revision = "0017_user_sanctions"
branch_labels = None
depends_on = None

TABLE = "banned_email_hashes"


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    tables = _tables()
    if TABLE in tables or "user_sanctions" not in tables:
        return
    op.create_table(
        TABLE,
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email_hmac", sa.String(64), nullable=False),
        sa.Column("key_version", sa.SmallInteger(), nullable=False),
        sa.Column("sanction_id", sa.Integer(), sa.ForeignKey("user_sanctions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reason_code", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("email_hmac", "sanction_id", name="uq_banned_email_hash_sanction"),
    )
    op.create_index("ix_banned_email_hashes_email_hmac", TABLE, ["email_hmac"])
    op.create_index("ix_banned_email_hashes_sanction_id", TABLE, ["sanction_id"])
    op.create_index("idx_banned_email_hashes_expires", TABLE, ["expires_at"])


def downgrade() -> None:
    if TABLE in _tables():
        op.drop_table(TABLE)
