# backend/migrations/versions/0014_bug_report_feedback.py
"""bug_reports: drop `category`, add `feedback_unread`

Revision ID: 0014_bug_report_feedback
Revises: 0013_login_and_username
Create Date: 2026-10-14

The report form no longer asks for a category, so the column goes. `feedback_unread` flags a
report whose developer reply an admin wrote or edited and the reporter has not opened yet; it starts
false for every existing report. A database built after this change already matches (the table
came from create_all()), so each step only runs when it is still needed.
"""
import sqlalchemy as sa
from alembic import op

revision = "0014_bug_report_feedback"
down_revision = "0013_login_and_username"
branch_labels = None
depends_on = None


def _bug_report_columns() -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns("bug_reports")}


def upgrade() -> None:
    columns = _bug_report_columns()
    if "feedback_unread" not in columns:
        op.add_column(
            "bug_reports",
            sa.Column("feedback_unread", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if "category" in columns:
        with op.batch_alter_table("bug_reports") as batch:
            batch.drop_column("category")


def downgrade() -> None:
    columns = _bug_report_columns()
    if "category" not in columns:
        # The old values are gone for good; every report comes back as "General".
        op.add_column(
            "bug_reports",
            sa.Column("category", sa.String(length=50), nullable=False, server_default="General"),
        )
        with op.batch_alter_table("bug_reports") as batch:
            batch.alter_column("category", existing_type=sa.String(length=50), server_default=None)
    if "feedback_unread" in columns:
        with op.batch_alter_table("bug_reports") as batch:
            batch.drop_column("feedback_unread")
