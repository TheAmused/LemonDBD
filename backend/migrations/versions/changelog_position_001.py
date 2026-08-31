# backend/migrations/versions/changelog_position_001.py
"""add manual sort position to changelog_posts for admin drag-reordering

Revision ID: changelog_position_001
Revises: changelog_posts_001
Create Date: 2026-08-31 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect so that re-running this against
a database where `position` (or its index) already exists -- e.g. one that
was stamped at head before this column was added, then later re-upgraded
from an earlier baseline -- is a safe no-op instead of an "already exists"
error.
"""
from alembic import op
import sqlalchemy as sa


revision = "changelog_position_001"
down_revision = "changelog_posts_001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    inspector = _inspector()
    if not inspector.has_table("changelog_posts"):
        # changelog_posts_001 should have created this already; nothing to
        # do here if it somehow hasn't (defensive, keeps this migration
        # runnable in isolation without crashing).
        return

    columns = {c["name"] for c in inspector.get_columns("changelog_posts")}
    if "position" not in columns:
        op.add_column(
            "changelog_posts",
            sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        )

    indexes = {ix["name"] for ix in inspector.get_indexes("changelog_posts")}
    if "ix_changelog_posts_position" not in indexes:
        op.create_index("ix_changelog_posts_position", "changelog_posts", ["position"])

    # Backfill existing rows so the newest post keeps sorting first (position
    # ascending = shown first), matching the previous created_at-desc default.
    # Safe to re-run: it just re-ranks by created_at every time.
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE changelog_posts
        SET position = ranked.rn
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 AS rn
            FROM changelog_posts
        ) AS ranked
        WHERE changelog_posts.id = ranked.id
    """))


def downgrade():
    inspector = _inspector()
    indexes = {ix["name"] for ix in inspector.get_indexes("changelog_posts")}
    if "ix_changelog_posts_position" in indexes:
        op.drop_index("ix_changelog_posts_position", table_name="changelog_posts")

    columns = {c["name"] for c in inspector.get_columns("changelog_posts")}
    if "position" in columns:
        op.drop_column("changelog_posts", "position")
