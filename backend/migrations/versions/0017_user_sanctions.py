# backend/migrations/versions/0017_user_sanctions.py
"""user_sanctions + sanction_notifications, and users.suspended_until

Revision ID: 0017_user_sanctions
Revises: 0016_tier_list_nsfw
Create Date: 2026-10-15

Warnings, suspensions and bans become rows (`user_sanctions`); `users.is_active` and the new
`users.suspended_until` are copies derived from them. `sanction_notifications` is the outbox of the
emails owed for each decision. A database built after this change already has the tables
(create_all() made them), so every step only runs for what is still missing. Nothing is backfilled:
accounts that were deactivated before this change stay deactivated and are restored through
`restore_account`, which knows how to handle a flag without a sanction behind it.
"""
import sqlalchemy as sa
from alembic import op

revision = "0017_user_sanctions"
down_revision = "0016_tier_list_nsfw"
branch_labels = None
depends_on = None

CHECK_NAME = "ck_users_ban_excludes_suspension"


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _user_columns() -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns("users")}


def _user_checks() -> set[str]:
    return {check["name"] for check in sa.inspect(op.get_bind()).get_check_constraints("users")}


def upgrade() -> None:
    tables = _tables()
    if "users" not in tables:
        return

    if "suspended_until" not in _user_columns():
        op.add_column("users", sa.Column("suspended_until", sa.DateTime(timezone=True), nullable=True))
    if CHECK_NAME not in _user_checks():
        with op.batch_alter_table("users") as batch:
            batch.create_check_constraint(CHECK_NAME, "is_active OR suspended_until IS NULL")

    if "user_sanctions" not in tables:
        op.create_table(
            "user_sanctions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("kind", sa.String(16), nullable=False),
            sa.Column("reason_code", sa.String(32), nullable=False),
            sa.Column("rule_ref", sa.String(32), nullable=True),
            sa.Column("facts", sa.Text(), nullable=True),
            sa.Column("public_message", sa.Text(), nullable=True),
            sa.Column("internal_notes", sa.Text(), nullable=True),
            sa.Column("source", sa.String(24), nullable=False, server_default="manual"),
            sa.Column("report_id", sa.Integer(), sa.ForeignKey("content_reports.id", ondelete="SET NULL"), nullable=True),
            sa.Column("issued_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("revoked_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("revoke_reason", sa.Text(), nullable=True),
            sa.CheckConstraint("kind IN ('warning', 'suspension', 'ban')", name="ck_user_sanctions_kind"),
        )
        op.create_index("ix_user_sanctions_user_id", "user_sanctions", ["user_id"])
        op.create_index("idx_user_sanctions_user_issued", "user_sanctions", ["user_id", "issued_at"])

    if "sanction_notifications" not in tables:
        op.create_table(
            "sanction_notifications",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("sanction_id", sa.Integer(), sa.ForeignKey("user_sanctions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("event", sa.String(16), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("notified_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("in_flight_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_error", sa.String(500), nullable=True),
            sa.UniqueConstraint("sanction_id", "event", name="uq_sanction_notification_event"),
        )
        op.create_index("ix_sanction_notifications_sanction_id", "sanction_notifications", ["sanction_id"])
        op.create_index(
            "idx_sanction_notifications_unsent",
            "sanction_notifications",
            ["created_at"],
            postgresql_where=sa.text("notified_at IS NULL"),
            sqlite_where=sa.text("notified_at IS NULL"),
        )


def downgrade() -> None:
    tables = _tables()
    if "sanction_notifications" in tables:
        op.drop_table("sanction_notifications")
    if "user_sanctions" in tables:
        op.drop_table("user_sanctions")
    if "users" not in tables:
        return
    if CHECK_NAME in _user_checks():
        with op.batch_alter_table("users") as batch:
            batch.drop_constraint(CHECK_NAME, type_="check")
    if "suspended_until" in _user_columns():
        with op.batch_alter_table("users") as batch:
            batch.drop_column("suspended_until")
