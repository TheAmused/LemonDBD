# backend/migrations/versions/0015_content_report_indexes.py
"""content_reports: one open report per document, plus the admin queue index

Revision ID: 0015_content_report_indexes
Revises: 0014_bug_report_feedback
Create Date: 2026-10-15

Two reporters flagging a document at the same moment could each open a pending row for it; the
partial unique index makes the second one join the first. `status, report_count` backs the admin
queue ordering. The tables themselves come from create_all(), so a database built after this change
already has both indexes and each step only runs when it is still needed.

Any duplicate pending rows that already exist are folded into the oldest one first, otherwise the
unique index could not be built.
"""
import sqlalchemy as sa
from alembic import op

revision = "0015_content_report_indexes"
down_revision = "0014_bug_report_feedback"
branch_labels = None
depends_on = None

PENDING_UNIQUE = "uq_content_reports_pending_hash"
QUEUE_INDEX = "idx_content_reports_status_count"


def _index_names() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if "content_reports" not in inspector.get_table_names():
        return set()
    return {index["name"] for index in inspector.get_indexes("content_reports")}


def _fold_duplicate_pending_reports() -> None:
    bind = op.get_bind()
    duplicates = bind.execute(
        sa.text(
            "SELECT content_hash FROM content_reports WHERE status = 'pending' "
            "GROUP BY content_hash HAVING COUNT(*) > 1"
        )
    ).fetchall()
    for (content_hash,) in duplicates:
        ids = [
            row[0]
            for row in bind.execute(
                sa.text(
                    "SELECT id FROM content_reports WHERE status = 'pending' "
                    "AND content_hash = :h ORDER BY id"
                ),
                {"h": content_hash},
            )
        ]
        keep, extras = ids[0], ids[1:]
        for extra in extras:
            # Reporters already on the kept row would violate uq_report_reporter, so skip those.
            bind.execute(
                sa.text(
                    "UPDATE content_report_subscribers SET report_id = :keep WHERE report_id = :extra "
                    "AND reporter_id NOT IN (SELECT reporter_id FROM content_report_subscribers "
                    "WHERE report_id = :keep AND reporter_id IS NOT NULL)"
                ),
                {"keep": keep, "extra": extra},
            )
            bind.execute(sa.text("DELETE FROM content_reports WHERE id = :extra"), {"extra": extra})
        total = bind.execute(
            sa.text("SELECT COUNT(*) FROM content_report_subscribers WHERE report_id = :keep"),
            {"keep": keep},
        ).scalar()
        bind.execute(
            sa.text("UPDATE content_reports SET report_count = :n WHERE id = :keep"),
            {"n": max(int(total or 0), 1), "keep": keep},
        )


def upgrade() -> None:
    names = _index_names()
    if not names and "content_reports" not in sa.inspect(op.get_bind()).get_table_names():
        return
    if PENDING_UNIQUE not in names:
        _fold_duplicate_pending_reports()
        op.create_index(
            PENDING_UNIQUE,
            "content_reports",
            ["content_hash"],
            unique=True,
            postgresql_where=sa.text("status = 'pending'"),
            sqlite_where=sa.text("status = 'pending'"),
        )
    if QUEUE_INDEX not in names:
        op.create_index(QUEUE_INDEX, "content_reports", ["status", "report_count"])


def downgrade() -> None:
    names = _index_names()
    if QUEUE_INDEX in names:
        op.drop_index(QUEUE_INDEX, table_name="content_reports")
    if PENDING_UNIQUE in names:
        op.drop_index(PENDING_UNIQUE, table_name="content_reports")
