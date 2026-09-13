# backend/migrations/versions/drop_page_streak_roster_complete_index_001.py
"""drop the page-streak roster-complete unique index

Revision ID: drop_page_streak_index_001
Revises: roster_milestone_unique_001
Create Date: 2026-09-13 00:00:00.000000

Page Streak no longer writes a "roster_complete" ChallengeCompletionRecord
at all -- unlike gauntlet/chaos/history it has no bounded run to freeze a
pool against, so its mode-wide badge is computed live instead (see
app.services.page_streak.roster.get_live_roster_badge). The partial unique
index that used to guard that row against concurrent duplicates is now dead
weight.

Idempotent: guarded with sqlalchemy.inspect so a fresh database (which never
had this index, since the model no longer declares it) doesn't fail here.
"""
from alembic import op
import sqlalchemy as sa


revision = "drop_page_streak_index_001"
down_revision = "roster_milestone_unique_001"
branch_labels = None
depends_on = None


def _existing_index_names():
    return {idx["name"] for idx in sa.inspect(op.get_bind()).get_indexes("challenge_completion_records")}


def upgrade():
    if "uq_page_streak_roster_complete" in _existing_index_names():
        op.drop_index("uq_page_streak_roster_complete", table_name="challenge_completion_records")


def downgrade():
    where = "mode = 'page_streak' AND variant = 'roster_complete'"
    if "uq_page_streak_roster_complete" not in _existing_index_names():
        op.create_index(
            "uq_page_streak_roster_complete",
            "challenge_completion_records",
            ["user_id", "mode", "variant"],
            unique=True,
            postgresql_where=sa.text(where),
            sqlite_where=sa.text(where),
        )
