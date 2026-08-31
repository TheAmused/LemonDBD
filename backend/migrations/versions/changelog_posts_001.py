# backend/migrations/versions/changelog_posts_001.py
"""add changelog_posts table for the What's New drawer

Revision ID: changelog_posts_001
Revises: email_verification_reset_001
Create Date: 2026-08-31 00:00:00.000000

Idempotent: guarded with sqlalchemy.inspect so that stamping at an earlier
baseline and re-running upgrade() against a database that already has this
table (e.g. one originally built by db.create_all() before Alembic history
caught up) is a safe no-op instead of an "already exists" error.
"""
from alembic import op
import sqlalchemy as sa


revision = "changelog_posts_001"
down_revision = "email_verification_reset_001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    inspector = _inspector()

    if not inspector.has_table("changelog_posts"):
        op.create_table(
            "changelog_posts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("content_html", sa.Text(), nullable=False),
            sa.Column("tag", sa.String(length=30), server_default="feature", nullable=False),
            sa.Column("is_published", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("author_id", sa.Integer(), nullable=True),
            sa.Column("author_name", sa.String(length=100), server_default="The Entity", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        )
        # Re-inspect: the table now exists, so the index-existence checks
        # below (which run unconditionally) see an empty index set instead
        # of erroring on a missing table.
        inspector = _inspector()

    indexes = {ix["name"] for ix in inspector.get_indexes("changelog_posts")}
    if "ix_changelog_posts_tag" not in indexes:
        op.create_index("ix_changelog_posts_tag", "changelog_posts", ["tag"])
    if "ix_changelog_posts_is_published" not in indexes:
        op.create_index("ix_changelog_posts_is_published", "changelog_posts", ["is_published"])
    if "ix_changelog_posts_author_id" not in indexes:
        op.create_index("ix_changelog_posts_author_id", "changelog_posts", ["author_id"])
    if "ix_changelog_posts_created_at" not in indexes:
        op.create_index("ix_changelog_posts_created_at", "changelog_posts", ["created_at"])


def downgrade():
    inspector = _inspector()
    if not inspector.has_table("changelog_posts"):
        return
    indexes = {ix["name"] for ix in inspector.get_indexes("changelog_posts")}
    if "ix_changelog_posts_created_at" in indexes:
        op.drop_index("ix_changelog_posts_created_at", table_name="changelog_posts")
    if "ix_changelog_posts_author_id" in indexes:
        op.drop_index("ix_changelog_posts_author_id", table_name="changelog_posts")
    if "ix_changelog_posts_is_published" in indexes:
        op.drop_index("ix_changelog_posts_is_published", table_name="changelog_posts")
    if "ix_changelog_posts_tag" in indexes:
        op.drop_index("ix_changelog_posts_tag", table_name="changelog_posts")
    op.drop_table("changelog_posts")
